import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { buildActiveCategoryTree } from "@/lib/activeCategories";
import { getCustomerVisibleProductWhere } from "@/lib/publicVisibility";

/**
 * GET /api/categories/active
 * 상품/포스팅이 1개 이상 존재하는 카테고리 트리 반환
 */
export async function GET() {
  try {
    const session = await getSession();
    let hiddenIds: string[] = [];
    if (session) {
      const hidden = await prisma.hiddenProduct.findMany({
        where: { userId: session.userId },
        select: { productId: true },
      });
      hiddenIds = hidden.map((h) => h.productId);
    }

    const result = await prisma.product.groupBy({
      by: ["categoryMain", "categoryMid", "categorySub"],
      where: getCustomerVisibleProductWhere({
        ...(hiddenIds.length > 0 ? { id: { notIn: hiddenIds } } : {}),
      }),
      _count: true,
    });

    return NextResponse.json(buildActiveCategoryTree(result));
  } catch (error) {
    console.error("Error fetching active categories:", error);
    return NextResponse.json(
      { error: "카테고리 조회 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
