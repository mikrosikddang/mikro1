import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, canAccessSellerFeatures } from "@/lib/auth";

export const runtime = "nodejs";

interface GetOrdersByIdsRequest {
  ids: string[];
}

/**
 * POST /api/orders/by-ids
 * Fetch multiple orders by IDs (ownership verified)
 */
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (canAccessSellerFeatures(session.role)) {
      return NextResponse.json(
        { error: "Sellers cannot access buyer orders via this endpoint" },
        { status: 403 }
      );
    }

    const body = (await request.json()) as GetOrdersByIdsRequest;

    // Validate ids
    if (!body.ids || !Array.isArray(body.ids)) {
      return NextResponse.json(
        { error: "ids must be an array" },
        { status: 400 }
      );
    }

    if (body.ids.length === 0 || body.ids.length > 20) {
      return NextResponse.json(
        { error: "ids array must contain 1-20 items" },
        { status: 400 }
      );
    }

    if (!body.ids.every((id) => typeof id === "string")) {
      return NextResponse.json(
        { error: "All ids must be strings" },
        { status: 400 }
      );
    }

    // Fetch orders with ownership check
    const orders = await prisma.order.findMany({
      where: {
        id: { in: body.ids },
        buyerId: session.userId,
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                title: true,
                priceKrw: true,
              },
            },
            variant: {
              select: {
                id: true,
                sizeLabel: true,
                color: true,
              },
            },
          },
        },
        seller: {
          include: {
            sellerProfile: {
              select: {
                shopName: true,
              },
            },
          },
        },
      },
    });

    // Check if all requested IDs were found
    if (orders.length !== body.ids.length) {
      return NextResponse.json(
        { error: "ORDER_NOT_FOUND" },
        { status: 404 }
      );
    }

    // Return orders in the same order as input ids
    const orderedResults = body.ids.map((id) =>
      orders.find((order) => order.id === id)
    );

    // Transform to response format
    const response = orderedResults.map((order) => ({
      id: order!.id,
      orderNo: order!.orderNo,
      status: order!.status,
      itemsSubtotalKrw: order!.itemsSubtotalKrw,
      shippingFeeKrw: order!.shippingFeeKrw,
      totalPayKrw: order!.totalPayKrw,
      createdAt: order!.createdAt,
      seller: {
        id: order!.sellerId,
        shopName: order!.seller.sellerProfile?.shopName || "알수없음",
      },
      items: order!.items.map((item) => ({
        id: item.id,
        quantity: item.quantity,
        unitPriceKrw: item.unitPriceKrw,
        product: {
          id: item.product.id,
          title: item.product.title,
        },
        variant: item.variant
          ? {
              id: item.variant.id,
              sizeLabel: item.variant.sizeLabel,
            }
          : null,
      })),
    }));

    return NextResponse.json({ ok: true, orders: response });
  } catch (error) {
    console.error("POST /api/orders/by-ids error:", error);
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 }
    );
  }
}
