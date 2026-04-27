import { OrderStatus } from "@prisma/client";
import { normalizePhone } from "@/lib/socialAuth";

const BIZM_API_BASE = process.env.BIZM_API_BASE?.trim() || "https://alimtalk-api.bizmsg.kr";

const SITE_BASE = "https://mikrobrand.kr";

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

/* ============================================================
 * 셀러용 알림톡 (강조표기형)
 * ============================================================
 *
 * 비즈엠 콘솔에 등록된 4종 강조표기 템플릿:
 *   - mikro_seller_order_new_v1     "새 주문이 접수되었습니다"
 *   - mikro_seller_order_cancel_v1  "주문 취소 알림"
 *   - mikro_seller_claim_new_v1     "교환·환불 요청"
 *   - mikro_seller_payout_ready_v1  "정산 안내"
 *
 * 강조표기형은 발송 시 `title` 필드가 등록된 강조 제목과 정확히 일치해야 한다.
 * 본문(`msg`) 도 등록된 문자열과 글자 단위로 일치해야 한다 (변수 부분만 치환).
 */

export type SellerAlimtalkKind =
  | "ORDER_NEW"
  | "ORDER_CANCEL"
  | "CLAIM_NEW"
  | "PAYOUT_READY";

const SELLER_TEMPLATE_IDS: Record<SellerAlimtalkKind, string> = {
  ORDER_NEW: "mikro_seller_order_new_v1",
  ORDER_CANCEL: "mikro_seller_order_cancel_v1",
  CLAIM_NEW: "mikro_seller_claim_new_v1",
  PAYOUT_READY: "mikro_seller_payout_ready_v1",
};

const SELLER_TEMPLATE_TITLES: Record<SellerAlimtalkKind, string> = {
  ORDER_NEW: "새 주문이 접수되었습니다",
  ORDER_CANCEL: "주문 취소 알림",
  CLAIM_NEW: "교환·환불 요청",
  PAYOUT_READY: "정산 안내",
};

type SellerOrderNewContext = {
  kind: "ORDER_NEW";
  sellerPhone: string | null;
  orderId: string;
  orderNo: string;
  buyerName: string;
  productName: string;
  quantity: number;
  totalPayKrw: number;
};

type SellerOrderCancelContext = {
  kind: "ORDER_CANCEL";
  sellerPhone: string | null;
  orderId: string;
  orderNo: string;
  buyerName: string;
  productName: string;
  reason: string;
};

type SellerClaimNewContext = {
  kind: "CLAIM_NEW";
  sellerPhone: string | null;
  orderId: string;
  orderNo: string;
  claimType: string; // "환불" | "교환"
  reason: string;
};

type SellerPayoutReadyContext = {
  kind: "PAYOUT_READY";
  sellerPhone: string | null;
  amountKrw: number;
  payoutDate: string; // 예: "25일"
};

export type SellerAlimtalkContext =
  | SellerOrderNewContext
  | SellerOrderCancelContext
  | SellerClaimNewContext
  | SellerPayoutReadyContext;

function buildSellerMessage(ctx: SellerAlimtalkContext): string {
  switch (ctx.kind) {
    case "ORDER_NEW":
      return [
        "[미크로] 대표님 새 주문이 접수되었습니다.",
        "",
        `주문번호: ${ctx.orderNo}`,
        `주문자: ${ctx.buyerName}`,
        `상품: ${ctx.productName}`,
        `수량: ${ctx.quantity}`,
        `결제금액: ${formatKrw(ctx.totalPayKrw)}`,
        "",
        "판매자 센터에서 주문 상세 확인 및 발송 처리 부탁드립니다.",
      ].join("\n");
    case "ORDER_CANCEL":
      return [
        "[미크로] 주문이 취소되었습니다.",
        "",
        `주문번호: ${ctx.orderNo}`,
        `주문자: ${ctx.buyerName}`,
        `상품: ${ctx.productName}`,
        `사유: ${ctx.reason}`,
      ].join("\n");
    case "CLAIM_NEW":
      return [
        "[미크로] 교환·환불 요청이 접수되었습니다.",
        "",
        `주문번호: ${ctx.orderNo}`,
        `요청유형: ${ctx.claimType}`,
        `요청사유: ${ctx.reason}`,
        "",
        "판매자 센터에서 48시간 이내 처리 부탁드립니다.",
      ].join("\n");
    case "PAYOUT_READY":
      return [
        "[미크로] 정산 가능 금액이 발생했습니다.",
        "",
        `정산가능액: ${formatKrw(ctx.amountKrw)}`,
        `정산주기: 매월 ${ctx.payoutDate}`,
        "",
        "판매자 센터에서 정산 내역을 확인하실 수 있습니다.",
      ].join("\n");
  }
}

