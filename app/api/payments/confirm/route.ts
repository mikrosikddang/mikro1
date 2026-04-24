import { NextRequest, NextResponse } from "next/server";
import {
  CommissionSettlementStatus,
  OrderStatus,
  PaymentStatus,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { cancelPayment } from "@/lib/toss";
import { notifyOrderStatusChange } from "@/lib/notifications";
import { getTossMode } from "@/lib/tossConfig";

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
  method?: string;
  virtualAccount?: {
    bank: string | null;
    bankCode: string | null;
    accountNumber: string | null;
    customerName: string | null;
    dueDate: string | null;
    secret: string | null;
  } | null;
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

  const { orderId, paymentKey, amount, method, virtualAccount } = body;
  const isVirtualAccount = Boolean(virtualAccount?.accountNumber);

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

  // 가상계좌 입금 대기 상태에서 동일 paymentKey 로 재호출 → idempotent 성공
  if (
    order.status === OrderStatus.WAITING_DEPOSIT &&
    isVirtualAccount &&
    order.payment?.paymentKey === paymentKey
  ) {
    return json({ ok: true, code: "ALREADY_WAITING_DEPOSIT", orderId });
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
    if (order.totalPayKrw !== amount) {
      return json(
        {
          ok: false,
          code: "AMOUNT_MISMATCH",
          message: `결제 금액 불일치: expected ${order.totalPayKrw}, got ${amount}`,
        },
        400,
      );
    }
  }

  // 결제 시점 모드 고정 (차후 취소/환불 시 이 모드의 Secret Key 로 요청)
  const tossMode = await getTossMode();

  /* ---- 가상계좌 분기: 입금 대기 상태로만 기록, 재고 차감 X, PAID 승격 X ---- */
  if (isVirtualAccount && virtualAccount) {
    const dueDate = virtualAccount.dueDate
      ? new Date(virtualAccount.dueDate)
      : null;
    try {
      await prisma.$transaction(async (tx) => {
        await tx.order.update({
          where: { id: orderId },
          data: { status: OrderStatus.WAITING_DEPOSIT },
        });
        const baseData = {
          paymentKey,
          status: PaymentStatus.READY,
          method: method ?? "가상계좌",
          mode: tossMode,
          vbankBank: virtualAccount.bank,
          vbankCode: virtualAccount.bankCode,
          vbankNumber: virtualAccount.accountNumber,
          vbankHolder: virtualAccount.customerName,
          vbankDueDate: dueDate,
          vbankSecret: virtualAccount.secret,
        };
        if (order.payment) {
          await tx.payment.update({
            where: { id: order.payment.id },
            data: baseData,
          });
        } else {
          await tx.payment.create({
            data: {
              ...baseData,
              orderId,
              amountKrw: order.totalPayKrw,
            },
          });
        }
      });
    } catch (err) {
      if (isPrismaUniqueError(err)) {
        return json(
          { ok: false, code: "PAYMENT_KEY_ALREADY_USED", message: "이미 처리된 결제입니다." },
          409,
        );
      }
      console.error("[payments/confirm] vbank txn failed:", err);
      return json(
        { ok: false, code: "INTERNAL_ERROR", message: "가상계좌 발급 정보를 저장하지 못했습니다" },
        500,
      );
    }
    return json({ ok: true, code: "WAITING_DEPOSIT", orderId });
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
                mode: tossMode,
                rawResponse: { failureReason: "OUT_OF_STOCK", productId: item.productId },
              },
            });
          } else {
            await tx.payment.create({
              data: {
                orderId,
                status: PaymentStatus.FAILED,
                amountKrw: order.totalPayKrw,
                paymentKey,
                mode: tossMode,
                rawResponse: { failureReason: "OUT_OF_STOCK", productId: item.productId },
              },
            });
          }

          await tx.orderCommission.updateMany({
            where: { orderId },
            data: { status: CommissionSettlementStatus.CANCELLED },
          });

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

        // Update or create payment record
        if (order.payment) {
          await tx.payment.update({
            where: { id: order.payment.id },
            data: {
              status: PaymentStatus.CONFIRMED,
              paymentKey,
              mode: tossMode,
              approvedAt: new Date(),
            },
          });
        } else {
          await tx.payment.create({
            data: {
              orderId,
              status: PaymentStatus.CONFIRMED,
              amountKrw: order.totalPayKrw,
              paymentKey,
              mode: tossMode,
              approvedAt: new Date(),
            },
          });
        }

        await tx.orderCommission.updateMany({
          where: { orderId },
          data: {
            status: CommissionSettlementStatus.PAYABLE,
          },
        });
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
    // 알림톡은 반드시 await — Lambda(serverless)에서 fire-and-forget은 응답 후 process가 frozen되면서
    // BizM HTTP 호출이 중간에 끊김. 외부 알림 도달 보장을 위해 응답 전에 완료 대기.
    await notifyOrderStatusChange(
      order.id,
      order.orderNo,
      order.buyerId,
      order.sellerId,
      "PAID",
    );
    return json({ ok: true, code: "CONFIRMED", orderId });
  }

  // Should not reach here normally
  return json({ ok: true, code: "ALREADY_PAID", orderId });
}
