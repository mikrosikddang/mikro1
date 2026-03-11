import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, isAdmin } from "@/lib/auth";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const session = await getSession();
    if (!session || !isAdmin(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await context.params;
    const body = (await request.json()) as { commissionRateBps?: number };
    const commissionRateBps = Number(body.commissionRateBps);

    if (
      !Number.isFinite(commissionRateBps) ||
      commissionRateBps < 0 ||
      commissionRateBps > 10000
    ) {
      return NextResponse.json(
        { error: "수수료율은 0~10000bps 범위여야 합니다" },
        { status: 400 },
      );
    }

    const updated = await prisma.sellerProfile.update({
      where: { id },
      data: {
        commissionRateBps: Math.floor(commissionRateBps),
      },
      select: {
        id: true,
        commissionRateBps: true,
      },
    });

    return NextResponse.json({ ok: true, seller: updated });
  } catch (error: any) {
    console.error("PATCH /api/admin/sellers/[id]/commission error:", error);
    if (error.code === "P2025") {
      return NextResponse.json(
        { error: "판매자 프로필을 찾을 수 없습니다" },
        { status: 404 },
      );
    }
    return NextResponse.json(
      { error: "수수료율 변경에 실패했습니다" },
      { status: 500 },
    );
  }
}
