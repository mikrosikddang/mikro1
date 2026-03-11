import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { requireSeller } from "@/lib/roleGuards";

export const runtime = "nodejs";

/**
 * PATCH /api/seller/products/bulk
 * 일괄 상태 변경 (hide / show / delete)
 *
 * Body:
 * - productIds: string[]
 * - action: "hide" | "show" | "delete"
 */
export async function PATCH(req: NextRequest) {
  try {
    const _session = await getSession();
    const session = await requireSeller(_session);
    const sellerId = session.userId;

    const body = await req.json();
    const { productIds, action } = body as {
      productIds: string[];
      action: "hide" | "show" | "delete";
    };

    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return NextResponse.json(
        { error: "상품을 선택해주세요" },
        { status: 400 },
      );
    }

    if (!["hide", "show", "delete"].includes(action)) {
      return NextResponse.json(
        { error: "유효하지 않은 작업입니다" },
        { status: 400 },
      );
    }

    // 본인 상품만 대상
    const where = {
      id: { in: productIds },
      sellerId,
      isDeleted: false,
    };

    let data: { isActive?: boolean; isDeleted?: boolean } = {};
    switch (action) {
      case "hide":
        data = { isActive: false };
        break;
      case "show":
        data = { isActive: true };
        break;
      case "delete":
        data = { isDeleted: true };
        break;
    }

    const result = await prisma.product.updateMany({ where, data });

    return NextResponse.json({ updated: result.count });
  } catch (error) {
    console.error("PATCH /api/seller/products/bulk error:", error);

    if (error instanceof NextResponse) {
      return error;
    }

    return NextResponse.json(
      { error: "상품 일괄 변경에 실패했습니다" },
      { status: 500 },
    );
  }
}
