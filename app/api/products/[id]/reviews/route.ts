import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPublicProductWhere } from "@/lib/publicVisibility";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/products/[id]/reviews
 * 상품별 리뷰 목록 (공개, 커서 기반 페이지네이션)
 *
 * Query: ?cursor=<reviewId>&limit=<number>
 * 응답: { reviews, nextCursor, averageRating, totalCount }
 */
export async function GET(
  req: NextRequest,
  context: RouteContext,
) {
  try {
    const { id: productId } = await context.params;
    const { searchParams } = new URL(req.url);
    const cursor = searchParams.get("cursor");
    const limit = Math.min(Number(searchParams.get("limit")) || 20, 50);

    // Verify product exists
    const product = await prisma.product.findFirst({
      where: getPublicProductWhere({ id: productId }),
      select: { id: true },
    });

    if (!product) {
      return NextResponse.json({ error: "상품을 찾을 수 없습니다" }, { status: 404 });
    }

    // Fetch reviews with cursor pagination
    const reviews = await prisma.review.findMany({
      where: { productId },
      orderBy: { createdAt: "desc" },
      take: limit + 1, // Fetch one extra to determine if there's a next page
      ...(cursor
        ? {
            cursor: { id: cursor },
            skip: 1, // Skip the cursor itself
          }
        : {}),
      select: {
        id: true,
        rating: true,
        content: true,
        createdAt: true,
        user: {
          select: {
            name: true,
          },
        },
      },
    });

    // Determine next cursor
    const hasMore = reviews.length > limit;
    const items = hasMore ? reviews.slice(0, limit) : reviews;
    const nextCursor = hasMore ? items[items.length - 1].id : null;

    // Mask user name (show first character + **)
    const maskedReviews = items.map((r) => ({
      id: r.id,
      rating: r.rating,
      content: r.content,
      createdAt: r.createdAt,
      userName: maskName(r.user.name),
    }));

    // Aggregate stats
    const stats = await prisma.review.aggregate({
      where: { productId },
      _avg: { rating: true },
      _count: true,
    });

    return NextResponse.json({
      reviews: maskedReviews,
      nextCursor,
      averageRating: stats._avg.rating ? Math.round(stats._avg.rating * 10) / 10 : null,
      totalCount: stats._count,
    });
  } catch (error) {
    console.error("GET /api/products/[id]/reviews error:", error);
    return NextResponse.json(
      { error: "리뷰 조회 중 오류가 발생했습니다" },
      { status: 500 },
    );
  }
}

/** 이름 마스킹: "홍길동" → "홍**", null → "구매자" */
function maskName(name: string | null): string {
  if (!name || name.length === 0) return "구매자";
  if (name.length === 1) return `${name}*`;
  return `${name[0]}${"*".repeat(name.length - 1)}`;
}
