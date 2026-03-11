import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { requireSeller } from "@/lib/roleGuards";

export const runtime = "nodejs";

type Props = { params: Promise<{ id: string }> };

/**
 * PATCH /api/seller/products/[id]/images/reorder
 * Update image sort order for a seller's product
 *
 * Body: { imageIds: string[] }
 * - imageIds: ordered array of image IDs (index = sortOrder)
 */
export async function PATCH(request: Request, { params }: Props) {
  try {
    const session = await getSession();
    const seller = await requireSeller(session);
    const { id: productId } = await params;

    // Verify product belongs to this seller
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { sellerId: true },
    });

    if (!product || product.sellerId !== seller.userId) {
      return NextResponse.json(
        { error: "상품을 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    const body = await request.json();
    const { imageIds } = body as { imageIds: string[] };

    if (!Array.isArray(imageIds) || imageIds.length === 0) {
      return NextResponse.json(
        { error: "imageIds 배열이 필요합니다." },
        { status: 400 },
      );
    }

    // Verify all images belong to this product
    const images = await prisma.productImage.findMany({
      where: {
        id: { in: imageIds },
        productId,
      },
      select: { id: true },
    });

    const ownedIds = new Set(images.map((img) => img.id));
    const invalidIds = imageIds.filter((id) => !ownedIds.has(id));

    if (invalidIds.length > 0) {
      return NextResponse.json(
        { error: "일부 이미지를 찾을 수 없습니다." },
        { status: 400 },
      );
    }

    // Update sortOrder in a transaction
    await prisma.$transaction(
      imageIds.map((id, index) =>
        prisma.productImage.update({
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
    console.error("PATCH /api/seller/products/[id]/images/reorder error:", err);
    return NextResponse.json(
      { error: "이미지 순서 변경에 실패했습니다." },
      { status: 500 },
    );
  }
}
