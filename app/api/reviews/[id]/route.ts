import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * DELETE /api/reviews/[id]
 * 본인 리뷰 삭제
 */
export async function DELETE(
  _req: NextRequest,
  context: RouteContext,
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
    }

    const { id } = await context.params;

    const review = await prisma.review.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!review) {
      return NextResponse.json({ error: "리뷰를 찾을 수 없습니다" }, { status: 404 });
    }

    if (review.userId !== session.userId) {
      return NextResponse.json(
        { error: "본인의 리뷰만 삭제할 수 있습니다" },
        { status: 403 },
      );
    }

    await prisma.review.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/reviews/[id] error:", error);
    return NextResponse.json(
      { error: "리뷰 삭제 중 오류가 발생했습니다" },
      { status: 500 },
    );
  }
}
