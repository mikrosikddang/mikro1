/**
 * Toss Payments API helper
 *
 * Docs: https://docs.tosspayments.com/reference
 * Cancel: POST /v1/payments/{paymentKey}/cancel
 */

import { getTossSecretKey, getTossSecretKeyForMode, type TossMode } from "@/lib/tossConfig";
import { prisma } from "@/lib/prisma";

const TOSS_API_BASE = "https://api.tosspayments.com/v1";

async function resolveSecretKey(paymentKey: string): Promise<string> {
  // 1순위: Payment 레코드에 저장된 결제 시점 모드 — 이미 취소된 결제는 건너뛰지만,
  // live 에서 발급된 paymentKey 는 live secret 으로만 취소 가능하므로 저장된 모드가 우선.
  try {
    const row = await prisma.payment.findUnique({
      where: { paymentKey },
      select: { mode: true },
    });
    if (row?.mode === "live" || row?.mode === "test") {
      const key = getTossSecretKeyForMode(row.mode as TossMode);
      if (key) return key;
    }
  } catch (err) {
    console.warn("[toss] payment.mode lookup failed, fallback to current mode:", err);
  }
  return getTossSecretKey();
}

export type TossPaymentLookup = {
  paymentKey: string;
  orderId: string;
  status: string;
  method?: string;
  totalAmount?: number;
};

export type TossGetResult =
  | { ok: true; payment: TossPaymentLookup }
  | { ok: false; kind: "not_found"; code: string; message: string } // 404 등 — 실존하지 않는 결제
  | { ok: false; kind: "unavailable"; code: string; message: string }; // 네트워크/5xx — 검증 불가(공격 아님)

/**
 * Look up a payment on Toss (server-to-server verification).
 * GET /v1/payments/{paymentKey} — idempotent read, no state change.
 *
 * Distinguishes "결제 실존하지 않음"(kind:not_found → 위조 의심)과
 * "토스 조회 자체 실패"(kind:unavailable → 네트워크/5xx, 공격 아님 → 안전측 보류)를 구분한다.
 */
export async function getPayment(paymentKey: string): Promise<TossGetResult> {
  const secretKey = await resolveSecretKey(paymentKey);
  if (!secretKey) {
    return {
      ok: false,
      kind: "unavailable",
      code: "TOSS_NOT_CONFIGURED",
      message: "Toss API key not configured",
    };
  }
  const encoded = Buffer.from(`${secretKey}:`).toString("base64");

  try {
    const res = await fetch(
      `${TOSS_API_BASE}/payments/${encodeURIComponent(paymentKey)}`,
      {
        method: "GET",
        headers: { Authorization: `Basic ${encoded}` },
      },
    );

    if (res.ok) {
      const data = (await res.json()) as TossPaymentLookup;
      return { ok: true, payment: data };
    }

    // 4xx (특히 404 NOT_FOUND_PAYMENT) → 실존하지 않는 결제 = 위조 의심
    if (res.status >= 400 && res.status < 500) {
      const errBody = (await res.json().catch(() => ({}))) as { code?: string };
      return {
        ok: false,
        kind: "not_found",
        code: errBody.code ?? `HTTP_${res.status}`,
        message: "결제 정보를 확인할 수 없습니다.",
      };
    }

    // 5xx → 토스 장애, 검증 불가 (공격 아님)
    return {
      ok: false,
      kind: "unavailable",
      code: `HTTP_${res.status}`,
      message: "결제 확인 서비스를 일시적으로 사용할 수 없습니다.",
    };
  } catch {
    // 네트워크 오류 → 검증 불가 (공격 아님)
    return {
      ok: false,
      kind: "unavailable",
      code: "NETWORK_ERROR",
      message: "결제 확인 서비스를 일시적으로 사용할 수 없습니다.",
    };
  }
}

export type TossCancelResult =
  | { ok: true; paymentKey: string }
  | { ok: false; code: string; message: string };

/**
 * Cancel (refund) an authorized/confirmed payment via Toss.
 *
 * Should be called OUTSIDE of DB transactions — network calls inside
 * a transaction will hold the connection open and risk timeouts.
 *
 * If TOSS_SECRET_KEY is not configured, logs a warning and returns
 * ok:false so callers can proceed gracefully in development.
 */
export async function cancelPayment(
  paymentKey: string,
  cancelReason: string,
): Promise<TossCancelResult> {
  const secretKey = await resolveSecretKey(paymentKey);
  if (!secretKey) {
    console.warn(
      "[toss] Secret key not configured — skipping cancel API call for paymentKey:",
      paymentKey,
    );
    return {
      ok: false,
      code: "TOSS_NOT_CONFIGURED",
      message: "Toss API key not configured",
    };
  }
  const encoded = Buffer.from(`${secretKey}:`).toString("base64");

  try {
    const res = await fetch(
      `${TOSS_API_BASE}/payments/${encodeURIComponent(paymentKey)}/cancel`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${encoded}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ cancelReason }),
      },
    );

    if (res.ok) {
      return { ok: true, paymentKey };
    }

    // Toss returns { code, message } on error
    const errBody = (await res.json().catch(() => ({}))) as {
      code?: string;
      message?: string;
    };

    console.error("[toss] cancel failed:", res.status, errBody);

    return {
      ok: false,
      code: errBody.code ?? `HTTP_${res.status}`,
      message: errBody.message ?? "Toss cancel request failed",
    };
  } catch (err) {
    console.error("[toss] cancel network error:", err);
    return {
      ok: false,
      code: "NETWORK_ERROR",
      message: err instanceof Error ? err.message : "Network error",
    };
  }
}
