import { NextRequest, NextResponse } from "next/server";
import { OrderStatus, PaymentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { cancelPayment } from "@/lib/toss";

export const runtime = "nodejs";

/* ------------------------------------------------------------------ */
/*  POST /api/payments/confirm                                        */
/*                                                                    */
/*  Body: { orderId: string, paymentKey: string, amount?: number }    */
/*                                                                    */
/*  Flow:                                                             */
/*   1. Pre-flight: paymentKey conflict check (no 500).               */
/*   2. Idempotency: if order already PAID → 200 already_paid.        */
/*   3. Within $transaction:                                          */
/*      a. Verify order is PENDING.                                   */
/*      b. Atomically decrement stock (updateMany where stock≥qty).   */
/*      c. If stock fails → mark PAYMENT_FAILED, commit, then        */
/*         call Toss cancel OUTSIDE txn.                              */
/*      d. If stock ok → mark PAID + update payment CONFIRMED.        */
/*   4. Return structured JSON with ok/code for every outcome.        */
/* ------------------------------------------------------------------ */

type ConfirmBody = {
  orderId: string;
  paymentKey: string;
  amount?: number;
};

/* ---------- helpers ---------- */

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status });
}

function isPrismaUniqueError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: string }).code === "P2002"
  );
}

/* ---------- handler ---------- */

