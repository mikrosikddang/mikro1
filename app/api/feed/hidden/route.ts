import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const runtime = "nodejs";

/**
 * GET /api/feed/hidden
 * 숨긴 상품 ID 목록 (피드 필터용)
 * Returns: { productIds: string[] }
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ productIds: [] });
    }

    const hidden = await prisma.hiddenProduct.findMany({
      where: { userId: session.userId },
      select: { productId: true },
    });

    return NextResponse.json({
      productIds: hidden.map((h) => h.productId),
    });
  } catch (err) {
    console.error("GET /api/feed/hidden error:", err);
    return NextResponse.json({ productIds: [] });
  }
}
