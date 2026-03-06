import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getPublicProductWhere } from "@/lib/publicVisibility";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/products/[id]/inquiries
 * 상품별 문의 목록 (공개, 커서 기반 페이지네이션)
 * 비밀글은 작성자와 셀러만 내용 확인 가능
 *
 * Query: ?cursor=<inquiryId>&limit=<number>
 */
export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const { id: productId } = await context.params;
    const { searchParams } = new URL(req.url);
    const cursor = searchParams.get("cursor");
    const limit = Math.min(Number(searchParams.get("limit")) || 20, 50);

    // Get current user session (optional, for secret inquiry visibility)
    const session = await getSession();

    // Verify product exists and get sellerId
    const product = await prisma.product.findFirst({
      where: getPublicProductWhere({ id: productId }),
      select: { id: true, sellerId: true },
    });

    if (!product) {
      return NextResponse.json(
        { error: "상품을 찾을 수 없습니다" },
        { status: 404 },
      );
    }

    // Fetch inquiries with cursor pagination
    const inquiries = await prisma.inquiry.findMany({
      where: { productId },
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
        userId: true,
        createdAt: true,
        user: {
          select: { name: true },
        },
      },
    });

    // Determine next cursor
    const hasMore = inquiries.length > limit;
    const items = hasMore ? inquiries.slice(0, limit) : inquiries;
    const nextCursor = hasMore ? items[items.length - 1].id : null;

    // Process inquiries (mask names, hide secret content)
    const processedInquiries = items.map((inq) => {
      const isOwner = session?.userId === inq.userId;
      const isSeller = session?.userId === product.sellerId;
      const canView = !inq.isSecret || isOwner || isSeller;

      return {
        id: inq.id,
        question: canView ? inq.question : "비밀글입니다.",
        answer: canView ? inq.answer : inq.answer ? "비밀글입니다." : null,
        answeredAt: inq.answeredAt,
        isSecret: inq.isSecret,
        isMine: isOwner,
        userName: maskName(inq.user.name),
        createdAt: inq.createdAt,
      };
    });

    // Total count
    const totalCount = await prisma.inquiry.count({
      where: { productId },
    });

    return NextResponse.json({
      inquiries: processedInquiries,
      nextCursor,
      totalCount,
    });
  } catch (error) {
    console.error("GET /api/products/[id]/inquiries error:", error);
    return NextResponse.json(
      { error: "문의 조회 중 오류가 발생했습니다" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/products/[id]/inquiries
 * 상품 문의 작성 (로그인 필수)
 *
 * Body: { question: string, isSecret?: boolean }
 */
export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    const { id: productId } = await context.params;
    const body = await req.json();
    const { question, isSecret } = body as {
      question?: string;
      isSecret?: boolean;
    };

    // Validate question
    if (!question || typeof question !== "string" || question.trim().length === 0) {
      return NextResponse.json(
        { error: "문의 내용을 입력해주세요" },
        { status: 400 },
      );
    }

    if (question.trim().length > 1000) {
      return NextResponse.json(
        { error: "문의 내용은 1000자 이내로 입력해주세요" },
        { status: 400 },
      );
    }

    // Verify product exists and is active
    const product = await prisma.product.findFirst({
      where: getPublicProductWhere({ id: productId }),
      select: { id: true },
    });

    if (!product) {
      return NextResponse.json(
        { error: "상품을 찾을 수 없습니다" },
        { status: 404 },
      );
    }

    // Create inquiry (strip HTML tags for XSS prevention)
    const inquiry = await prisma.inquiry.create({
      data: {
        userId: session.userId,
        productId,
        question: stripHtml(question.trim()),
        isSecret: Boolean(isSecret),
      },
    });

    return NextResponse.json({ ok: true, inquiry });
  } catch (error: any) {
    console.error("POST /api/products/[id]/inquiries error:", error);
    return NextResponse.json(
      { error: "문의 작성 중 오류가 발생했습니다" },
      { status: 500 },
    );
  }
}

/** 이름 마스킹: "홍길동" → "홍**", null → "구매자" */
function maskName(name: string | null): string {
  if (!name || name.length === 0) return "구매자";
  if (name.length === 1) return `${name}*`;
  return `${name[0]}${"*".repeat(name.length - 1)}`;
}

/** Strip HTML tags to prevent XSS */
function stripHtml(text: string): string {
  return text.replace(/<[^>]*>/g, "");
}
