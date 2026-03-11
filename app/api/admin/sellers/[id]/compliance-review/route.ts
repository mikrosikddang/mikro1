import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, isAdmin } from "@/lib/auth";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(_request: NextRequest, context: RouteContext) {
  try {
    const session = await getSession();
    if (!session || !isAdmin(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await context.params;
    const seller = await prisma.sellerProfile.update({
      where: { id },
      data: {
        complianceReviewPending: false,
      },
      select: {
        id: true,
        complianceReviewPending: true,
      },
    });

    return NextResponse.json({ ok: true, seller });
  } catch (error: any) {
    console.error(
      "PATCH /api/admin/sellers/[id]/compliance-review error:",
      error,
    );
    if (error.code === "P2025") {
      return NextResponse.json(
        { error: "판매자 프로필을 찾을 수 없습니다" },
        { status: 404 },
      );
    }
    return NextResponse.json(
      { error: "검토 상태 변경에 실패했습니다" },
      { status: 500 },
    );
  }
}
