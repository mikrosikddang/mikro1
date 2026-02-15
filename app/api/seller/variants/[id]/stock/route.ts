import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { requireSeller } from "@/lib/roleGuards";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const _session = await getSession();
    const session = requireSeller(_session);

    const { id: variantId } = await params;

    // Parse and validate delta
    const body = await req.json();
    const { delta } = body as { delta?: number };

    if (typeof delta !== "number" || !Number.isInteger(delta) || delta === 0) {
      return NextResponse.json(
        { ok: false, message: "BAD_REQUEST" },
        { status: 400 },
      );
    }

    // Fetch variant + owning product
    const variant = await prisma.productVariant.findUnique({
      where: { id: variantId },
      include: { product: { select: { sellerId: true } } },
    });

    if (!variant) {
      return NextResponse.json(
        { ok: false, message: "NOT_FOUND" },
        { status: 404 },
      );
    }

    // Ownership check
    if (variant.product.sellerId !== session.userId) {
      return NextResponse.json(
        { ok: false, message: "FORBIDDEN" },
        { status: 403 },
      );
    }

    // Atomic update
    if (delta > 0) {
      // Increment — always safe
      const updated = await prisma.productVariant.update({
        where: { id: variantId },
        data: { stock: { increment: delta } },
      });
      return NextResponse.json({ ok: true, variant: { id: updated.id, stock: updated.stock } });
    }

    // Decrement — must guard against negative stock
    const n = Math.abs(delta);
    const result = await prisma.productVariant.updateMany({
      where: { id: variantId, stock: { gte: n } },
      data: { stock: { decrement: n } },
    });

    if (result.count === 0) {
      return NextResponse.json(
        { ok: false, message: "OUT_OF_STOCK" },
        { status: 409 },
      );
    }

    // Fetch updated stock value
    const updated = await prisma.productVariant.findUnique({
      where: { id: variantId },
      select: { id: true, stock: true },
    });

    return NextResponse.json({ ok: true, variant: updated });
  } catch (err) {
    console.error("variant stock update error:", err);
    return NextResponse.json(
      { ok: false, message: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}