function buildSellerButton(kind: SellerAlimtalkKind): {
  name: string;
  type: "WL";
  url_mobile: string;
  url_pc: string;
} {
  if (kind === "PAYOUT_READY") {
    return {
      name: "정산 확인하기",
      type: "WL",
      url_mobile: `${SITE_BASE}/seller/settlements`,
      url_pc: `${SITE_BASE}/seller/settlements`,
    };
  }
  if (kind === "CLAIM_NEW") {
    return {
      name: "요청 처리하기",
      type: "WL",
      url_mobile: `${SITE_BASE}/seller/orders`,
      url_pc: `${SITE_BASE}/seller/orders`,
    };
  }
  return {
    name: "주문 확인하기",
    type: "WL",
    url_mobile: `${SITE_BASE}/seller/orders`,
    url_pc: `${SITE_BASE}/seller/orders`,
  };
}

function describeContext(ctx: SellerAlimtalkContext): { orderId?: string } {
  if (ctx.kind === "PAYOUT_READY") return {};
  return { orderId: ctx.orderId };
}

export async function sendSellerOrderAlimtalk(ctx: SellerAlimtalkContext): Promise<void> {
  const startedAt = Date.now();
  const ctxDesc = describeContext(ctx);
  try {
    const userId = getBizmUserId();
    const profileKey = getSenderProfileKey();
    const tmplId = SELLER_TEMPLATE_IDS[ctx.kind];
    const title = SELLER_TEMPLATE_TITLES[ctx.kind];
    const phn = toBizmPhone(ctx.sellerPhone);
    const msg = buildSellerMessage(ctx);
    const button1 = buildSellerButton(ctx.kind);

    if (!userId || !profileKey || !tmplId) {
      console.warn("[seller-alimtalk] Skipped — missing config", {
        ...ctxDesc,
        kind: ctx.kind,
        hasUserId: Boolean(userId),
        hasProfileKey: Boolean(profileKey),
        hasTemplateId: Boolean(tmplId),
      });
      return;
    }

    if (!phn) {
      console.warn("[seller-alimtalk] Skipped — missing seller phone", {
        ...ctxDesc,
        kind: ctx.kind,
        rawPhone: ctx.sellerPhone,
      });
      return;
    }

    console.log("[seller-alimtalk] Sending request", {
      ...ctxDesc,
      kind: ctx.kind,
      phn,
      tmplId,
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
            tmplId,
            title,
            msg,
            reserveDt: "00000000000000",
            button1,
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
        console.error("[seller-alimtalk] Send failed", {
          ...ctxDesc,
          kind: ctx.kind,
          httpStatus: response.status,
          elapsedMs,
          result,
          raw: raw.slice(0, 500),
        });
        return;
      }

      console.log("[seller-alimtalk] Sent successfully", {
        ...ctxDesc,
        kind: ctx.kind,
        msgid: result.data?.msgid ?? null,
        elapsedMs,
      });
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    const elapsedMs = Date.now() - startedAt;
    const isAbort = error instanceof Error && error.name === "AbortError";
    console.error("[seller-alimtalk] Unexpected error", {
      ...ctxDesc,
      kind: ctx.kind,
      elapsedMs,
      isAbort,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
