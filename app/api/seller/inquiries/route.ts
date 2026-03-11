import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { requireSeller } from "@/lib/roleGuards";

export const runtime = "nodejs";

/**
 * GET /api/seller/inquiries
 * 셀러 대시보드 문의 목록 (내 상품에 달린 문의)
 *
 * Query:
 *   ?status=unanswered|answered|all (default: all)
 *   &cursor=<inquiryId>
 *   &limit=<number>
 */
export async function GET(req: NextRequest) {
  try {
    const _session = await getSession();
    const session = await requireSeller(_session);

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || "all";
    const cursor = searchParams.get("cursor");
    const limit = Math.min(Number(searchParams.get("limit")) || 20, 50);

    // Build filter conditions
    const whereBase: any = {
      product: { sellerId: session.userId },
    };

    if (status === "unanswered") {
      whereBase.answer = null;
    } else if (status === "answered") {
      whereBase.answer = { not: null };
    }

    // Fetch inquiries
    const inquiries = await prisma.inquiry.findMany({
      where: whereBase,
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(cursor
        ? {
            cursor: { id: cursor },
            skip: 1,
          }
        : {}),
      select: {
        id: true,
        question: true,
        answer: true,
        answeredAt: true,
        isSecret: true,
        createdAt: true,
        user: {
          select: { name: true },
        },
        product: {
          select: { id: true, title: true },
        },
      },
    });

    // Determine next cursor
    const hasMore = inquiries.length > limit;
    const items = hasMore ? inquiries.slice(0, limit) : inquiries;
    const nextCursor = hasMore ? items[items.length - 1].id : null;

    // Count unanswered for badge
    const unansweredCount = await prisma.inquiry.count({
      where: {
        product: { sellerId: session.userId },
        answer: null,
      },
    });

    const totalCount = await prisma.inquiry.count({
      where: { product: { sellerId: session.userId } },
    });

    return NextResponse.json({
      inquiries: items.map((inq) => ({
        id: inq.id,
        question: inq.question,
        answer: inq.answer,
        answeredAt: inq.answeredAt,
        isSecret: inq.isSecret,
        userName: inq.user.name || "구매자",
        productId: inq.product.id,
        productTitle: inq.product.title,
        createdAt: inq.createdAt,
      })),
      nextCursor,
      totalCount,
      unansweredCount,
    });
  } catch (error: any) {
    if (error instanceof NextResponse) throw error;

    console.error("GET /api/seller/inquiries error:", error);
    return NextResponse.json(
      { error: "문의 목록 조회 중 오류가 발생했습니다" },
      { status: 500 },
    );
  }
}
