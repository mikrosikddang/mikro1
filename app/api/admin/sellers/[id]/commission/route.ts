import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { requireAdmin } from "@/lib/roleGuards";
import { createAdminActionLog } from "@/lib/adminActionLog";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const session = requireAdmin(await getSession());

    const { id } = await context.params;
    const body = (await request.json()) as { commissionRateBps?: number };
    const commissionRateBps = Number(body.commissionRateBps);

    if (
      !Number.isFinite(commissionRateBps) ||
      commissionRateBps < 0 ||
      commissionRateBps > 10000
    ) {
      return NextResponse.json(
        { error: "수수료율은 0~10000bps 범위여야 합니다" },
        { status: 400 },
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      const seller = await tx.sellerProfile.findUnique({
        where: { id },
        select: {
          id: true,
          commissionRateBps: true,
        },
      });

      if (!seller) {
        throw new Error("SELLER_NOT_FOUND");
      }

      const nextCommissionRateBps = Math.floor(commissionRateBps);

      const updatedSeller = await tx.sellerProfile.update({
        where: { id },
        data: {
          commissionRateBps: nextCommissionRateBps,
        },
        select: {
          id: true,
          commissionRateBps: true,
        },
      });

      await createAdminActionLog(tx, {
        adminId: session.userId,
        entityType: "SELLER",
        entityId: seller.id,
        action: "SELLER_COMMISSION_UPDATED",
        summary: "판매자 기본 수수료율을 변경했습니다.",
        beforeJson: {
          commissionRateBps: seller.commissionRateBps,
        },
        afterJson: {
          commissionRateBps: nextCommissionRateBps,
        },
      });

      return updatedSeller;
    });

    return NextResponse.json({ ok: true, seller: updated });
  } catch (error: any) {
    if (error instanceof NextResponse) {
      return error;
    }
    console.error("PATCH /api/admin/sellers/[id]/commission error:", error);
    if (error.message === "SELLER_NOT_FOUND" || error.code === "P2025") {
      return NextResponse.json(
        { error: "판매자 프로필을 찾을 수 없습니다" },
        { status: 404 },
      );
    }
    return NextResponse.json(
      { error: "수수료율 변경에 실패했습니다" },
      { status: 500 },
    );
  }
}
