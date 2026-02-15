import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, canAccessSellerFeatures } from "@/lib/auth";
import { OrderStatus } from "@prisma/client";

export const runtime = "nodejs";

interface DirectOrderRequest {
  variantId: string;
  quantity: number;
}

/**
 * POST /api/orders/direct
 *
 * Create order directly from product detail page (바로구매 flow).
 * Does NOT deduct stock - stock deduction happens during payment confirmation.
 *
 * Flow:
 * 1. Authenticate CUSTOMER
 * 2. Validate variant and product
 * 3. Calculate pricing server-side
 * 4. Create order + orderItem in transaction
 * 5. Return orderId for checkout redirect
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Authentication
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (canAccessSellerFeatures(session.role)) {
      return NextResponse.json(
        { error: "Sellers cannot create orders" },
        { status: 403 }
      );
    }

    // Parse request
    const body = (await request.json()) as DirectOrderRequest;

    if (!body.variantId || !body.quantity) {
      return NextResponse.json(
        { error: "variantId and quantity are required" },
        { status: 400 }
      );
    }

    if (body.quantity <= 0) {
      return NextResponse.json(
        { error: "Quantity must be greater than 0" },
        { status: 400 }
      );
    }

    // 2. Fetch variant with product and seller profile
    const variant = await prisma.productVariant.findUnique({
      where: { id: body.variantId },
      include: {
        product: {
          include: {
            seller: {
              include: {
                sellerProfile: true,
              },
            },
          },
        },
      },
    });

    if (!variant) {
      return NextResponse.json(
        { error: "Variant not found" },
        { status: 404 }
      );
    }

    const product = variant.product;

    // 3. Validate product
    if (product.isDeleted) {
      return NextResponse.json(
        { error: "Product has been deleted" },
        { status: 400 }
      );
    }

    if (!product.isActive) {
      return NextResponse.json(
        { error: "Product is not active" },
        { status: 400 }
      );
    }

    // Validate stock (pre-check, actual deduction happens during payment)
    if (variant.stock < body.quantity) {
      return NextResponse.json(
        {
          error: "OUT_OF_STOCK",
          message: `Requested ${body.quantity}, available ${variant.stock}`,
        },
        { status: 409 }
      );
    }

    // 4. Calculate pricing SERVER-SIDE
    const unitPriceKrw = product.priceKrw;
    const itemsSubtotalKrw = unitPriceKrw * body.quantity;

    const sellerProfile = product.seller.sellerProfile;
    const freeShippingThreshold = sellerProfile?.freeShippingThreshold ?? 50000;
    const baseShippingFee = sellerProfile?.shippingFeeKrw ?? 3000;

    const shippingFeeKrw =
      itemsSubtotalKrw >= freeShippingThreshold ? 0 : baseShippingFee;

    const totalPayKrw = itemsSubtotalKrw + shippingFeeKrw;

    // Calculate expiration: 30 minutes from now
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    // 5. Create order in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Generate order number
      const timestamp = Date.now().toString(36).toUpperCase();
      const random = Math.random().toString(36).substring(2, 6).toUpperCase();
      const orderNo = `ORD-${timestamp}-${random}`;

      // Create order
      const order = await tx.order.create({
        data: {
          orderNo,
          buyerId: session.userId,
          sellerId: product.sellerId,
          status: OrderStatus.PENDING,
          totalAmountKrw: itemsSubtotalKrw, // Legacy field
          itemsSubtotalKrw,
          shippingFeeKrw,
          totalPayKrw,
          expiresAt,
        },
      });

      // Create order item
      await tx.orderItem.create({
        data: {
          orderId: order.id,
          productId: product.id,
          variantId: variant.id,
          quantity: body.quantity,
          unitPriceKrw,
        },
      });

      // Create payment record
      await tx.payment.create({
        data: {
          orderId: order.id,
          amountKrw: totalPayKrw,
          method: "PENDING",
          status: "READY",
        },
      });

      return { orderId: order.id };
    });

    // 6. Return success
    return NextResponse.json({
      ok: true,
      orderId: result.orderId,
    });
  } catch (error: any) {
    console.error("[orders/direct] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create order" },
      { status: 500 }
    );
  }
}
