import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * DELETE /api/inquiries/[id]
 * 문의 삭제 (작성자 본인, 미답변 건만)
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

    const { id: inquiryId } = await context.params;

    const inquiry = await prisma.inquiry.findUnique({
      where: { id: inquiryId },
      select: { id: true, userId: true, answer: true },
    });

    if (!inquiry) {
      return NextResponse.json(
        { error: "문의를 찾을 수 없습니다" },
        { status: 404 },
      );
    }

    if (inquiry.userId !== session.userId) {
      return NextResponse.json(
        { error: "본인의 문의만 삭제할 수 있습니다" },
        { status: 403 },
      );
    }

    if (inquiry.answer) {
      return NextResponse.json(
        { error: "답변이 등록된 문의는 삭제할 수 없습니다" },
        { status: 400 },
      );
    }

    await prisma.inquiry.delete({
      where: { id: inquiryId },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/inquiries/[id] error:", error);
    return NextResponse.json(
      { error: "문의 삭제 중 오류가 발생했습니다" },
      { status: 500 },
    );
  }
}
