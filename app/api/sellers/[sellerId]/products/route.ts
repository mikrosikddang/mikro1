import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCustomerVisibleProductWhere } from "@/lib/publicVisibility";

export const runtime = "nodejs";

type Props = { params: Promise<{ sellerId: string }> };

/**
 * GET /api/sellers/[sellerId]/products
 * Paginated product list for seller shop page (Instagram-style grid)
 *
 * Query params:
 * - cursor: createdAt timestamp for pagination (optional)
 * - limit: number of products to return (default 30, max 100)
 *
 * Returns:
 * - items: Product[] with main image
 * - nextCursor: string | null (createdAt of last item, for next page)
 */
export async function GET(request: Request, { params }: Props) {
  try {
    const { sellerId } = await params;
    const url = new URL(request.url);
    const cursor = url.searchParams.get("cursor");
    const limitParam = url.searchParams.get("limit");
    const limit = Math.min(
      parseInt(limitParam || "30", 10),
      100
    );

    // Build query conditions
    const where = getCustomerVisibleProductWhere({
      sellerId,
      ...(cursor && {
        createdAt: {
          lt: new Date(cursor),
        },
      }),
    });

    // Fetch products with pagination
    const products = await prisma.product.findMany({
      where,
      orderBy: [
        { sortOrder: "asc" },
        { createdAt: "desc" },
        { id: "desc" }, // tie-breaker
      ],
      take: limit + 1, // Fetch one extra to check if there's a next page
      include: {
        images: {
          where: { kind: "MAIN" },
          orderBy: { sortOrder: "asc" },
          take: 1,
        },
      },
    });

    // Check if there's a next page
    const hasMore = products.length > limit;
    const items = hasMore ? products.slice(0, limit) : products;
    const nextCursor = hasMore
      ? items[items.length - 1].createdAt.toISOString()
      : null;

    // Format response
    const formattedItems = items.map((p) => ({
      id: p.id,
      title: p.title,
      priceKrw: p.priceKrw,
      salePriceKrw: p.salePriceKrw,
      postType: p.postType,
      imageUrl: p.images[0]?.url || null,
      createdAt: p.createdAt.toISOString(),
    }));

    return NextResponse.json({
      items: formattedItems,
      nextCursor,
    });
  } catch (error) {
    console.error("GET /api/sellers/[sellerId]/products error:", error);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}
