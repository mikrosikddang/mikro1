import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export const runtime = "nodejs";

/**
 * GET /api/search
 * 공개 상품 검색 (상품명, 카테고리, 컬러)
 *
 * Query params:
 * - q: 검색어 (required)
 * - cursor: createdAt ISO string (optional)
 * - limit: number (optional, default: 20, max: 100)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim();
    const cursor = searchParams.get("cursor") || undefined;
    const limitParam = searchParams.get("limit");
    const limit = Math.min(parseInt(limitParam || "20", 10), 100);

    if (!q || q.length === 0) {
      return NextResponse.json(
        { error: "검색어를 입력해주세요" },
        { status: 400 },
      );
    }

    const where: Prisma.ProductWhereInput = {
      isActive: true,
      isDeleted: false,
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { categoryMain: { contains: q, mode: "insensitive" } },
        { categoryMid: { contains: q, mode: "insensitive" } },
        { categorySub: { contains: q, mode: "insensitive" } },
        { variants: { some: { color: { contains: q, mode: "insensitive" } } } },
      ],
      ...(cursor && { createdAt: { lt: new Date(cursor) } }),
    };

    const [products, totalCount] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy: [{ createdAt: "desc" }],
        take: limit + 1,
        select: {
          id: true,
          title: true,
          priceKrw: true,
          salePriceKrw: true,
          createdAt: true,
          images: {
            where: { kind: "MAIN", colorKey: null },
            orderBy: { sortOrder: "asc" },
            take: 1,
            select: { url: true },
          },
          seller: {
            select: {
              sellerProfile: {
                select: { shopName: true },
              },
            },
          },
        },
      }),
      prisma.product.count({ where }),
    ]);

    const hasMore = products.length > limit;
    const items = hasMore ? products.slice(0, limit) : products;
    const nextCursor = hasMore
      ? items[items.length - 1].createdAt.toISOString()
      : null;

    return NextResponse.json({
      products: items,
      nextCursor,
      totalCount,
    });
  } catch (error) {
    console.error("GET /api/search error:", error);
    return NextResponse.json(
      { error: "검색에 실패했습니다" },
      { status: 500 },
    );
  }
}
