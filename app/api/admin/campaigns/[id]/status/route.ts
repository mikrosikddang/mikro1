import { NextRequest, NextResponse } from "next/server";
import { CampaignStatus } from "@prisma/client";
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
    const body = (await request.json()) as { status?: CampaignStatus };
    const status = body.status;

    if (!status || !Object.values(CampaignStatus).includes(status)) {
      return NextResponse.json(
        { error: "올바른 캠페인 상태가 아닙니다" },
        { status: 400 },
      );
    }

    const campaign = await prisma.campaign.update({
      where: { id },
      data: { status },
      select: {
        id: true,
        status: true,
      },
    });

    return NextResponse.json({ ok: true, campaign });
  } catch (error: any) {
    console.error("PATCH /api/admin/campaigns/[id]/status error:", error);
    if (error.code === "P2025") {
      return NextResponse.json(
        { error: "캠페인을 찾을 수 없습니다" },
        { status: 404 },
      );
    }
    return NextResponse.json(
      { error: "캠페인 상태 변경에 실패했습니다" },
      { status: 500 },
    );
  }
}
