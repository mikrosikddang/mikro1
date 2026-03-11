import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { requireBuyerFeatures } from "@/lib/roleGuards";
import { generateOrderNo } from "@/lib/order-utils";
import { OrderStatus } from "@prisma/client";
import {
  attachOrderAttributionAndCommission,
  readAttributionFromRequest,
} from "@/lib/attribution";

export const runtime = "nodejs";

interface CreateOrdersRequest {
  checkoutAttemptId: string;
  addressId: string;
}

/**
 * POST /api/checkout/create-orders
 * TRACK 3: Atomic cart-to-order creation with auto-cleanup and idempotency
 *
 * Responsibilities:
 * - Auto-delete invalid cart items (orphaned variants, deleted/inactive products)
 * - Server-side validation (stock, quantities, address)
 * - Snapshot pricing (items, shipping, total)
 * - Group by seller, create one Order per seller
 * - Idempotency via checkoutAttemptId
 * - NO stock deduction (happens in payment confirm)
 */
export async function POST(request: NextRequest) {
  try {
    const _session = await getSession();
    const session = requireBuyerFeatures(_session); // Now allows sellers to buy
    const attribution = readAttributionFromRequest(request);

    const body = (await request.json()) as CreateOrdersRequest;

    if (!body.checkoutAttemptId || !body.addressId) {
      return NextResponse.json(
        { error: "checkoutAttemptId and addressId are required" },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      // Step 1: Check idempotency - if orders already exist for this attempt, return them
      const existingOrders = await tx.order.findMany({
        where: {
          buyerId: session.userId,
          checkoutAttemptId: body.checkoutAttemptId,
        },
        include: {
          items: {
            include: {
              product: true,
              variant: true,
            },
          },
          seller: {
            include: {
              sellerProfile: true,
            },
          },
        },
      });

      if (existingOrders.length > 0) {
        return {
          ok: true,
          idempotent: true,
          orders: existingOrders,
          removedCartItems: [],
        };
      }

      // Step 2: Validate address
      const address = await tx.address.findUnique({
        where: { id: body.addressId },
      });

      if (!address) {
        throw new Error("ADDRESS_INVALID: Address not found");
      }

      if (address.userId !== session.userId) {
        throw new Error("ADDRESS_INVALID: Address does not belong to you");
      }

      // Step 3: Load all cart items
      const allCartItems = await tx.cartItem.findMany({
        where: { userId: session.userId },
        select: { id: true, variantId: true, quantity: true },
      });

      if (allCartItems.length === 0) {
        throw new Error("CART_EMPTY: No items in cart");
      }

      // Step 4: Auto-cleanup - find orphaned variants
      const variantIds = allCartItems.map((item) => item.variantId);
      const existingVariants = await tx.productVariant.findMany({
        where: { id: { in: variantIds } },
        select: { id: true },
      });

      const existingVariantIds = new Set(existingVariants.map((v) => v.id));
      const orphanedCartItemIds = allCartItems
        .filter((item) => !existingVariantIds.has(item.variantId))
        .map((item) => item.id);

      // Delete orphaned cart items
      if (orphanedCartItemIds.length > 0) {
        await tx.cartItem.deleteMany({
          where: { id: { in: orphanedCartItemIds } },
        });
      }

      // Step 5: Auto-cleanup - delete cart items with deleted/inactive products
      const deletedCartItems = await tx.cartItem.deleteMany({
        where: {
          userId: session.userId,
          OR: [
            { variant: { product: { isDeleted: true } } },
            { variant: { product: { isActive: false } } },
          ],
        },
      });

      const removedCount = orphanedCartItemIds.length + (deletedCartItems.count || 0);

      // Step 6: Fetch remaining valid cart items
      const validCartItems = await tx.cartItem.findMany({
        where: { userId: session.userId },
        include: {
          variant: {
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
          },
        },
      });

      if (validCartItems.length === 0) {
        throw new Error(
          removedCount > 0
            ? "CART_ITEM_INVALID_REMOVED: All cart items were invalid and removed"
            : "CART_EMPTY: No items in cart"
        );
      }

      // Step 7: Server-side validation
      for (const item of validCartItems) {
        if (!item.variant) {
          throw new Error(`CART_ITEM_INVALID: Variant not found for cart item ${item.id}`);
        }

        // PHASE 2: Block self-purchase (seller buying their own products)
        if (item.variant.product.sellerId === session.userId) {
          throw new Error(
            `SELF_PURCHASE_NOT_ALLOWED: 본인 상점의 상품은 구매할 수 없습니다. (${item.variant.product.title})`
          );
        }

        // Stock validation
        if (item.quantity > item.variant.stock) {
          throw new Error(
            `OUT_OF_STOCK: ${item.variant.product.title} (${item.variant.sizeLabel}): requested ${item.quantity}, available ${item.variant.stock}`
          );
        }
      }

      // Step 8: Group cart items by seller
      const itemsBySeller = new Map<string, typeof validCartItems>();
      for (const item of validCartItems) {
        const sellerId = item.variant.product.sellerId;
        if (!itemsBySeller.has(sellerId)) {
          itemsBySeller.set(sellerId, []);
        }
        itemsBySeller.get(sellerId)!.push(item);
      }

      // Step 9: Create orders grouped by seller
      const createdOrders = [];

      for (const [sellerId, items] of itemsBySeller.entries()) {
        const firstItem = items[0];
        const sellerProfile = firstItem.variant.product.seller.sellerProfile;

        // Calculate items subtotal (할인가 우선 적용)
        let itemsSubtotalKrw = 0;
        for (const item of items) {
          const effectivePrice = item.variant.product.salePriceKrw ?? item.variant.product.priceKrw;
          itemsSubtotalKrw += effectivePrice * item.quantity;
        }

        // Calculate shipping fee based on seller's rules
        let shippingFeeKrw = sellerProfile?.shippingFeeKrw ?? 3000;
        const freeShippingThreshold = sellerProfile?.freeShippingThreshold ?? 50000;

        if (itemsSubtotalKrw >= freeShippingThreshold) {
          shippingFeeKrw = 0;
        }

        const totalPayKrw = itemsSubtotalKrw + shippingFeeKrw;

        // Set expiration to 30 minutes from now
        const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

        // Create order with immutable snapshots
        const order = await tx.order.create({
          data: {
            orderNo: generateOrderNo(),
            buyerId: session.userId,
            sellerId,
            status: OrderStatus.PENDING,
            totalAmountKrw: itemsSubtotalKrw, // Legacy field
            itemsSubtotalKrw,
            shippingFeeKrw,
            totalPayKrw,
            shipToName: address.name,
            shipToPhone: address.phone,
            shipToZip: address.zipCode,
            shipToAddr1: address.addr1,
            shipToAddr2: address.addr2,
            checkoutAttemptId: body.checkoutAttemptId,
            expiresAt,
          },
        });

        await attachOrderAttributionAndCommission(
          tx,
          {
            id: order.id,
            sellerId,
            itemsSubtotalKrw,
            productIds: items.map((item) => item.variant.product.id),
          },
          attribution,
        );

        // Create order items with price snapshots
        for (const cartItem of items) {
          await tx.orderItem.create({
            data: {
              orderId: order.id,
              productId: cartItem.variant.product.id,
              variantId: cartItem.variantId,
              quantity: cartItem.quantity,
              unitPriceKrw: cartItem.variant.product.salePriceKrw ?? cartItem.variant.product.priceKrw, // Snapshot (할인가 우선)
            },
          });
        }

        // Fetch complete order with relations
        const completeOrder = await tx.order.findUnique({
          where: { id: order.id },
          include: {
            items: {
              include: {
                product: true,
                variant: true,
              },
            },
            seller: {
              include: {
                sellerProfile: true,
              },
            },
          },
        });

        createdOrders.push(completeOrder);
      }

      // Step 10: DO NOT delete cart items yet - they'll be cleared after payment success

      return {
        ok: true,
        idempotent: false,
        orders: createdOrders,
        removedCartItems: removedCount > 0 ? [`${removedCount} invalid items removed`] : [],
      };
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("POST /api/checkout/create-orders error:", error);

    if (error.message.includes("OUT_OF_STOCK")) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    if (error.message.includes("SELF_PURCHASE_NOT_ALLOWED")) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    if (error.message.includes("CART_ITEM_INVALID_REMOVED")) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    if (error.message.includes("CART_EMPTY")) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (error.message.includes("ADDRESS_INVALID")) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (
      error.message.includes("not found") ||
      error.message.includes("required")
    ) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "주문 생성 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
