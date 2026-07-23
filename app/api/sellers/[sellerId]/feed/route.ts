import { NextResponse } from "next/server";
import { getSellerFeedWindow } from "@/lib/sellerFeed";

export const runtime = "nodejs";

type Props = { params: Promise<{ sellerId: string }> };

/**
 * GET /api/sellers/[sellerId]/feed  (public)
 *
 * Query params:
 * - anchor=<postId>            initial load centered on a post
 * - cursor=<postId>&direction=before|after   paginate up/down from a boundary
 * - limit                     items per page (default 10, max 20)
 *
 * Ordering + visibility match the shop grid (customer-visible only).
 */
export async function GET(request: Request, { params }: Props) {
  try {
    const { sellerId } = await params;
    const url = new URL(request.url);
    const anchor = url.searchParams.get("anchor");
    const cursor = url.searchParams.get("cursor");
    const directionParam = url.searchParams.get("direction");
    const direction =
      directionParam === "before" || directionParam === "after" ? directionParam : null;
    const limitParam = url.searchParams.get("limit");
    const limit = limitParam ? parseInt(limitParam, 10) : null;

    const result = await getSellerFeedWindow({ sellerId, anchor, cursor, direction, limit });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "피드를 불러오지 못했습니다." },
      { status: 500 },
    );
  }
}
