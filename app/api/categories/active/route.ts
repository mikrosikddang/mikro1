import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/categories/active
 * 상품이 1개 이상 존재하는 categoryMain 목록 반환 (공개)
 */
export async function GET() {
  try {
    const result = await prisma.product.groupBy({
      by: ["categoryMain"],
      where: { isActive: true, isDeleted: false },
      _count: true,
    });

    const activeCategories = result
      .filter((r) => r._count > 0)
      .map((r) => r.categoryMain)
      .filter(Boolean);

    return NextResponse.json(activeCategories);
  } catch (error) {
    console.error("Error fetching active categories:", error);
    return NextResponse.json(
      { error: "카테고리 조회 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
