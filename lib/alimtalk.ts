import { OrderStatus } from "@prisma/client";
import { normalizePhone } from "@/lib/socialAuth";

const BIZM_API_BASE = process.env.BIZM_API_BASE?.trim() || "https://alimtalk-api.bizmsg.kr";

type OrderAlimtalkContext = {
  orderId: string;
  orderNo: string;
  totalPayKrw: number;
  buyerName: string | null;
  buyerPhone: string | null;
  shopName: string | null;
  shipToName: string | null;
  shipToAddr1: string | null;
  shipToAddr2: string | null;
  courier: string | null;
  trackingNo: string | null;
};

type BizMResponseItem = {
  code?: string;
  data?: {
    phn?: string;
    type?: string;
    msgid?: string;
  };
  message?: string | null;
  originMessage?: string | null;
};

function getBizmUserId() {
  return process.env.BIZM_USER_ID?.trim() || null;
}

function getSenderProfileKey() {
  return process.env.BIZM_SENDER_PROFILE_KEY?.trim() || null;
}

const ORDER_TEMPLATE_IDS: Partial<Record<OrderStatus, string>> = {
  [OrderStatus.PAID]: "mikro_order_paid_v1",
  [OrderStatus.CANCELLED]: "mikro_order_cancelled_v1",
  [OrderStatus.SHIPPED]: "mikro_order_shipped_v1",
  [OrderStatus.COMPLETED]: "mikro_order_completed_v1",
  [OrderStatus.REFUNDED]: "mikro_order_refunded_v1",
};

const PAYMENT_FAILED_TEMPLATE_ID = "mikro_payment_failed_v1";

function getTemplateId(status: OrderStatus) {
  return ORDER_TEMPLATE_IDS[status] ?? null;
}

function toBizmPhone(raw: string | null | undefined) {
  const normalized = normalizePhone(raw);
  if (!normalized) return null;
  if (normalized.startsWith("82")) return normalized;
  if (normalized.startsWith("0")) return `82${normalized.slice(1)}`;
  return normalized;
}

function formatKrw(value: number) {
  return `${value.toLocaleString("ko-KR")}원`;
}

function buildOrderStatusMessage(status: OrderStatus, context: OrderAlimtalkContext) {
  const orderPrefix = "[미크로]";
  const buyerName = context.buyerName?.trim() || context.shipToName?.trim() || "고객";
  const address = [context.shipToAddr1, context.shipToAddr2].filter(Boolean).join(" ") || "-";
  const courier = context.courier?.trim() || "-";
  const trackingNo = context.trackingNo?.trim() || "-";

  switch (status) {
    case OrderStatus.PAID:
      return `${orderPrefix} 주문이 확정되었습니다.\n\n주문번호: ${context.orderNo}\n주문자명: ${buyerName}\n결제금액: ${formatKrw(context.totalPayKrw)}\n배송지: ${address}\n\n감사합니다.`;
    case OrderStatus.CANCELLED:
      return `${orderPrefix} 주문이 취소되었습니다.\n\n주문번호: ${context.orderNo}\n주문자명: ${buyerName}\n\n이용해 주셔서 감사합니다.`;
    case OrderStatus.SHIPPED:
      return `${orderPrefix} 상품 발송이 완료되었습니다.\n\n주문번호: ${context.orderNo}\n택배사: ${courier}\n송장번호: ${trackingNo}\n\n배송 조회는 택배사 홈페이지에서 확인해주세요.`;
    case OrderStatus.COMPLETED:
      return `${orderPrefix} 주문이 완료되었습니다.\n\n주문번호: ${context.orderNo}\n주문자명: ${buyerName}\n\n미크로를 이용해 주셔서 감사합니다.`;
    case OrderStatus.REFUNDED:
      return `${orderPrefix} 환불이 완료되었습니다.\n\n주문번호: ${context.orderNo}\n환불금액: ${formatKrw(context.totalPayKrw)}\n\n이용해 주셔서 감사합니다.`;
    default:
      return null;
  }
}

