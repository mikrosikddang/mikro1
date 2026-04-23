import { NextRequest, NextResponse } from "next/server";
import { getCanonicalOrigin } from "@/lib/siteUrl";

export const runtime = "nodejs";

/**
 * GET /api/payments/toss/fail
 *
 * Toss 결제 실패/취소 콜백.
 * 알림톡은 보내지 않는다 — 사용자가 결제창을 닫거나 실패한 직후이므로
 * 화면에서 즉시 안내 배너를 띄우고 재시도/장바구니 이동 CTA 를 제공한다.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code") ?? "";
  const message = searchParams.get("message") ?? "결제가 취소되었습니다";
  const orderIds = searchParams.get("orderIds") ?? "";
  const baseUrl = getCanonicalOrigin();

  const params = new URLSearchParams();
  params.set("payment_error", message);
  if (code) params.set("payment_error_code", code);
  if (orderIds) params.set("orderIds", orderIds);

  return NextResponse.redirect(`${baseUrl}/checkout?${params.toString()}`);
}
