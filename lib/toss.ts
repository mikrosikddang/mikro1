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
