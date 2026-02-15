import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { requireBuyerFeatures } from "@/lib/roleGuards";

export const runtime = "nodejs";

interface AddToCartRequest {
  variantId: string;
  quantity: number;
}

/**
 * GET /api/cart
 * Get all cart items for current user (CUSTOMER only)
 * Automatically removes invalid items (deleted/inactive products)
 */
export async function GET() {
  try {
    const _session = await getSession();
    const session = requireBuyerFeatures(_session); // Now allows sellers to buy

    const items = await prisma.$transaction(async (tx) => {
      // Step 1: Auto-cleanup invalid cart items
      // Get all cart items to check for orphaned variants
      const allCartItems = await tx.cartItem.findMany({
        where: { userId: session.userId },
        select: { id: true, variantId: true },
      });

      // Check which variants still exist
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

      // Delete cart items with deleted/inactive products
      await tx.cartItem.deleteMany({
        where: {
          userId: session.userId,
          OR: [
            // Product is deleted
            {
              variant: {
                product: {
                  isDeleted: true,
                },
              },
            },
            // Product is inactive
            {
              variant: {
                product: {
                  isActive: false,
                },
              },
            },
          ],
        },
      });

      // Step 2: Fetch remaining valid cart items
      return await tx.cartItem.findMany({
        where: { userId: session.userId },
        include: {
          variant: {
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
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });
    });

    return NextResponse.json(items);
  } catch (error) {
    console.error("GET /api/cart error:", error);
    return NextResponse.json(
      { error: "Failed to fetch cart" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/cart
 * Add item to cart or update quantity if exists
 */
export async function POST(request: Request) {
  try {
    const _session = await getSession();
    const session = requireBuyerFeatures(_session); // Now allows sellers to buy

    const body = (await request.json()) as AddToCartRequest;

    if (!body.variantId || !body.quantity || body.quantity < 1) {
      return NextResponse.json(
        { error: "Invalid variantId or quantity" },
        { status: 400 }
      );
    }

    const item = await prisma.$transaction(async (tx) => {
      // Validate variant and product
      const variant = await tx.productVariant.findUnique({
        where: { id: body.variantId },
        include: {
          product: true,
        },
      });

      if (!variant) {
        throw new Error("Variant not found");
      }

      if (variant.product.isDeleted || !variant.product.isActive) {
        throw new Error("Product is not available");
      }

      // Check if item already exists in cart
      const existing = await tx.cartItem.findUnique({
        where: {
          userId_variantId: {
            userId: session.userId,
            variantId: body.variantId,
          },
        },
      });

      if (existing) {
        const newQuantity = existing.quantity + body.quantity;

        if (newQuantity > variant.stock) {
          throw new Error(
            `OUT_OF_STOCK: Requested ${newQuantity}, available ${variant.stock}`
          );
        }

        return await tx.cartItem.update({
          where: { id: existing.id },
          data: { quantity: newQuantity },
          include: {
            variant: {
              include: {
                product: {
                  include: {
                    images: {
                      where: { kind: "MAIN" },
                      take: 1,
                    },
                  },
                },
              },
            },
          },
        });
      } else {
        if (body.quantity > variant.stock) {
          throw new Error(
            `OUT_OF_STOCK: Requested ${body.quantity}, available ${variant.stock}`
          );
        }

        return await tx.cartItem.create({
          data: {
            userId: session.userId,
            variantId: body.variantId,
            quantity: body.quantity,
          },
          include: {
            variant: {
              include: {
                product: {
                  include: {
                    images: {
                      where: { kind: "MAIN" },
                      take: 1,
                    },
                  },
                },
              },
            },
          },
        });
      }
    });

    return NextResponse.json({ ok: true, item });
  } catch (error: any) {
    console.error("POST /api/cart error:", error);

    if (error.message.includes("OUT_OF_STOCK")) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    if (
      error.message.includes("not found") ||
      error.message.includes("not available")
    ) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Failed to add to cart" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/cart
 * Clear all cart items for current user
 */
export async function DELETE() {
  try {
    const _session = await getSession();
    const session = requireBuyerFeatures(_session); // Now allows sellers to buy

    await prisma.cartItem.deleteMany({
      where: { userId: session.userId },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/cart error:", error);
    return NextResponse.json(
      { error: "Failed to clear cart" },
      { status: 500 }
    );
  }
}
