import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { requireSeller } from "@/lib/roleGuards";

export const runtime = "nodejs";

/**
 * PATCH /api/seller/products/reorder
 * Update product sort order for seller's products
 *
 * Body: { productIds: string[] }
 * - productIds: ordered array of product IDs (index = sortOrder)
 * - Only the seller's own products are updated
 */
export async function PATCH(request: Request) {
  try {
    const session = await getSession();
    const seller = await requireSeller(session);

    const body = await request.json();
    const { productIds } = body as { productIds: string[] };

    if (!Array.isArray(productIds) || productIds.length === 0) {
      return NextResponse.json(
        { error: "productIds 배열이 필요합니다." },
        { status: 400 },
      );
    }

    if (productIds.length > 500) {
      return NextResponse.json(
        { error: "한 번에 최대 500개까지 정렬할 수 있습니다." },
        { status: 400 },
      );
    }

    // Verify all products belong to this seller
    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds },
        sellerId: seller.userId,
        isDeleted: false,
      },
      select: { id: true },
    });

    const ownedIds = new Set(products.map((p) => p.id));
    const invalidIds = productIds.filter((id) => !ownedIds.has(id));

    if (invalidIds.length > 0) {
      return NextResponse.json(
        { error: "일부 상품을 찾을 수 없습니다." },
        { status: 400 },
      );
    }

    // Update sortOrder in a transaction
    await prisma.$transaction(
      productIds.map((id, index) =>
        prisma.product.update({
          where: { id },
          data: { sortOrder: index },
        }),
      ),
    );

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    if (err instanceof NextResponse) {
      return err;
    }
    console.error("PATCH /api/seller/products/reorder error:", err);
    return NextResponse.json(
      { error: "정렬 순서 변경에 실패했습니다." },
      { status: 500 },
    );
  }
}
