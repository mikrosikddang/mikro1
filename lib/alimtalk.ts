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

function getTemplateId(status: OrderStatus) {
  switch (status) {
    case OrderStatus.PAID:
      return process.env.BIZM_TEMPLATE_ORDER_PAID?.trim() || null;
    case OrderStatus.CANCELLED:
      return process.env.BIZM_TEMPLATE_ORDER_CANCELLED?.trim() || null;
    case OrderStatus.SHIPPED:
      return process.env.BIZM_TEMPLATE_ORDER_SHIPPED?.trim() || null;
    case OrderStatus.COMPLETED:
      return process.env.BIZM_TEMPLATE_ORDER_COMPLETED?.trim() || null;
    case OrderStatus.REFUNDED:
      return process.env.BIZM_TEMPLATE_ORDER_REFUNDED?.trim() || null;
    default:
      return null;
  }
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
        templateEnvVar: `BIZM_TEMPLATE_ORDER_${status}`,
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
