import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { requireBuyerFeatures } from "@/lib/roleGuards";

export const runtime = "nodejs";

type Props = { params: Promise<{ id: string }> };

interface UpdateCartItemRequest {
  quantity: number;
}

/**
 * PATCH /api/cart/[id]
 * Update cart item quantity
 */
export async function PATCH(request: Request, { params }: Props) {
  try {
    const _session = await getSession();
    const session = requireBuyerFeatures(_session); // Now allows sellers to buy

    const { id } = await params;
    const body = (await request.json()) as UpdateCartItemRequest;

    if (!body.quantity || body.quantity < 1) {
      return NextResponse.json(
        { error: "Quantity must be at least 1" },
        { status: 400 }
      );
    }

    const item = await prisma.$transaction(async (tx) => {
      // Check ownership
      const existing = await tx.cartItem.findUnique({
        where: { id },
        include: {
          variant: {
            include: {
              product: true,
            },
          },
        },
      });

      if (!existing) {
        throw new Error("Cart item not found");
      }

      if (existing.userId !== session.userId) {
        throw new Error("Forbidden");
      }

      // Check stock
      if (body.quantity > existing.variant.stock) {
        throw new Error(
          `OUT_OF_STOCK: Requested ${body.quantity}, available ${existing.variant.stock}`
        );
      }

      return await tx.cartItem.update({
        where: { id },
        data: { quantity: body.quantity },
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
    });

    return NextResponse.json({ ok: true, item });
  } catch (error: any) {
    console.error("PATCH /api/cart/[id] error:", error);

    if (error.message.includes("OUT_OF_STOCK")) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    if (error.message.includes("Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    if (error.message.includes("not found")) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json(
      { error: "Failed to update cart item" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/cart/[id]
 * Remove cart item
 */
export async function DELETE(request: Request, { params }: Props) {
  try {
    const _session = await getSession();
    const session = requireBuyerFeatures(_session); // Now allows sellers to buy

    const { id } = await params;

    // Check ownership
    const existing = await prisma.cartItem.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Cart item not found" },
        { status: 404 }
      );
    }

    if (existing.userId !== session.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.cartItem.delete({
      where: { id },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/cart/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to delete cart item" },
      { status: 500 }
    );
  }
}
