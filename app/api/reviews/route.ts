import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { requireBuyerFeatures } from "@/lib/roleGuards";
import { OrderStatus } from "@prisma/client";

export const runtime = "nodejs";

/**
 * POST /api/reviews
 * 리뷰 작성 (로그인 필수, COMPLETED 주문만, 중복 방지)
 *
 * Body: { orderItemId, productId, rating (1-5), content? }
 */
export async function POST(req: NextRequest) {
  try {
    const _session = await getSession();
    const session = requireBuyerFeatures(_session);

    const body = await req.json();
    const { orderItemId, productId, rating, content } = body as {
      orderItemId?: string;
      productId?: string;
      rating?: number;
      content?: string;
    };

    // Validation
    if (!orderItemId || !productId) {
      return NextResponse.json(
        { error: "주문 항목과 상품 정보는 필수입니다" },
        { status: 400 },
      );
    }

    if (typeof rating !== "number" || rating < 1 || rating > 5 || !Number.isInteger(rating)) {
      return NextResponse.json(
        { error: "별점은 1~5 사이의 정수여야 합니다" },
        { status: 400 },
      );
    }

    if (content && content.length > 2000) {
      return NextResponse.json(
        { error: "리뷰는 2000자 이내로 작성해주세요" },
        { status: 400 },
      );
    }

    // Verify orderItem exists and belongs to the user's COMPLETED order
    const orderItem = await prisma.orderItem.findUnique({
      where: { id: orderItemId },
      include: {
        order: { select: { buyerId: true, status: true } },
      },
    });

    if (!orderItem) {
      return NextResponse.json(
        { error: "주문 항목을 찾을 수 없습니다" },
        { status: 404 },
      );
    }

    if (orderItem.order.buyerId !== session.userId) {
      return NextResponse.json(
        { error: "본인의 주문에만 리뷰를 작성할 수 있습니다" },
        { status: 403 },
      );
    }

    if (orderItem.order.status !== OrderStatus.COMPLETED) {
      return NextResponse.json(
        { error: "구매 확정된 주문에만 리뷰를 작성할 수 있습니다" },
        { status: 400 },
      );
    }

    if (orderItem.productId !== productId) {
      return NextResponse.json(
        { error: "주문 항목과 상품이 일치하지 않습니다" },
        { status: 400 },
      );
    }

    // Check duplicate
    const existing = await prisma.review.findUnique({
      where: { userId_orderItemId: { userId: session.userId, orderItemId } },
    });

    if (existing) {
      return NextResponse.json(
        { error: "이미 리뷰를 작성하셨습니다" },
        { status: 409 },
      );
    }

    // Create review (strip HTML tags for XSS prevention)
    const review = await prisma.review.create({
      data: {
        userId: session.userId,
        productId,
        orderItemId,
        rating,
        content: content ? stripHtml(content.trim()) || null : null,
      },
    });

    return NextResponse.json({ ok: true, review });
  } catch (error: any) {
    // Catch NextResponse thrown by requireBuyerFeatures
    if (error instanceof NextResponse) throw error;

    console.error("POST /api/reviews error:", error);
    return NextResponse.json(
      { error: "리뷰 작성 중 오류가 발생했습니다" },
      { status: 500 },
    );
  }
}

/** Strip HTML tags to prevent XSS */
function stripHtml(text: string): string {
  return text.replace(/<[^>]*>/g, "");
}
