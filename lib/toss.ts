/**
 * Toss Payments API helper
 *
 * Docs: https://docs.tosspayments.com/reference
 * Cancel: POST /v1/payments/{paymentKey}/cancel
 */

import { getTossSecretKey } from "@/lib/tossConfig";

const TOSS_API_BASE = "https://api.tosspayments.com/v1";

async function authHeader(): Promise<string> {
  const secretKey = await getTossSecretKey();
  const encoded = Buffer.from(`${secretKey}:`).toString("base64");
  return `Basic ${encoded}`;
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
  const secretKey = await getTossSecretKey();
  if (!secretKey) {
    console.warn(
      "[toss] Secret key not configured for current Toss mode — skipping cancel API call for paymentKey:",
      paymentKey,
    );
    return {
      ok: false,
      code: "TOSS_NOT_CONFIGURED",
      message: "Toss API key not configured",
    };
  }

  try {
    const res = await fetch(
      `${TOSS_API_BASE}/payments/${encodeURIComponent(paymentKey)}/cancel`,
      {
        method: "POST",
        headers: {
          Authorization: await authHeader(),
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
