import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const runtime = "nodejs";

/**
 * POST /api/feed/hide
 * 피드에서 상품 숨기기
 * Body: { productId: string }
 */
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const body = await request.json();
    const { productId } = body as { productId: string };

    if (!productId || typeof productId !== "string") {
      return NextResponse.json(
        { error: "productId가 필요합니다." },
        { status: 400 },
      );
    }

    // Verify product exists
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true },
    });

    if (!product) {
      return NextResponse.json(
        { error: "상품을 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    // Upsert for idempotency
    await prisma.hiddenProduct.upsert({
      where: {
        userId_productId: {
          userId: session.userId,
          productId,
        },
      },
      create: {
        userId: session.userId,
        productId,
      },
      update: {},
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("POST /api/feed/hide error:", err);
    return NextResponse.json(
      { error: "숨기기에 실패했습니다." },
      { status: 500 },
    );
  }
}
