import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { requireSeller } from "@/lib/roleGuards";

export const runtime = "nodejs";

/**
 * GET /api/seller/orders
 * Get orders where current user is the seller
 *
 * Query params:
 * - status: filter by OrderStatus (optional)
 * - cursor: createdAt timestamp for pagination (optional)
 * - limit: number of orders to return (default 20, max 100)
 *
 * Returns:
 * - items: Order[] with buyer info snapshot and items
 * - nextCursor: string | null
 */
export async function GET(request: Request) {
  try {
    const _session = await getSession();
    const session = requireSeller(_session); // Seller-only access

    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    const cursor = url.searchParams.get("cursor");
    const limitParam = url.searchParams.get("limit");
    const limit = Math.min(parseInt(limitParam || "20", 10), 100);

    // Auto-cancel expired PENDING orders for this seller
    await prisma.order.updateMany({
      where: {
        sellerId: session.userId,
        status: "PENDING",
        expiresAt: { lt: new Date() },
      },
      data: { status: "CANCELLED" },
    });

    // Build query conditions — always exclude PENDING
    const where: any = {
      sellerId: session.userId, // Only seller's own orders
      status: status && status !== "PENDING" ? status : { not: "PENDING" as const },
      ...(cursor && {
        createdAt: {
          lt: new Date(cursor),
        },
      }),
    };

    // Fetch orders with pagination
    const orders = await prisma.order.findMany({
      where,
      orderBy: [
        { createdAt: "desc" },
        { id: "desc" },
      ],
      take: limit + 1,
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                title: true,
              },
            },
            variant: {
              select: {
                id: true,
                color: true,
                sizeLabel: true,
              },
            },
          },
        },
      },
    });

    // Pagination
    const hasMore = orders.length > limit;
    const items = hasMore ? orders.slice(0, limit) : orders;
    const nextCursor = hasMore
      ? items[items.length - 1].createdAt.toISOString()
      : null;

    return NextResponse.json({
      items,
      nextCursor,
    });
  } catch (error) {
    console.error("GET /api/seller/orders error:", error);

    // Handle thrown NextResponse from requireSeller
    if (error instanceof NextResponse) {
      return error;
    }

    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 }
    );
  }
}
