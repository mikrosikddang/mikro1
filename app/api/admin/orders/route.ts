import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { OrderStatus } from "@prisma/client";
import { requireAdmin } from "@/lib/roleGuards";

export const runtime = "nodejs";

/**
 * GET /api/admin/orders
 * List all platform orders with optional status filter
 *
 * Query params:
 * - status: OrderStatus (optional)
 * - limit: number (optional, default 100)
 * - sellerId: string (optional)
 * - buyerId: string (optional)
 *
 * Auth: ADMIN only
 */
export async function GET(request: NextRequest) {
  try {
    requireAdmin(await getSession());

    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get("status");
    const limitParam = searchParams.get("limit");
    const sellerIdParam = searchParams.get("sellerId");
    const buyerIdParam = searchParams.get("buyerId");

    // Auto-expire expired PENDING orders platform-wide
    await prisma.order.updateMany({
      where: {
        status: "PENDING",
        expiresAt: { lt: new Date() },
      },
      data: { status: "EXPIRED" },
    });

    const where: {
      status?: OrderStatus;
      sellerId?: string;
      buyerId?: string;
    } = {};
    if (statusParam && Object.values(OrderStatus).includes(statusParam as OrderStatus)) {
      where.status = statusParam as OrderStatus;
    }
    if (sellerIdParam) {
      where.sellerId = sellerIdParam;
    }
    if (buyerIdParam) {
      where.buyerId = buyerIdParam;
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
    if (error instanceof NextResponse) {
      return error;
    }
    console.error("GET /api/admin/orders error:", error);
    return NextResponse.json(
      { error: "주문 목록을 불러오지 못했습니다" },
      { status: 500 }
    );
  }
}