export async function POST(req: NextRequest) {
  /* ---- parse body ---- */
  let body: ConfirmBody;
  try {
    body = (await req.json()) as ConfirmBody;
  } catch {
    return json({ ok: false, code: "INVALID_JSON", message: "요청 본문이 올바르지 않습니다" }, 400);
  }

  const { orderId, paymentKey, amount } = body;

  if (!orderId || !paymentKey) {
    return json(
      { ok: false, code: "MISSING_PARAMS", message: "orderId와 paymentKey는 필수입니다" },
      400,
    );
  }

  /* ---- PART B: paymentKey conflict pre-check ---- */
  const existingPayment = await prisma.payment.findUnique({
    where: { paymentKey },
    select: { orderId: true, order: { select: { status: true } } },
  });

  if (existingPayment) {
    // Same paymentKey, different order → conflict
    if (existingPayment.orderId !== orderId) {
      return json(
        {
          ok: false,
          code: "PAYMENT_KEY_ALREADY_USED",
          message: "이미 처리된 결제입니다.",
        },
        409,
      );
    }

    // Same paymentKey, same order, already paid → idempotent success
    if (existingPayment.order.status === OrderStatus.PAID) {
      return json({ ok: true, code: "ALREADY_PAID", orderId });
    }
  }

  /* ---- Fetch order for validation ---- */
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true, payment: true },
  });

  if (!order) {
    return json({ ok: false, code: "ORDER_NOT_FOUND", message: "주문을 찾을 수 없습니다" }, 404);
  }

  // Idempotency (also covers edge case without paymentKey in payment record yet)
  if (order.status === OrderStatus.PAID) {
    return json({ ok: true, code: "ALREADY_PAID", orderId });
  }

  if (order.status !== OrderStatus.PENDING) {
    return json(
      {
        ok: false,
        code: "INVALID_ORDER_STATUS",
        message: `결제 확인이 불가능한 주문 상태입니다: ${order.status}`,
      },
      400,
    );
  }

  // Optional amount verification
  if (amount !== undefined) {
    const orderTotal = order.totalAmountKrw + order.shippingFeeKrw;
    if (orderTotal !== amount) {
      return json(
        {
          ok: false,
          code: "AMOUNT_MISMATCH",
          message: `결제 금액 불일치: expected ${orderTotal}, got ${amount}`,
        },
        400,
      );
    }
  }

  /* ---- PART C: transaction — stock deduction + status update ---- */
  let stockFailed = false;
  let failedProductId: string | null = null;

  try {
    await prisma.$transaction(async (tx) => {
      // Re-check status inside txn (guard against race)
      const freshOrder = await tx.order.findUniqueOrThrow({
        where: { id: orderId },
        select: { status: true },
      });

      if (freshOrder.status === OrderStatus.PAID) {
        // Another request confirmed between our check and txn start
        return; // will be handled as success below
      }

      if (freshOrder.status !== OrderStatus.PENDING) {
        throw new Error("INVALID_ORDER_STATUS");
      }

      // Atomically decrement stock for each item
      for (const item of order.items) {
        const variantId = item.variantId;

        // Resolve variant (fallback to first variant if not linked)
        let targetVariantId = variantId;
        if (!targetVariantId) {
          const defaultVariant = await tx.productVariant.findFirst({
            where: { productId: item.productId },
            select: { id: true },
          });
          if (!defaultVariant) {
            throw new Error("VARIANT_NOT_FOUND");
          }
          targetVariantId = defaultVariant.id;
        }

        const result = await tx.productVariant.updateMany({
          where: {
            id: targetVariantId,
            stock: { gte: item.quantity },
          },
          data: {
            stock: { decrement: item.quantity },
          },
        });

        if (result.count !== 1) {
          // Stock insufficient — mark order as FAILED
          failedProductId = item.productId;
          stockFailed = true;

          await tx.order.update({
            where: { id: orderId },
            data: { status: OrderStatus.FAILED },
          });

          if (order.payment) {
            await tx.payment.update({
              where: { id: order.payment.id },
              data: {
                status: PaymentStatus.FAILED,
                paymentKey,
                rawResponse: { failureReason: "OUT_OF_STOCK", productId: item.productId },
              },
            });
          }

          // Commit the failure state (do NOT throw — we want this committed)
          return;
        }
      }

      // If we got here without stockFailed, everything is good
      if (!stockFailed) {
        // Mark order PAID
        await tx.order.update({
          where: { id: orderId },
          data: { status: OrderStatus.PAID },
        });

        // Update payment record
        if (order.payment) {
          await tx.payment.update({
            where: { id: order.payment.id },
            data: {
              status: PaymentStatus.CONFIRMED,
              paymentKey,
              approvedAt: new Date(),
            },
          });
        }
      }
    });
  } catch (err) {
    // Handle Prisma unique constraint (paymentKey race condition)
    if (isPrismaUniqueError(err)) {
      return json(
        {
          ok: false,
          code: "PAYMENT_KEY_ALREADY_USED",
          message: "이미 처리된 결제입니다.",
        },
        409,
      );
    }

    const message = err instanceof Error ? err.message : "UNKNOWN";

    if (message === "VARIANT_NOT_FOUND") {
      return json(
        { ok: false, code: "VARIANT_NOT_FOUND", message: "상품 옵션을 찾을 수 없습니다" },
        400,
      );
    }

    if (message === "INVALID_ORDER_STATUS") {
      return json(
        { ok: false, code: "INVALID_ORDER_STATUS", message: "결제 확인이 불가능한 주문 상태입니다" },
        400,
      );
    }

    console.error("[payments/confirm] unexpected error:", err);
    return json(
      { ok: false, code: "INTERNAL_ERROR", message: "결제 확인에 실패했습니다" },
      500,
    );
  }

  /* ---- Post-transaction: handle stock failure → Toss cancel ---- */
  if (stockFailed) {
    // Call Toss cancel API OUTSIDE transaction
    const cancelResult = await cancelPayment(
      paymentKey,
      "재고 부족으로 자동 취소",
    );

    console.warn(
      `[payments/confirm] OUT_OF_STOCK for order ${orderId}, product ${failedProductId}. Toss cancel:`,
      cancelResult,
    );

    return json(
      {
        ok: false,
        code: "OUT_OF_STOCK_CANCELLED",
        message: "재고가 부족하여 결제가 자동 취소되었습니다",
        productId: failedProductId,
        tossCancel: cancelResult.ok ? "success" : "failed",
      },
      409,
    );
  }

  /* ---- Re-check final state (covers edge case where txn returned early due to PAID race) ---- */
  const finalOrder = await prisma.order.findUnique({
    where: { id: orderId },
    select: { status: true },
  });

  if (finalOrder?.status === OrderStatus.PAID) {
    return json({ ok: true, code: "CONFIRMED", orderId });
  }

  // Should not reach here normally
  return json({ ok: true, code: "ALREADY_PAID", orderId });
}
