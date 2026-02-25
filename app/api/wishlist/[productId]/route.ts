import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ productId: string }>;
}

/**
 * DELETE /api/wishlist/[productId]
 * 위시리스트에서 상품 삭제
 */
export async function DELETE(_req: NextRequest, context: RouteContext) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    const { productId } = await context.params;

    // Delete if exists (idempotent)
    await prisma.wishlist.deleteMany({
      where: {
        userId: session.userId,
        productId,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/wishlist/[productId] error:", error);
    return NextResponse.json(
      { error: "위시리스트 삭제 중 오류가 발생했습니다" },
      { status: 500 },
    );
  }
}
