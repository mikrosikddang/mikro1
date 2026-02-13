import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const runtime = "nodejs";

type Props = { params: Promise<{ id: string }> };

/**
 * GET /api/orders/[id]
 * 주문 상세 조회 (본인 주문만)
 */
export async function GET(request: Request, { params }: Props) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: {
              include: {
                images: {
                  where: { kind: "MAIN" },
                  orderBy: { sortOrder: "asc" },
                  take: 1,
                },
                seller: {
                  include: {
                    sellerProfile: true,
                  },
                },
              },
            },
            variant: true,
          },
        },
        buyer: { select: { id: true, name: true } },
        seller: {
          select: {
            id: true,
            sellerProfile: { select: { shopName: true } },
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // 본인 주문만 접근 가능 (구매자 또는 판매자)
    if (order.buyerId !== session.userId && order.sellerId !== session.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(order);
  } catch (error) {
    console.error("GET /api/orders/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch order" },
      { status: 500 }
    );
  }
}
