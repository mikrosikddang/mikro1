import { NextResponse } from "next/server";
import { getTossPaymentConfig } from "@/lib/tossConfig";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/payments/config
 * 결제 시작 직전 클라이언트가 호출하여 현재 모드(live/test)에 맞는
 * 공개 클라이언트 키를 받아간다. 시크릿 키는 절대 포함하지 않음.
 */
export async function GET() {
  const { mode, clientKey } = await getTossPaymentConfig();
  return NextResponse.json({ mode, clientKey });
}
