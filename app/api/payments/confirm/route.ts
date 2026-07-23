import { NextRequest, NextResponse } from "next/server";
import {
  CommissionSettlementStatus,
  OrderStatus,
  PaymentStatus,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { cancelPayment, getPayment } from "@/lib/toss";
import { notifyOrderStatusChange } from "@/lib/notifications";
import { getTossMode, type TossMode } from "@/lib/tossConfig";

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

// Mask a paymentKey for logging (never log the full key).
function maskKey(key: string): string {
  if (key.length <= 8) return "****";
  return `${key.slice(0, 4)}…${key.slice(-4)}`;
}

function clientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

/**
 * Record a payment-verification failure (forgery/tampering attempt).
 * - console.error with a [SECURITY] tag (no secrets, no stack).
 * - Payment row (status=FAILED) with reason detail, ONLY when the order has no
 *   settled payment yet — never overwrites a legitimate CONFIRMED/READY record.
 */
async function recordVerificationFailure(params: {
  req: NextRequest;
  orderId: string;
  reason: string;
  providedPaymentKey: string;
  providedAmount?: number;
  tossAmount?: number;
  tossStatus?: string;
  existingPaymentId?: string | null;
  existingPaymentStatus?: PaymentStatus | null;
  amountKrw: number;
  tossMode: TossMode;
}) {
  const ip = clientIp(params.req);
  const ua = params.req.headers.get("user-agent") ?? "unknown";
  console.error(
    "[SECURITY][payment-forgery-attempt]",
    JSON.stringify({
      orderId: params.orderId,
      reason: params.reason,
      paymentKey: maskKey(params.providedPaymentKey),
      providedAmount: params.providedAmount,
      tossAmount: params.tossAmount,
      tossStatus: params.tossStatus,
      ip,
    }),
  );

  // Don't clobber a legitimate payment record.
  if (
    params.existingPaymentStatus === PaymentStatus.CONFIRMED ||
    params.existingPaymentStatus === PaymentStatus.DONE ||
    params.existingPaymentStatus === PaymentStatus.READY
  ) {
    return;
  }

  const rawResponse = {
    failureReason: params.reason,
    providedPaymentKey: maskKey(params.providedPaymentKey),
    providedAmount: params.providedAmount ?? null,
    tossAmount: params.tossAmount ?? null,
    tossStatus: params.tossStatus ?? null,
    ip,
    ua,
    at: new Date().toISOString(),
  };

  try {
    if (params.existingPaymentId) {
      await prisma.payment.update({
        where: { id: params.existingPaymentId },
        data: { status: PaymentStatus.FAILED, mode: params.tossMode, rawResponse },
      });
    } else {
      await prisma.payment.create({
        data: {
          orderId: params.orderId,
          status: PaymentStatus.FAILED,
          amountKrw: params.amountKrw,
          mode: params.tossMode,
          rawResponse,
          // NOTE: do not set paymentKey here — the provided key is untrusted/forged
          // and paymentKey is @unique; storing it could block a later legit payment.
        },
      });
    }
  } catch (err) {
    // Logging failure must never break the request path.
    console.error("[SECURITY][payment-forgery-attempt] failed to persist:", err instanceof Error ? err.message : "unknown");
  }
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

  // 결제 시점 모드 고정 (차후 취소/환불 시 이 모드의 Secret Key 로 요청)
  const tossMode = await getTossMode();

  /* ---- S2S VERIFICATION: 실제 토스 결제와 대조 (DB 변경 전 필수) ----
   * 공개 엔드포인트라 클라가 준 paymentKey/amount 를 신뢰할 수 없다.
   * 토스에 직접 조회하여 (1)실존 (2)승인상태 (3)orderId/checkoutAttempt 바인딩
   * (4)금액 상한 을 검증. 하나라도 실패 시 PAID 승격 금지 + 공격 기록 + 4xx.
   * 금액은 쿠폰 할인액이 서버에 영속화되지 않아 정확 등호 대신 상한 비교
   * (정확 등호는 쿠폰 영속화 후 별건). 정상 결제 회귀 0 최우선. */
  const lookup = await getPayment(paymentKey);

  if (!lookup.ok) {
    if (lookup.kind === "unavailable") {
      // 토스 장애/네트워크 — 공격이 아니므로 기록하지 않고 안전측 보류(PAID 금지).
      console.warn("[payments/confirm] Toss lookup unavailable:", lookup.code);
      return json(
        {
          ok: false,
          code: "PAYMENT_VERIFY_UNAVAILABLE",
          message: "결제 확인 서비스를 일시적으로 사용할 수 없습니다. 잠시 후 다시 시도해주세요.",
        },
        502,
      );
    }
    // not_found — 실존하지 않는 결제 = 위조 시도
    await recordVerificationFailure({
      req,
      orderId,
      reason: "PAYMENT_NOT_FOUND_ON_TOSS",
      providedPaymentKey: paymentKey,
      providedAmount: amount,
      existingPaymentId: order.payment?.id ?? null,
      existingPaymentStatus: order.payment?.status ?? null,
      amountKrw: order.totalPayKrw,
      tossMode,
    });
    return json(
      { ok: false, code: "PAYMENT_VERIFICATION_FAILED", message: "결제 검증에 실패했습니다." },
      402,
    );
  }

  const tossPayment = lookup.payment;

  // (2) 승인 상태: 카드/간편 = DONE, 가상계좌 = WAITING_FOR_DEPOSIT
  const approvedStatuses = new Set(["DONE", "WAITING_FOR_DEPOSIT"]);
  // (3) orderId 바인딩: 토스 결제의 orderId 는 우리가 보낸 ids[0] (checkout 그룹의 대표 주문).
  //     그 대표 주문과 이번 confirm 대상 order 가 동일 checkoutAttemptId 그룹인지 확인.
  const anchorOrder = await prisma.order.findUnique({
    where: { id: tossPayment.orderId },
    select: { checkoutAttemptId: true },
  });
  const sameGroup =
    !!anchorOrder &&
    !!order.checkoutAttemptId &&
    anchorOrder.checkoutAttemptId === order.checkoutAttemptId;

  // (4) 금액 상한: 토스 청구액 <= 이 checkout 그룹 주문들의 정당 총액 합.
  //     (쿠폰 할인으로 실제 청구액이 더 작을 수 있으므로 상한 비교. 부풀린 위조는 차단.)
  let groupTotal = order.totalPayKrw;
  if (order.checkoutAttemptId) {
    const agg = await prisma.order.aggregate({
      where: { checkoutAttemptId: order.checkoutAttemptId },
      _sum: { totalPayKrw: true },
    });
    groupTotal = agg._sum.totalPayKrw ?? order.totalPayKrw;
  }
  const tossAmount = tossPayment.totalAmount ?? 0;

  const statusOk = approvedStatuses.has(tossPayment.status);
  const amountOk = tossAmount <= groupTotal;

  if (!statusOk || !sameGroup || !amountOk) {
    const reason = !statusOk
      ? `TOSS_STATUS_NOT_APPROVED:${tossPayment.status}`
      : !sameGroup
        ? "ORDER_BINDING_MISMATCH"
        : "AMOUNT_EXCEEDS_ORDER_TOTAL";
    await recordVerificationFailure({
      req,
      orderId,
      reason,
      providedPaymentKey: paymentKey,
      providedAmount: amount,
      tossAmount: tossPayment.totalAmount,
      tossStatus: tossPayment.status,
      existingPaymentId: order.payment?.id ?? null,
      existingPaymentStatus: order.payment?.status ?? null,
      amountKrw: order.totalPayKrw,
      tossMode,
    });
    return json(
      { ok: false, code: "PAYMENT_VERIFICATION_FAILED", message: "결제 검증에 실패했습니다." },
      402,
    );
  }

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
