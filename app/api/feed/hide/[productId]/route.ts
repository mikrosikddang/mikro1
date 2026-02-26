import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const runtime = "nodejs";

type Props = { params: Promise<{ productId: string }> };

/**
 * DELETE /api/feed/hide/[productId]
 * 피드 숨기기 해제
 */
export async function DELETE(_request: Request, { params }: Props) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const { productId } = await params;

    // deleteMany for idempotency (no error if not found)
    await prisma.hiddenProduct.deleteMany({
      where: {
        userId: session.userId,
        productId,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/feed/hide/[productId] error:", err);
    return NextResponse.json(
      { error: "숨기기 해제에 실패했습니다." },
      { status: 500 },
    );
  }
}
