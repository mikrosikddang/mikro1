import { NextRequest, NextResponse } from "next/server";
import { CampaignStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { requireAdmin } from "@/lib/roleGuards";
import { createAdminActionLog } from "@/lib/adminActionLog";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

const ALLOWED_STATUS_TRANSITIONS: Record<CampaignStatus, CampaignStatus[]> = {
  DRAFT: ["ACTIVE", "ARCHIVED"],
  ACTIVE: ["ENDED", "ARCHIVED"],
  ENDED: ["ARCHIVED"],
  ARCHIVED: [],
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const session = requireAdmin(await getSession());

    const { id } = await context.params;
    const body = (await request.json()) as { status?: CampaignStatus };
    const status = body.status;

    if (!status || !Object.values(CampaignStatus).includes(status)) {
      return NextResponse.json(
        { error: "올바른 캠페인 상태가 아닙니다" },
        { status: 400 },
      );
    }

    const campaign = await prisma.$transaction(async (tx) => {
      const existingCampaign = await tx.campaign.findUnique({
        where: { id },
        select: {
          id: true,
          status: true,
          title: true,
        },
      });

      if (!existingCampaign) {
        throw new Error("CAMPAIGN_NOT_FOUND");
      }

      if (existingCampaign.status === status) {
        return { ok: true, campaign: existingCampaign, alreadyUpdated: true };
      }

      if (!ALLOWED_STATUS_TRANSITIONS[existingCampaign.status].includes(status)) {
        throw new Error("INVALID_TRANSITION");
      }

      const updatedCampaign = await tx.campaign.update({
        where: { id },
        data: { status },
        select: {
          id: true,
          status: true,
          title: true,
        },
      });

      await createAdminActionLog(tx, {
        adminId: session.userId,
        entityType: "CAMPAIGN",
        entityId: existingCampaign.id,
        action: "CAMPAIGN_STATUS_UPDATED",
        summary: "캠페인 상태를 변경했습니다.",
        beforeJson: {
          status: existingCampaign.status,
          title: existingCampaign.title,
        },
        afterJson: {
          status,
          title: existingCampaign.title,
        },
      });

      return { ok: true, campaign: updatedCampaign };
    });

    return NextResponse.json(campaign);
  } catch (error: unknown) {
    if (error instanceof NextResponse) {
      return error;
    }
    console.error("PATCH /api/admin/campaigns/[id]/status error:", error);
    if (error instanceof Error && error.message === "CAMPAIGN_NOT_FOUND") {
      return NextResponse.json(
        { error: "캠페인을 찾을 수 없습니다" },
        { status: 404 },
      );
    }
    if (error instanceof Error && error.message === "INVALID_TRANSITION") {
      return NextResponse.json(
        { error: "허용되지 않은 캠페인 상태 변경입니다" },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: "캠페인 상태 변경에 실패했습니다" },
      { status: 500 },
    );
  }
}
