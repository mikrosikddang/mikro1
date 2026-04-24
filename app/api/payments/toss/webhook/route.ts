import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { OrderStatus, PaymentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCanonicalOrigin } from "@/lib/siteUrl";
import { getTossSecretKey } from "@/lib/tossConfig";
import { notifyOrderStatusChange } from "@/lib/notifications";
import {
  promoteVbankWaitingToPaid,
  markVbankCancelledOrExpired,
} from "@/lib/orderConfirm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/payments/toss/webhook
 *
 * Toss Payments webhook receiver.
 *
 * 역할:
 *   - 사용자가 브라우저를 닫아서 success 콜백이 도달하지 못한 경우,
 *     Toss 서버가 일정 주기로 이 엔드포인트를 호출해 최종 결제 상태를 알림.
 *   - 우리는 webhook 본문의 값을 그대로 신뢰하지 않고, Toss API 로 재조회해서
 *     실제 상태를 확인한 뒤 DB 를 업데이트한다.
 *
 * 서명 검증:
 *   - 헤더 `Toss-Signature` 가 있고 `TOSS_WEBHOOK_SECRET` 환경변수가 설정돼 있으면 HMAC 검증.
 *   - 없어도 재조회로 무결성을 보장하므로 소프트 실패.
 */

type TossWebhookBody = {
  eventType?: string;
  createdAt?: string;
  data?: {
    paymentKey?: string;
    orderId?: string;
    status?: string;
  };
  // DEPOSIT_CALLBACK 본문은 data 객체로 감싸지 않고 루트에 그대로 옴
  paymentKey?: string;
  orderId?: string;
  status?: string;
  secret?: string;
  transactionKey?: string;
};

type TossPayment = {
  paymentKey: string;
  orderId: string;
  status: string;
  totalAmount?: number;
  approvedAt?: string | null;
  cancels?: Array<{ cancelAmount: number; cancelReason?: string }>;
};

