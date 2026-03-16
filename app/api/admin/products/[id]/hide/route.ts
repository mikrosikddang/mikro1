import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/roleGuards";
import { createAdminActionLog } from "@/lib/adminActionLog";

type Params = Promise<{ id: string }>;

/**
 * POST /api/admin/products/[id]/hide
 * 관리자: 상품 숨기기 (isActive = false)
 */
export async function POST(req: NextRequest, { params }: { params: Params }) {
  try {
    const session = requireAdmin(await getSession());
    const { id } = await params;

    // 상품 존재 확인
    const product = await prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      return NextResponse.json({ error: "상품을 찾을 수 없습니다" }, { status: 404 });
    }

    // 이미 숨겨진 상품인지 확인
    if (!product.isActive) {
      return NextResponse.json({ error: "이미 숨겨진 상품입니다" }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id },
        data: { isActive: false },
      });

      await createAdminActionLog(tx, {
        adminId: session.userId,
        entityType: "PRODUCT",
        entityId: product.id,
        action: "PRODUCT_HIDDEN",
        summary: "상품 노출을 숨김 처리했습니다.",
        beforeJson: {
          title: product.title,
          isActive: product.isActive,
          isDeleted: product.isDeleted,
          sellerId: product.sellerId,
        },
        afterJson: {
          title: product.title,
          isActive: false,
          isDeleted: product.isDeleted,
          sellerId: product.sellerId,
        },
      });
    });

    return NextResponse.json({ success: true, message: "상품이 숨겨졌습니다" });
  } catch (error) {
    if (error instanceof NextResponse) {
      return error;
    }
    console.error("Error hiding product:", error);
    return NextResponse.json(
      { error: "상품 숨기기 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