export async function sendOrderStatusAlimtalk(
  status: OrderStatus,
  context: OrderAlimtalkContext,
): Promise<void> {
  const startedAt = Date.now();
  try {
    const userId = getBizmUserId();
    const profileKey = getSenderProfileKey();
    const templateId = getTemplateId(status);
    const phn = toBizmPhone(context.buyerPhone);
    const msg = buildOrderStatusMessage(status, context);

    if (!userId || !profileKey || !templateId) {
      console.warn("[alimtalk] Skipped — missing config", {
        orderId: context.orderId,
        status,
        hasUserId: Boolean(userId),
        hasProfileKey: Boolean(profileKey),
        hasTemplateId: Boolean(templateId),
      });
      return;
    }

    if (!phn || !msg) {
      console.warn("[alimtalk] Skipped — missing phone or message", {
        orderId: context.orderId,
        status,
        hasPhone: Boolean(phn),
        hasMessage: Boolean(msg),
        rawPhone: context.buyerPhone,
      });
      return;
    }

    console.log("[alimtalk] Sending request", {
      orderId: context.orderId,
      status,
      phn,
      templateId,
      apiBase: BIZM_API_BASE,
    });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);

    try {
      const response = await fetch(`${BIZM_API_BASE}/v2/sender/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          userid: userId,
        },
        body: JSON.stringify([
          {
            message_type: "AT",
            phn,
            profile: profileKey,
            tmplId: templateId,
            msg,
            reserveDt: "00000000000000",
            button1: {
              name: "채널 추가",
              type: "AC",
            },
          },
        ]),
        signal: controller.signal,
      });

      const raw = await response.text();
      let parsed: BizMResponseItem[] | null = null;

      try {
        parsed = JSON.parse(raw) as BizMResponseItem[];
      } catch {
        parsed = null;
      }

      const result = Array.isArray(parsed) ? parsed[0] : null;
      const elapsedMs = Date.now() - startedAt;

      if (!response.ok || result?.code !== "success") {
        console.error("[alimtalk] Send failed", {
          orderId: context.orderId,
          status,
          httpStatus: response.status,
          elapsedMs,
          result,
          raw: raw.slice(0, 500),
        });
        return;
      }

      console.log("[alimtalk] Sent successfully", {
        orderId: context.orderId,
        status,
        msgid: result.data?.msgid ?? null,
        elapsedMs,
      });
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    const elapsedMs = Date.now() - startedAt;
    const isAbort = error instanceof Error && error.name === "AbortError";
    console.error("[alimtalk] Unexpected error", {
      orderId: context.orderId,
      status,
      elapsedMs,
      isAbort,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

export type PaymentFailedContext = {
  orderId: string;
  orderNo: string;
  buyerName: string | null;
  buyerPhone: string | null;
  reason: string;
};

/**
 * 결제 실패 알림톡 발송.
 * 단순 사용자 취소(USER_CANCEL, PAY_PROCESS_CANCELED)는 호출자가 필터링한다.
 *
 * 주의: `mikro_payment_failed_v1` 템플릿이 BizM 에 승인 등록되어 있어야 한다.
 *       등록 전에는 BizM이 거절하므로 자동으로 skip 로그만 남고 UX는 영향 없음.
 */
export async function sendPaymentFailedAlimtalk(
  context: PaymentFailedContext,
): Promise<void> {
  const startedAt = Date.now();
  try {
    const userId = getBizmUserId();
    const profileKey = getSenderProfileKey();
    const phn = toBizmPhone(context.buyerPhone);
    const buyerName = context.buyerName?.trim() || "고객";
    const reason = context.reason?.trim() || "-";
    const msg = `[미크로] 결제가 정상적으로 처리되지 않았습니다.\n\n주문번호: ${context.orderNo}\n주문자명: ${buyerName}\n사유: ${reason}\n\n다시 시도하거나 고객센터로 문의해주세요.`;

    if (!userId || !profileKey) {
      console.warn("[alimtalk/failed] Skipped — missing config", {
        orderId: context.orderId,
        hasUserId: Boolean(userId),
        hasProfileKey: Boolean(profileKey),
      });
      return;
    }
    if (!phn) {
      console.warn("[alimtalk/failed] Skipped — missing phone", {
        orderId: context.orderId,
        rawPhone: context.buyerPhone,
      });
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);

    try {
      const response = await fetch(`${BIZM_API_BASE}/v2/sender/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json", userid: userId },
        body: JSON.stringify([
          {
            message_type: "AT",
            phn,
            profile: profileKey,
            tmplId: PAYMENT_FAILED_TEMPLATE_ID,
            msg,
            reserveDt: "00000000000000",
            button1: { name: "채널 추가", type: "AC" },
          },
        ]),
        signal: controller.signal,
      });

      const raw = await response.text();
      let parsed: BizMResponseItem[] | null = null;
      try {
        parsed = JSON.parse(raw) as BizMResponseItem[];
      } catch {
        parsed = null;
      }
      const result = Array.isArray(parsed) ? parsed[0] : null;
      const elapsedMs = Date.now() - startedAt;

      if (!response.ok || result?.code !== "success") {
        console.error("[alimtalk/failed] Send failed", {
          orderId: context.orderId,
          httpStatus: response.status,
          elapsedMs,
          result,
          raw: raw.slice(0, 500),
        });
        return;
      }

      console.log("[alimtalk/failed] Sent successfully", {
        orderId: context.orderId,
        msgid: result.data?.msgid ?? null,
        elapsedMs,
      });
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    console.error("[alimtalk/failed] Unexpected error", {
      orderId: context.orderId,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
