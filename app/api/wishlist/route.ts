import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const runtime = "nodejs";

/**
 * POST /api/wishlist
 * 위시리스트에 상품 추가
 *
 * Body: { productId: string }
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    const body = await req.json();
    const { productId } = body as { productId?: string };

    if (!productId) {
      return NextResponse.json(
        { error: "상품 ID가 필요합니다" },
        { status: 400 },
      );
    }

    // Verify product exists
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, isDeleted: true },
    });

    if (!product || product.isDeleted) {
      return NextResponse.json(
        { error: "상품을 찾을 수 없습니다" },
        { status: 404 },
      );
    }

    // Upsert (idempotent)
    const wishlist = await prisma.wishlist.upsert({
      where: {
        userId_productId: {
          userId: session.userId,
          productId,
        },
      },
      update: {},
      create: {
        userId: session.userId,
        productId,
      },
    });

    return NextResponse.json({ ok: true, id: wishlist.id });
  } catch (error) {
    console.error("POST /api/wishlist error:", error);
    return NextResponse.json(
      { error: "위시리스트 추가 중 오류가 발생했습니다" },
      { status: 500 },
    );
  }
}

/**
 * GET /api/wishlist
 * 내 위시리스트 목록
 *
 * Query: ?cursor=<wishlistId>&limit=<number>
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(req.url);
    const cursor = searchParams.get("cursor");
    const limit = Math.min(Number(searchParams.get("limit")) || 20, 50);

    const items = await prisma.wishlist.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(cursor
        ? {
            cursor: { id: cursor },
            skip: 1,
          }
        : {}),
      include: {
        product: {
          select: {
            id: true,
            title: true,
            priceKrw: true,
            salePriceKrw: true,
            isActive: true,
            isDeleted: true,
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
        },
      },
    });

    const hasMore = items.length > limit;
    const sliced = hasMore ? items.slice(0, limit) : items;
    const nextCursor = hasMore ? sliced[sliced.length - 1].id : null;

    const totalCount = await prisma.wishlist.count({
      where: { userId: session.userId },
    });

    return NextResponse.json({
      items: sliced.map((w) => ({
        id: w.id,
        productId: w.product.id,
        title: w.product.title,
        priceKrw: w.product.priceKrw,
        salePriceKrw: w.product.salePriceKrw,
        imageUrl: w.product.images[0]?.url ?? null,
        shopName: w.product.seller.sellerProfile?.shopName ?? null,
        isAvailable: w.product.isActive && !w.product.isDeleted,
        createdAt: w.createdAt,
      })),
      nextCursor,
      totalCount,
    });
  } catch (error) {
    console.error("GET /api/wishlist error:", error);
    return NextResponse.json(
      { error: "위시리스트 조회 중 오류가 발생했습니다" },
      { status: 500 },
    );
  }
}
