import { NextRequest, NextResponse } from "next/server";
import { getSession, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = Promise<{ id: string }>;

/**
 * DELETE /api/admin/products/[id]
 * 관리자: 상품 삭제 (soft delete: isDeleted = true)
 */
export async function DELETE(req: NextRequest, { params }: { params: Params }) {
  const session = await getSession();

  // 관리자 권한 확인
  if (!session || !isAdmin(session.role)) {
    return NextResponse.json({ error: "관리자 권한이 필요합니다" }, { status: 403 });
  }

  const { id } = await params;

  try {
    // 상품 존재 확인
    const product = await prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      return NextResponse.json({ error: "상품을 찾을 수 없습니다" }, { status: 404 });
    }

    // 이미 삭제된 상품인지 확인
    if (product.isDeleted) {
      return NextResponse.json({ error: "이미 삭제된 상품입니다" }, { status: 400 });
    }

    // 상품 소프트 삭제 (isDeleted = true, isActive = false)
    await prisma.product.update({
      where: { id },
      data: {
        isDeleted: true,
        isActive: false,
      },
    });

    return NextResponse.json({ success: true, message: "상품이 삭제되었습니다" });
  } catch (error) {
    console.error("Error deleting product:", error);
    return NextResponse.json(
      { error: "상품 삭제 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
