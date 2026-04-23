import { NextRequest, NextResponse } from "next/server";
import { getCanonicalOrigin } from "@/lib/siteUrl";
import { getTossSecretKey } from "@/lib/tossConfig";

export const runtime = "nodejs";

/**
 * GET /api/payments/toss/success
 * 토스 결제 성공 콜백 — 결제 승인 후 주문 상태 업데이트
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const paymentKey = searchParams.get("paymentKey")!;
  const orderId = searchParams.get("orderId")!;
  const amount = Number(searchParams.get("amount"));
  const orderIds = searchParams.get("orderIds")?.split(",") || [orderId];
  const baseUrl = getCanonicalOrigin();

  try {
    const secretKey = await getTossSecretKey();
    if (!secretKey) {
      console.error("[toss/success] Secret key not configured for current Toss mode");
      return NextResponse.redirect(`${baseUrl}/checkout?error=payment_not_configured`);
    }
    const encoded = Buffer.from(`${secretKey}:`).toString("base64");

    const confirmRes = await fetch("https://api.tosspayments.com/v1/payments/confirm", {
      method: "POST",
      headers: {
        Authorization: `Basic ${encoded}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ paymentKey, orderId, amount }),
    });

    if (!confirmRes.ok) {
      console.error("Toss confirm failed:", await confirmRes.text());
      return NextResponse.redirect(`${baseUrl}/checkout?error=payment_failed`);
    }

    // 각 주문별 상태 업데이트
    for (const oid of orderIds) {
      await fetch(`${baseUrl}/api/payments/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: oid, paymentKey, amount }),
      });
    }

    // 성공 페이지로 리다이렉트
    return NextResponse.redirect(`${baseUrl}/orders/success?ids=${orderIds.join(",")}`);
  } catch (error) {
    console.error("Toss success callback error:", error);
    return NextResponse.redirect(`${baseUrl}/checkout?error=payment_failed`);
  }
}
