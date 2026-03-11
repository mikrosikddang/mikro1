import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { requireSeller } from "@/lib/roleGuards";

export const runtime = "nodejs";

type Props = { params: Promise<{ id: string }> };

/**
 * GET /api/seller/orders/[id]
 * Get order detail (seller view)
 * Seller can only view orders where sellerId === session.userId
 */
export async function GET(request: Request, { params }: Props) {
  try {
    const _session = await getSession();
    const session = await requireSeller(_session); // Seller-only access

    const { id } = await params;

    const order = await prisma.order.findUnique({
      where: { id },
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
        payment: true,
        shipment: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    // Ownership check: seller can only view their own sales
    if (order.sellerId !== session.userId) {
      return NextResponse.json(
        { error: "Forbidden: Not your order" },
        { status: 404 } // Return 404 to avoid leaking order existence
      );
    }

    return NextResponse.json(order);
  } catch (error) {
    console.error("GET /api/seller/orders/[id] error:", error);

    // Handle thrown NextResponse from requireSeller
    if (error instanceof NextResponse) {
      return error;
    }

    return NextResponse.json(
      { error: "Failed to fetch order" },
      { status: 500 }
    );
  }
}
