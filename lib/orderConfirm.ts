/**
 * 주문 확정/승격 공통 로직
 *
 * 가상계좌 입금 완료 (DEPOSIT_CALLBACK) 등에서 WAITING_DEPOSIT 상태의 주문을
 * PAID 로 승격할 때 재사용.
 */

import {
  CommissionSettlementStatus,
  OrderStatus,
  PaymentStatus,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type PromoteResult =
  | { ok: true; code: "PAID" }
  | { ok: true; code: "ALREADY_PAID" }
  | { ok: false; code: "ORDER_NOT_FOUND" }
  | { ok: false; code: "INVALID_STATE"; status: OrderStatus }
  | { ok: false; code: "OUT_OF_STOCK"; productId: string }
  | { ok: false; code: "INTERNAL"; message: string };

/**
 * 가상계좌 WAITING_DEPOSIT → PAID 승격.
 *  - 재고 차감
 *  - Payment.status = CONFIRMED, approvedAt 세팅
 *  - OrderCommission.status = PAYABLE
 *
 * 호출 시점에는 이미 토스에서 입금 확인된 상태이므로 결제 자체는 성공.
 * 재고 부족 시에는 환불을 별도 처리해야 함 (이 함수는 OUT_OF_STOCK 만 반환).
 */
export async function promoteVbankWaitingToPaid(
  orderId: string,
): Promise<PromoteResult> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true, payment: true },
  });

  if (!order) return { ok: false, code: "ORDER_NOT_FOUND" };
  if (order.status === OrderStatus.PAID) return { ok: true, code: "ALREADY_PAID" };
  if (order.status !== OrderStatus.WAITING_DEPOSIT) {
    return { ok: false, code: "INVALID_STATE", status: order.status };
  }

  let outOfStockProductId: string | null = null;

  try {
    await prisma.$transaction(async (tx) => {
      const fresh = await tx.order.findUniqueOrThrow({
        where: { id: orderId },
        select: { status: true },
      });
      if (fresh.status === OrderStatus.PAID) return;
      if (fresh.status !== OrderStatus.WAITING_DEPOSIT) {
        throw new Error(`INVALID_STATE:${fresh.status}`);
      }

      for (const item of order.items) {
        let targetVariantId = item.variantId;
        if (!targetVariantId) {
          const v = await tx.productVariant.findFirst({
            where: { productId: item.productId },
            select: { id: true },
          });
          if (!v) throw new Error("VARIANT_NOT_FOUND");
          targetVariantId = v.id;
        }
        const result = await tx.productVariant.updateMany({
          where: { id: targetVariantId, stock: { gte: item.quantity } },
          data: { stock: { decrement: item.quantity } },
        });
        if (result.count !== 1) {
          outOfStockProductId = item.productId;
          throw new Error("OUT_OF_STOCK");
        }
      }

      await tx.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.PAID },
      });
      if (order.payment) {
        await tx.payment.update({
          where: { id: order.payment.id },
          data: { status: PaymentStatus.CONFIRMED, approvedAt: new Date() },
        });
      }
      await tx.orderCommission.updateMany({
        where: { orderId },
        data: { status: CommissionSettlementStatus.PAYABLE },
      });
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "UNKNOWN";
    if (message === "OUT_OF_STOCK" && outOfStockProductId) {
      return { ok: false, code: "OUT_OF_STOCK", productId: outOfStockProductId };
    }
    if (message.startsWith("INVALID_STATE:")) {
      return {
        ok: false,
        code: "INVALID_STATE",
        status: message.split(":")[1] as OrderStatus,
      };
    }
    console.error("[promoteVbankWaitingToPaid] failed:", err);
    return { ok: false, code: "INTERNAL", message };
  }

  return { ok: true, code: "PAID" };
}

/**
 * 가상계좌 입금 취소(고객이 입금 후 출금/은행 반려) 또는 입금 기한 만료.
 * 주문/결제 상태 동기화.
 */
export async function markVbankCancelledOrExpired(
  orderId: string,
  reason: "CANCELED" | "EXPIRED",
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      select: { status: true },
    });
    if (!order) return;
    // 이미 PAID 면 취소 처리는 별도 흐름 (refund 등) → 여기선 스킵
    if (order.status !== OrderStatus.WAITING_DEPOSIT) return;
    await tx.order.update({
      where: { id: orderId },
      data: {
        status:
          reason === "EXPIRED" ? OrderStatus.EXPIRED : OrderStatus.CANCELLED,
      },
    });
    await tx.payment.updateMany({
      where: { orderId },
      data: {
        status:
          reason === "EXPIRED" ? PaymentStatus.FAILED : PaymentStatus.CANCELED,
      },
    });
    await tx.orderCommission.updateMany({
      where: { orderId },
      data: { status: CommissionSettlementStatus.CANCELLED },
    });
  });
}
