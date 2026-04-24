import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { requireAdmin } from "@/lib/roleGuards";
import { syncSellerToTossPayouts } from "@/lib/tossSellerSync";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/admin/sellers/[id]/toss-sync
 * 특정 SellerProfile 을 토스 지급대행에 등록.
 * 이미 등록되어 있으면 { ok:false, code:"ALREADY_REGISTERED" } 반환.
 */
export async function POST(_req: NextRequest, context: RouteContext) {
  try {
    requireAdmin(await getSession());
  } catch (e) {
    if (e instanceof NextResponse) return e;
    throw e;
  }
  const { id } = await context.params;

  const result = await syncSellerToTossPayouts(id);

  const status = result.ok ? 200 : result.code === "ALREADY_REGISTERED" ? 200 : 400;
  return NextResponse.json(result, { status });
}
