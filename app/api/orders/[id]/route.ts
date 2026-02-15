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

/**
 * PATCH /api/orders/[id]
 * Update shipTo fields for PENDING orders (buyer only)
 */
export async function PATCH(request: Request, { params }: Props) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    // Validate addressId is provided
    if (!body.addressId) {
      return NextResponse.json(
        { error: "addressId is required" },
        { status: 400 }
      );
    }

    // Fetch order to verify ownership and status
    const order = await prisma.order.findUnique({
      where: { id },
      select: { id: true, buyerId: true, status: true },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Only buyer can update shipping address
    if (order.buyerId !== session.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Only allow updates for PENDING orders
    if (order.status !== "PENDING") {
      return NextResponse.json(
        { error: "Cannot update address for non-pending order" },
        { status: 400 }
      );
    }

    // Fetch address and verify ownership
    const address = await prisma.address.findUnique({
      where: { id: body.addressId },
    });

    if (!address) {
      return NextResponse.json(
        { error: "Address not found" },
        { status: 404 }
      );
    }

    if (address.userId !== session.userId) {
      return NextResponse.json(
        { error: "Address does not belong to you" },
        { status: 403 }
      );
    }

    // Update order with shipTo snapshot
    const updated = await prisma.order.update({
      where: { id },
      data: {
        shipToName: address.name,
        shipToPhone: address.phone,
        shipToZip: address.zipCode,
        shipToAddr1: address.addr1,
        shipToAddr2: address.addr2,
      },
    });

    return NextResponse.json({ ok: true, order: updated });
  } catch (error) {
    console.error("PATCH /api/orders/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to update order" },
      { status: 500 }
    );
  }
}
