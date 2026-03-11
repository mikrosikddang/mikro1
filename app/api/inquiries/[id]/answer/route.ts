import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { requireSeller } from "@/lib/roleGuards";
import { notifyInquiryAnswer } from "@/lib/notifications";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * PATCH /api/inquiries/[id]/answer
 * 문의 답변 작성/수정 (해당 상품의 셀러만)
 *
 * Body: { answer: string }
 */
export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const _session = await getSession();
    const session = await requireSeller(_session);

    const { id: inquiryId } = await context.params;
    const body = await req.json();
    const { answer } = body as { answer?: string };

    // Validate answer
    if (!answer || typeof answer !== "string" || answer.trim().length === 0) {
      return NextResponse.json(
        { error: "답변 내용을 입력해주세요" },
        { status: 400 },
      );
    }

    if (answer.trim().length > 2000) {
      return NextResponse.json(
        { error: "답변 내용은 2000자 이내로 입력해주세요" },
        { status: 400 },
      );
    }

    // Fetch inquiry with product info
    const inquiry = await prisma.inquiry.findUnique({
      where: { id: inquiryId },
      include: {
        product: {
          select: { id: true, sellerId: true, title: true },
        },
      },
    });

    if (!inquiry) {
      return NextResponse.json(
        { error: "문의를 찾을 수 없습니다" },
        { status: 404 },
      );
    }

    // Verify the seller owns this product
    if (inquiry.product.sellerId !== session.userId) {
      return NextResponse.json(
        { error: "본인 상품의 문의만 답변할 수 있습니다" },
        { status: 403 },
      );
    }

    // Update inquiry with answer (strip HTML tags for XSS prevention)
    const updated = await prisma.inquiry.update({
      where: { id: inquiryId },
      data: {
        answer: stripHtml(answer.trim()),
        answeredBy: session.userId,
        answeredAt: new Date(),
      },
    });

    // Notify inquiry author (fire-and-forget)
    notifyInquiryAnswer(
      inquiry.userId,
      inquiry.product.title,
      inquiry.product.id,
    );

    return NextResponse.json({ ok: true, inquiry: updated });
  } catch (error: any) {
    // Catch NextResponse thrown by requireSeller
    if (error instanceof NextResponse) throw error;

    console.error("PATCH /api/inquiries/[id]/answer error:", error);
    return NextResponse.json(
      { error: "답변 작성 중 오류가 발생했습니다" },
      { status: 500 },
    );
  }
}

/** Strip HTML tags to prevent XSS */
function stripHtml(text: string): string {
  return text.replace(/<[^>]*>/g, "");
}
