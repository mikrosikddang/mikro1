import { NextRequest, NextResponse } from "next/server";
import { OrderClaimStatus, OrderClaimType, OrderStatus } from "@prisma/client";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createNotification, notifyOrderStatusChange } from "@/lib/notifications";

/**
 * PATCH /api/claims/[id]
 * 셀러: 클레임을 승인/반려/완료 처리
 * - APPROVED: REQUESTED → APPROVED (셀러 검토 통과)
 * - REJECTED: REQUESTED → REJECTED (사유 필요)
 * - COMPLETED: APPROVED → COMPLETED (실제 환불/교환 완료 표시)
 *
 * 구매자: 본인 신청 건 취소 (REQUESTED 상태에서만 CANCELLED)
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  }

  const { id: claimId } = await params;
  const body = await req.json();
  const nextStatus = body.status as OrderClaimStatus;
  const sellerResponse = typeof body.sellerResponse === "string"
    ? body.sellerResponse.trim().slice(0, 1000)
    : null;

  const allowedNext: OrderClaimStatus[] = [
    OrderClaimStatus.APPROVED,
    OrderClaimStatus.REJECTED,
    OrderClaimStatus.COMPLETED,
    OrderClaimStatus.CANCELLED,
  ];
  if (!nextStatus || !allowedNext.includes(nextStatus)) {
    return NextResponse.json({ error: "처리 상태가 올바르지 않습니다" }, { status: 400 });
  }

  const claim = await prisma.orderClaim.findUnique({
    where: { id: claimId },
    include: {
      order: {
        select: {
          id: true,
          orderNo: true,
          status: true,
          buyerId: true,
          sellerId: true,
          items: {
            select: {
              quantity: true,
              variantId: true,
            },
          },
        },
      },
    },
  });

  if (!claim) {
    return NextResponse.json({ error: "신청을 찾을 수 없습니다" }, { status: 404 });
  }

  const isBuyer = claim.order.buyerId === session.userId;
  const isSeller = claim.order.sellerId === session.userId;

  if (!isBuyer && !isSeller) {
    return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 });
  }

  // 상태 전이 검증
  if (nextStatus === OrderClaimStatus.CANCELLED) {
    if (!isBuyer) {
      return NextResponse.json({ error: "구매자만 취소할 수 있습니다" }, { status: 403 });
    }
    if (claim.status !== OrderClaimStatus.REQUESTED) {
      return NextResponse.json({ error: "신청 단계에서만 취소할 수 있습니다" }, { status: 409 });
    }
  } else {
    if (!isSeller) {
      return NextResponse.json({ error: "셀러만 처리할 수 있습니다" }, { status: 403 });
    }
    if (nextStatus === OrderClaimStatus.APPROVED || nextStatus === OrderClaimStatus.REJECTED) {
      if (claim.status !== OrderClaimStatus.REQUESTED) {
        return NextResponse.json(
          { error: "신청 단계의 건만 승인/반려할 수 있습니다" },
          { status: 409 },
        );
      }
      if (nextStatus === OrderClaimStatus.REJECTED && !sellerResponse) {
        return NextResponse.json(
          { error: "반려 사유를 입력해주세요" },
          { status: 400 },
        );
      }
    }
    if (nextStatus === OrderClaimStatus.COMPLETED) {
      if (claim.status !== OrderClaimStatus.APPROVED) {
        return NextResponse.json(
          { error: "승인된 건만 처리완료로 변경할 수 있습니다" },
          { status: 409 },
        );
      }
    }
  }

  const now = new Date();
  const shouldRefundOrder =
    nextStatus === OrderClaimStatus.COMPLETED && claim.type === OrderClaimType.REFUND;

  let updated;
  try {
    updated = await prisma.$transaction(async (tx) => {
      const expectedStatus =
        nextStatus === OrderClaimStatus.COMPLETED
          ? OrderClaimStatus.APPROVED
          : OrderClaimStatus.REQUESTED;

      const updateResult = await tx.orderClaim.updateMany({
        where: { id: claimId, status: expectedStatus },
        data: {
          status: nextStatus,
          sellerResponse: sellerResponse || claim.sellerResponse,
          decidedAt:
            nextStatus === OrderClaimStatus.APPROVED || nextStatus === OrderClaimStatus.REJECTED
              ? now
              : claim.decidedAt,
          completedAt: nextStatus === OrderClaimStatus.COMPLETED ? now : claim.completedAt,
        },
      });

      if (updateResult.count === 0) {
        throw new Error("CLAIM_CONFLICT");
      }

      if (shouldRefundOrder) {
        const orderUpdate = await tx.order.updateMany({
          where: {
            id: claim.order.id,
            status: { not: OrderStatus.REFUNDED },
          },
          data: { status: OrderStatus.REFUNDED },
        });

        if (orderUpdate.count === 0) {
          return tx.orderClaim.findUniqueOrThrow({
            where: { id: claimId },
          });
        }

        for (const item of claim.order.items) {
          if (!item.variantId) continue;
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: { stock: { increment: item.quantity } },
          });
        }
      }

      const updatedClaim = await tx.orderClaim.findUniqueOrThrow({
        where: { id: claimId },
      });
      return updatedClaim;
    });
  } catch (error) {
    if (error instanceof Error && error.message === "CLAIM_CONFLICT") {
      return NextResponse.json(
        { error: "이미 처리되었거나 상태가 변경된 신청입니다" },
        { status: 409 },
      );
    }
    throw error;
  }

  // 알림
  switch (nextStatus) {
    case OrderClaimStatus.APPROVED:
      await createNotification(
        claim.order.buyerId,
        "ORDER_STATUS",
        "환불/교환 신청이 승인되었습니다",
        `주문번호 ${claim.order.orderNo} · 셀러 안내에 따라 진행해주세요.`,
        `/orders/${claim.order.id}`,
      );
      break;
    case OrderClaimStatus.REJECTED:
      await createNotification(
        claim.order.buyerId,
        "ORDER_STATUS",
        "환불/교환 신청이 반려되었습니다",
        `주문번호 ${claim.order.orderNo} · 사유: ${sellerResponse ?? "셀러 안내 참조"}`,
        `/orders/${claim.order.id}`,
      );
      break;
    case OrderClaimStatus.COMPLETED:
      await createNotification(
        claim.order.buyerId,
        "ORDER_STATUS",
        "환불/교환 처리가 완료되었습니다",
        `주문번호 ${claim.order.orderNo}`,
        `/orders/${claim.order.id}`,
      );
      break;
    case OrderClaimStatus.CANCELLED:
      await createNotification(
        claim.order.sellerId,
        "ORDER_STATUS",
        "환불/교환 신청이 취소되었습니다",
        `주문번호 ${claim.order.orderNo}`,
        `/seller/orders/${claim.order.id}`,
      );
      break;
  }

  if (shouldRefundOrder) {
    await notifyOrderStatusChange(
      claim.order.id,
      claim.order.orderNo,
      claim.order.buyerId,
      claim.order.sellerId,
      OrderStatus.REFUNDED,
    );
  }

  return NextResponse.json(updated);
}
