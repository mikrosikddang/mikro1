import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const runtime = "nodejs";

/**
 * GET /api/wishlist/check?productIds=id1,id2,id3
 * 여러 상품의 위시리스트 여부 확인 (피드용 배치 체크)
 *
 * Response: { [productId]: boolean }
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      // 비로그인 시 모두 false
      return NextResponse.json({ wishlisted: {} });
    }

    const { searchParams } = new URL(req.url);
    const productIdsParam = searchParams.get("productIds");

    if (!productIdsParam) {
      return NextResponse.json({ wishlisted: {} });
    }

    const productIds = productIdsParam.split(",").filter(Boolean).slice(0, 100);

    if (productIds.length === 0) {
      return NextResponse.json({ wishlisted: {} });
    }

    const wishlistItems = await prisma.wishlist.findMany({
      where: {
        userId: session.userId,
        productId: { in: productIds },
      },
      select: { productId: true },
    });

    const wishlistedSet = new Set(wishlistItems.map((w) => w.productId));

    const wishlisted: Record<string, boolean> = {};
    for (const id of productIds) {
      wishlisted[id] = wishlistedSet.has(id);
    }

    return NextResponse.json({ wishlisted });
  } catch (error) {
    console.error("GET /api/wishlist/check error:", error);
    return NextResponse.json(
      { error: "위시리스트 확인 중 오류가 발생했습니다" },
      { status: 500 },
    );
  }
}