function verifySignature(rawBody: string, signatureHeader: string | null): boolean {
  const secret = (process.env.TOSS_WEBHOOK_SECRET ?? "").trim();
  if (!secret) return true;
  if (!signatureHeader) return false;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("base64");
  try {
    const a = Buffer.from(expected);
    const b = Buffer.from(signatureHeader);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

async function fetchTossPayment(paymentKey: string): Promise<TossPayment | null> {
  const secretKey = await getTossSecretKey();
  if (!secretKey) return null;
  const encoded = Buffer.from(`${secretKey}:`).toString("base64");
  const res = await fetch(
    `https://api.tosspayments.com/v1/payments/${encodeURIComponent(paymentKey)}`,
    {
      method: "GET",
      headers: { Authorization: `Basic ${encoded}` },
    },
  );
  if (!res.ok) {
    console.error("[toss/webhook] payment lookup failed", {
      paymentKey,
      status: res.status,
      body: (await res.text()).slice(0, 300),
    });
    return null;
  }
  return (await res.json()) as TossPayment;
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("toss-signature");

  if (!verifySignature(rawBody, signature)) {
    console.warn("[toss/webhook] signature verification failed");
    return NextResponse.json({ ok: false, code: "INVALID_SIGNATURE" }, { status: 401 });
  }

  let body: TossWebhookBody;
  try {
    body = JSON.parse(rawBody) as TossWebhookBody;
  } catch {
    return NextResponse.json({ ok: false, code: "INVALID_JSON" }, { status: 400 });
  }

  const { eventType, data } = body;
  const paymentKey = data?.paymentKey ?? body.paymentKey;
  const orderId = data?.orderId ?? body.orderId;

  console.log("[toss/webhook] received", { eventType, orderId, paymentKey });

  /* ---- DEPOSIT_CALLBACK: 가상계좌 입금/입금취소 ---- */
  if (eventType === "DEPOSIT_CALLBACK") {
    const status = body.status; // "DONE" or "CANCELED"
    const secret = body.secret;
    if (!paymentKey || !orderId || !secret || !status) {
      console.warn("[toss/webhook] DEPOSIT_CALLBACK missing fields", body);
      return NextResponse.json({ ok: true, code: "IGNORED" });
    }

    const payment = await prisma.payment.findUnique({
      where: { paymentKey },
      select: { vbankSecret: true, orderId: true },
    });
    if (!payment) {
      console.warn("[toss/webhook] DEPOSIT_CALLBACK payment not found", { paymentKey });
      return NextResponse.json({ ok: true, code: "PAYMENT_NOT_FOUND" });
    }
    if (payment.orderId !== orderId) {
      console.warn("[toss/webhook] DEPOSIT_CALLBACK orderId mismatch", {
        paymentKey,
        webhook: orderId,
        db: payment.orderId,
      });
      return NextResponse.json({ ok: false, code: "ORDER_MISMATCH" }, { status: 400 });
    }
    if (payment.vbankSecret !== secret) {
      console.warn("[toss/webhook] DEPOSIT_CALLBACK secret mismatch", {
        paymentKey,
      });
      return NextResponse.json({ ok: false, code: "SECRET_MISMATCH" }, { status: 401 });
    }

    if (status === "DONE") {
      const result = await promoteVbankWaitingToPaid(orderId);
      if (result.ok && result.code === "PAID") {
        const order = await prisma.order.findUnique({
          where: { id: orderId },
          select: { id: true, orderNo: true, buyerId: true, sellerId: true },
        });
        if (order) {
          await notifyOrderStatusChange(
            order.id,
            order.orderNo,
            order.buyerId,
            order.sellerId,
            "PAID",
          );
        }
        return NextResponse.json({ ok: true, code: "PAID" });
      }
      console.error("[toss/webhook] vbank promote failed", { orderId, result });
      return NextResponse.json({ ok: true, code: "PROMOTE_FAILED", result });
    }

    if (status === "CANCELED") {
      await markVbankCancelledOrExpired(orderId, "CANCELED");
      // 알림톡: 결제 취소 — 기존 CANCELLED 알림 활용
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        select: { id: true, orderNo: true, buyerId: true, sellerId: true },
      });
      if (order) {
        await notifyOrderStatusChange(
          order.id,
          order.orderNo,
          order.buyerId,
          order.sellerId,
          "CANCELLED",
        );
      }
      return NextResponse.json({ ok: true, code: "DEPOSIT_CANCELED" });
    }

    return NextResponse.json({ ok: true, code: "UNHANDLED_DEPOSIT_STATUS" });
  }

  if (!paymentKey || !orderId) {
    // 받긴 했으니 200 리턴 (Toss 재시도 방지), 내부 로그만 경고
    console.warn("[toss/webhook] missing paymentKey or orderId", body);
    return NextResponse.json({ ok: true, code: "IGNORED" });
  }

  const truth = await fetchTossPayment(paymentKey);
  if (!truth) {
    return NextResponse.json({ ok: false, code: "LOOKUP_FAILED" }, { status: 502 });
  }

  if (truth.orderId !== orderId) {
    console.warn("[toss/webhook] orderId mismatch between webhook and API", {
      webhookOrderId: orderId,
      apiOrderId: truth.orderId,
    });
  }

  const order = await prisma.order.findUnique({
    where: { id: truth.orderId },
    select: {
      id: true,
      orderNo: true,
      buyerId: true,
      sellerId: true,
      totalPayKrw: true,
      status: true,
      payment: { select: { paymentKey: true, status: true } },
    },
  });

  if (!order) {
    console.warn("[toss/webhook] order not found", { orderId: truth.orderId });
    return NextResponse.json({ ok: true, code: "ORDER_NOT_FOUND" });
  }

  switch (truth.status) {
    case "DONE": {
      if (order.status === OrderStatus.PAID) {
        return NextResponse.json({ ok: true, code: "ALREADY_PAID" });
      }
      if (order.status !== OrderStatus.PENDING) {
        console.warn("[toss/webhook] unexpected order status for DONE event", {
          orderId: order.id,
          status: order.status,
        });
        return NextResponse.json({ ok: true, code: "INVALID_STATE" });
      }
      // 내부 confirm 엔드포인트 재활용 (재고 차감 + 알림 등 동일 로직 보장)
      const baseUrl = getCanonicalOrigin();
      const confirmRes = await fetch(`${baseUrl}/api/payments/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order.id,
          paymentKey: truth.paymentKey,
          amount: truth.totalAmount,
        }),
      });
      const confirmBody = (await confirmRes.json().catch(() => ({}))) as {
        ok?: boolean;
        code?: string;
      };
      console.log("[toss/webhook] DONE → confirm result", {
        orderId: order.id,
        ok: confirmBody.ok,
        code: confirmBody.code,
      });
      return NextResponse.json({ ok: true, code: "DONE_CONFIRMED" });
    }

    case "CANCELED":
    case "PARTIAL_CANCELED": {
      if (
        order.status === OrderStatus.CANCELLED ||
        order.status === OrderStatus.REFUNDED
      ) {
        return NextResponse.json({ ok: true, code: "ALREADY_CANCELLED" });
      }
      // 아직 PAID 인 상태면 우리 쪽에서도 취소 처리
      await prisma.$transaction(async (tx) => {
        await tx.order.update({
          where: { id: order.id },
          data: { status: OrderStatus.CANCELLED },
        });
        if (order.payment) {
          await tx.payment.update({
            where: { orderId: order.id },
            data: { status: PaymentStatus.CANCELED },
          });
        }
      });
      await notifyOrderStatusChange(
        order.id,
        order.orderNo,
        order.buyerId,
        order.sellerId,
        "CANCELLED",
      );
      console.log("[toss/webhook] CANCELED → order marked CANCELLED", {
        orderId: order.id,
      });
      return NextResponse.json({ ok: true, code: "CANCELLED" });
    }

    case "ABORTED":
    case "EXPIRED": {
      if (order.status === OrderStatus.PENDING) {
        await prisma.order.update({
          where: { id: order.id },
          data: { status: OrderStatus.FAILED },
        });
      }
      return NextResponse.json({ ok: true, code: "MARKED_FAILED" });
    }

    default:
      console.log("[toss/webhook] unhandled truth status", {
        orderId: order.id,
        tossStatus: truth.status,
      });
      return NextResponse.json({ ok: true, code: "IGNORED" });
  }
}

// GET 은 Toss 가 웹훅 URL 유효성 점검할 때 사용하는 경우가 있어 200 반환.
export async function GET() {
  return NextResponse.json({ ok: true, message: "Toss webhook endpoint alive" });
}
