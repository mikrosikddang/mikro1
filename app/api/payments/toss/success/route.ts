import { NextRequest, NextResponse } from "next/server";
import { getCanonicalOrigin } from "@/lib/siteUrl";
import { getTossSecretKey } from "@/lib/tossConfig";

export const runtime = "nodejs";

type TossConfirmResponse = {
  paymentKey: string;
  orderId: string;
  status: string;
  method?: string;
  totalAmount?: number;
  virtualAccount?: {
    accountNumber?: string;
    accountType?: string;
    bankCode?: string;
    bank?: string;
    customerName?: string;
    dueDate?: string;
    expired?: boolean;
  };
  secret?: string;
};

/**
 * GET /api/payments/toss/success
 * 토스 결제위젯 successUrl 콜백 — 결제 승인 + 주문 상태 업데이트
 *
 * 분기:
 *   - 카드/간편결제 (status="DONE")        → PAID 처리, /orders/success 로 이동
 *   - 가상계좌 (status="WAITING_FOR_DEPOSIT") → WAITING_DEPOSIT 처리, /orders/<id> 로 이동
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
      return NextResponse.redirect(`${baseUrl}/checkout?payment_error=payment_not_configured`);
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
      const errBody = await confirmRes.text();
      console.error("[toss/success] confirm failed:", confirmRes.status, errBody);
      return NextResponse.redirect(
        `${baseUrl}/checkout?payment_error=${encodeURIComponent("결제 승인에 실패했습니다")}`,
      );
    }

    const confirmData = (await confirmRes.json()) as TossConfirmResponse;

    const isVirtualAccount =
      confirmData.method === "가상계좌" ||
      confirmData.status === "WAITING_FOR_DEPOSIT";

    // 각 주문별 상태 업데이트
    for (const oid of orderIds) {
      await fetch(`${baseUrl}/api/payments/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: oid,
          paymentKey,
          amount,
          method: confirmData.method,
          virtualAccount: isVirtualAccount
            ? {
                bank: confirmData.virtualAccount?.bank ?? null,
                bankCode: confirmData.virtualAccount?.bankCode ?? null,
                accountNumber: confirmData.virtualAccount?.accountNumber ?? null,
                customerName: confirmData.virtualAccount?.customerName ?? null,
                dueDate: confirmData.virtualAccount?.dueDate ?? null,
                secret: confirmData.secret ?? null,
              }
            : null,
        }),
      });
    }

    if (isVirtualAccount) {
      // 가상계좌는 입금 대기 상태이므로 주문 상세로 이동해 계좌번호 안내
      return NextResponse.redirect(`${baseUrl}/orders/${orderIds[0]}`);
    }

    return NextResponse.redirect(`${baseUrl}/orders/success?ids=${orderIds.join(",")}`);
  } catch (error) {
    console.error("[toss/success] callback error:", error);
    return NextResponse.redirect(
      `${baseUrl}/checkout?payment_error=${encodeURIComponent("결제 처리 중 오류가 발생했습니다")}`,
    );
  }
}
