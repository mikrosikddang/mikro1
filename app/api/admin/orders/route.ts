import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, isAdmin } from "@/lib/auth";
import { OrderStatus } from "@prisma/client";

export const runtime = "nodejs";

/**
 * GET /api/admin/orders
 * List all platform orders with optional status filter
 *
 * Query params:
 * - status: OrderStatus (optional)
 * - limit: number (optional, default 100)
 *
 * Auth: ADMIN only
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !isAdmin(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get("status");
    const limitParam = searchParams.get("limit");

    // Build filter
    const where: any = {};
    if (statusParam && Object.values(OrderStatus).includes(statusParam as OrderStatus)) {
      where.status = statusParam as OrderStatus;
    }

    const limit = limitParam ? Math.min(parseInt(limitParam, 10), 500) : 100;

    const orders = await prisma.order.findMany({
      where,
      include: {
        buyer: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        seller: {
          select: {
            id: true,
            sellerProfile: {
              select: {
                shopName: true,
              },
            },
          },
        },
        items: {
          select: {
            product: {
              select: {
                title: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return NextResponse.json({ orders });
  } catch (error) {
    console.error("GET /api/admin/orders error:", error);
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 }
    );
  }
}
