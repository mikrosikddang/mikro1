import { NextResponse } from "next/server";
import { OrderStatus, type Prisma } from "@prisma/client";
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
    const session = await requireSeller(_session); // Seller-only access

    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    const cursor = url.searchParams.get("cursor");
    const limitParam = url.searchParams.get("limit");
    const limit = Math.min(parseInt(limitParam || "20", 10), 100);

    // Auto-expire expired PENDING orders for this seller
    await prisma.order.updateMany({
      where: {
        sellerId: session.userId,
        status: "PENDING",
        expiresAt: { lt: new Date() },
      },
      data: { status: "EXPIRED" },
    });

    // Build query conditions — always exclude PENDING and EXPIRED
    const where: Prisma.OrderWhereInput = {
      sellerId: session.userId, // Only seller's own orders
      ...(cursor && {
        createdAt: {
          lt: new Date(cursor),
        },
      }),
    };

    const validOrderStatus = Object.values(OrderStatus).includes(status as OrderStatus)
      ? (status as OrderStatus)
      : null;

    if (validOrderStatus === OrderStatus.REFUND_REQUESTED) {
      where.OR = [
        { status: { in: ["REFUND_REQUESTED", "RETURN_STARTED"] as const } },
        { claims: { some: { status: { in: ["REQUESTED", "APPROVED"] as const } } } },
      ];
    } else {
      where.status =
        validOrderStatus &&
        validOrderStatus !== OrderStatus.PENDING &&
        validOrderStatus !== OrderStatus.EXPIRED
          ? validOrderStatus
          : { notIn: ["PENDING", "EXPIRED"] as const };
    }

    // Fetch orders with pagination
    const orders = await prisma.order.findMany({
      where,
      orderBy: [
        { createdAt: "desc" },
        { id: "desc" },
      ],
      take: limit + 1,
      include: {
        buyer: {
          select: { name: true },
        },
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
        claims: {
          where: {
            status: { in: ["REQUESTED", "APPROVED"] },
          },
          orderBy: { createdAt: "desc" },
          take: 3,
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
