import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCanonicalOrigin } from "@/lib/siteUrl";
import { sendPaymentFailedAlimtalk } from "@/lib/alimtalk";

export const runtime = "nodejs";

// 사용자가 명시적으로 취소한 경우 알림톡을 보내지 않는다.
const USER_CANCEL_CODES = new Set([
  "USER_CANCEL",
  "PAY_PROCESS_CANCELED",
  "PAY_PROCESS_ABORTED",
]);

/**
 * GET /api/payments/toss/fail
 * 토스 결제 실패/취소 콜백
 *
 * Toss 가 제공하는 query: code, message, orderId
 * (우리는 체크아웃에서 successUrl/failUrl 에 orderIds 도 싣어두었음)
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code") || "";
  const message = searchParams.get("message") || "결제가 취소되었습니다";
  const orderId = searchParams.get("orderId");
  const orderIds = searchParams.get("orderIds")?.split(",").filter(Boolean);
  const baseUrl = getCanonicalOrigin();

  // 단순 사용자 취소가 아닌 실제 실패인 경우에만 알림톡 발송
  if (!USER_CANCEL_CODES.has(code) && orderId) {
    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        select: {
          id: true,
          orderNo: true,
          buyer: { select: { name: true, phone: true } },
          shipToName: true,
          shipToPhone: true,
        },
      });

      if (order) {
        await sendPaymentFailedAlimtalk({
          orderId: order.id,
          orderNo: order.orderNo,
          buyerName: order.buyer?.name ?? order.shipToName ?? null,
          buyerPhone: order.buyer?.phone ?? order.shipToPhone ?? null,
          reason: message,
        });
      }
    } catch (err) {
      console.error("[toss/fail] alimtalk dispatch error:", err);
    }
  } else {
    console.log("[toss/fail] User cancel — alimtalk skipped", { code, orderId });
  }

  const suffix = orderIds?.length
    ? `&orderIds=${orderIds.join(",")}`
    : "";
  return NextResponse.redirect(
    `${baseUrl}/checkout?error=${encodeURIComponent(message)}${suffix}`,
  );
}
