import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { requireAdmin } from "@/lib/roleGuards";
import { createAdminActionLog } from "@/lib/adminActionLog";
import {
  requestTossPayout,
  mapTossPayoutStatus,
} from "@/lib/tossPayouts";

export const runtime = "nodejs";

/**
 * GET /api/admin/payouts
 * 수익자(beneficiary)별 지급 대상(PAYABLE) OrderCommission 합계 목록 + 기존 Payout 내역.
 */
export async function GET() {
  try {
    requireAdmin(await getSession());
  } catch (e) {
    if (e instanceof NextResponse) return e;
    throw e;
  }

  // 수익자별 집계 (PAYABLE + payoutId IS NULL)
  const payableRows = await prisma.orderCommission.groupBy({
    by: ["beneficiaryUserId"],
    where: {
      status: "PAYABLE",
      payoutId: null,
      beneficiaryUserId: { not: null },
    },
    _sum: { commissionAmountKrw: true },
    _count: { _all: true },
  });

  const userIds = payableRows
    .map((r) => r.beneficiaryUserId)
    .filter((id): id is string => Boolean(id));

  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: {
      id: true,
      name: true,
      email: true,
      sellerProfile: {
        select: {
          id: true,
          shopName: true,
          tossSellerId: true,
          tossSellerStatus: true,
          settlementBank: true,
          settlementAccountNo: true,
          settlementAccountHolder: true,
        },
      },
    },
  });

  const userMap = new Map(users.map((u) => [u.id, u]));

  const payableByUser = payableRows.map((r) => ({
    beneficiaryUserId: r.beneficiaryUserId,
    totalAmountKrw: r._sum.commissionAmountKrw ?? 0,
    commissionCount: r._count._all,
    user: userMap.get(r.beneficiaryUserId!) ?? null,
  }));

  const recentPayouts = await prisma.payout.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      beneficiaryUser: {
        select: {
          id: true,
          name: true,
          sellerProfile: { select: { shopName: true, tossSellerId: true } },
        },
      },
      _count: { select: { commissions: true } },
    },
  });

  return NextResponse.json({ payableByUser, recentPayouts });
}

type CreatePayoutBody = {
  beneficiaryUserId: string;
  scheduleType?: "SCHEDULED" | "EXPRESS"; // 기본 SCHEDULED
  description?: string;
};

/**
 * POST /api/admin/payouts
 * 특정 수익자의 PAYABLE 수수료를 전부 합산해 토스 지급대행 요청.
 */
export async function POST(req: NextRequest) {
  let session;
  try {
    session = requireAdmin(await getSession());
  } catch (e) {
    if (e instanceof NextResponse) return e;
    throw e;
  }
  const body = (await req.json().catch(() => ({}))) as CreatePayoutBody;

  if (!body.beneficiaryUserId) {
    return NextResponse.json({ error: "beneficiaryUserId required" }, { status: 400 });
  }
  const scheduleType = body.scheduleType ?? "SCHEDULED";

  // 수익자 조회 + tossSellerId 확인
  const user = await prisma.user.findUnique({
    where: { id: body.beneficiaryUserId },
    include: { sellerProfile: true },
  });
  if (!user) {
    return NextResponse.json({ error: "USER_NOT_FOUND" }, { status: 404 });
  }
  const tossSellerId = user.sellerProfile?.tossSellerId ?? null;
  if (!tossSellerId) {
    return NextResponse.json(
      {
        error: "TOSS_SELLER_NOT_REGISTERED",
        message:
          "지급대행 셀러 등록이 필요합니다. 판매자 관리 화면에서 '토스 셀러 등록'을 먼저 진행해주세요.",
      },
      { status: 400 },
    );
  }

  // 대상 커미션 스냅샷 + Payout 생성 + 링크 (한 트랜잭션)
  const { payout, totalAmount } = await prisma.$transaction(async (tx) => {
    const commissions = await tx.orderCommission.findMany({
      where: {
        beneficiaryUserId: body.beneficiaryUserId,
        status: "PAYABLE",
        payoutId: null,
      },
      select: { id: true, commissionAmountKrw: true },
    });
    if (commissions.length === 0) {
      throw new Error("NO_PAYABLE");
    }
    const totalAmount = commissions.reduce(
      (sum, c) => sum + c.commissionAmountKrw,
      0,
    );
    if (totalAmount <= 0) throw new Error("INVALID_AMOUNT");

    const newPayout = await tx.payout.create({
      data: {
        beneficiaryUserId: body.beneficiaryUserId,
        amountKrw: totalAmount,
        status: "REQUESTED",
      },
    });

    await tx.orderCommission.updateMany({
      where: { id: { in: commissions.map((c) => c.id) } },
      data: { payoutId: newPayout.id },
    });

    return { payout: newPayout, totalAmount };
  }).catch((err) => {
    if (err instanceof Error && err.message === "NO_PAYABLE") {
      throw new Response(JSON.stringify({ error: "NO_PAYABLE" }), { status: 400 });
    }
    throw err;
  });

  // 토스 지급 요청
  try {
    const tossRes = await requestTossPayout({
      refPayoutId: payout.id,
      destination: tossSellerId,
      scheduleType,
      amount: { currency: "KRW", value: totalAmount },
      transactionDescription:
        body.description ?? `미크로 정산 ${new Date().toISOString().slice(0, 10)}`,
      metadata: {
        mikroPayoutId: payout.id,
        beneficiaryUserId: body.beneficiaryUserId,
      },
    });

    await prisma.payout.update({
      where: { id: payout.id },
      data: {
        tossPayoutId: tossRes.id,
        status: mapTossPayoutStatus(tossRes.status),
        scheduledAt: tossRes.scheduledAt ? new Date(tossRes.scheduledAt) : null,
        metadata: JSON.parse(JSON.stringify(tossRes)),
      },
    });

    await createAdminActionLog(prisma, {
      adminId: session.userId,
      entityType: "PAYOUT",
      entityId: payout.id,
      action: "PAYOUT_REQUESTED",
      summary: `지급대행 요청 (${totalAmount.toLocaleString()}원)`,
      afterJson: {
        tossPayoutId: tossRes.id,
        totalAmountKrw: totalAmount,
        status: tossRes.status,
      },
    });

    return NextResponse.json({ ok: true, payout: { ...payout, tossPayoutId: tossRes.id } });
  } catch (err) {
    // 토스 요청 실패 → Payout 을 FAILED 로 마킹하고 커미션 복구
    const message = err instanceof Error ? err.message : "UNKNOWN";
    await prisma.$transaction(async (tx) => {
      await tx.payout.update({
        where: { id: payout.id },
        data: { status: "FAILED", failureReason: message },
      });
      await tx.orderCommission.updateMany({
        where: { payoutId: payout.id },
        data: { payoutId: null },
      });
    });
    console.error("[admin/payouts] Toss request failed:", message);
    return NextResponse.json(
      {
        error: "TOSS_PAYOUT_REQUEST_FAILED",
        message:
          "토스 지급대행 요청에 실패했습니다. 지급대행 계약 상태와 셀러 KYC 승인 여부를 확인해주세요.",
        detail: message,
      },
      { status: 502 },
    );
  }
}
