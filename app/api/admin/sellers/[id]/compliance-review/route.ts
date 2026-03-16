import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { requireAdmin } from "@/lib/roleGuards";
import { createAdminActionLog } from "@/lib/adminActionLog";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(_request: NextRequest, context: RouteContext) {
  try {
    const session = requireAdmin(await getSession());

    const { id } = await context.params;
    const seller = await prisma.$transaction(async (tx) => {
      const sellerProfile = await tx.sellerProfile.findUnique({
        where: { id },
        select: {
          id: true,
          complianceReviewPending: true,
        },
      });

      if (!sellerProfile) {
        throw new Error("SELLER_NOT_FOUND");
      }

      if (!sellerProfile.complianceReviewPending) {
        return {
          id: sellerProfile.id,
          complianceReviewPending: false,
          alreadyCleared: true,
        };
      }

      const updatedSeller = await tx.sellerProfile.update({
        where: { id },
        data: {
          complianceReviewPending: false,
        },
        select: {
          id: true,
          complianceReviewPending: true,
        },
      });

      await createAdminActionLog(tx, {
        adminId: session.userId,
        entityType: "SELLER",
        entityId: sellerProfile.id,
        action: "SELLER_COMPLIANCE_REVIEW_CLEARED",
        summary: "판매자 운영 검토를 완료 처리했습니다.",
        beforeJson: {
          complianceReviewPending: true,
        },
        afterJson: {
          complianceReviewPending: false,
        },
      });

      return updatedSeller;
    });

    return NextResponse.json({ ok: true, seller });
  } catch (error: any) {
    if (error instanceof NextResponse) {
      return error;
    }
    console.error(
      "PATCH /api/admin/sellers/[id]/compliance-review error:",
      error,
    );
    if (error.message === "SELLER_NOT_FOUND" || error.code === "P2025") {
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
