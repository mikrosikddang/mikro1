import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * GET /api/payments/toss/fail
 * 토스 결제 실패/취소 콜백
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const message = searchParams.get("message");
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://www.mikrobrand.kr";

  return NextResponse.redirect(
    `${baseUrl}/checkout?error=${encodeURIComponent(message || "결제가 취소되었습니다")}`,
  );
}
