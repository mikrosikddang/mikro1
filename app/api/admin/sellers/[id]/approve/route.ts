import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { requireAdmin } from "@/lib/roleGuards";
import { createAdminActionLog } from "@/lib/adminActionLog";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/admin/sellers/[id]/approve
 * Approve a seller application
 *
 * Updates:
 * - SellerProfile.status = APPROVED
 * - User.role = SELLER_ACTIVE
 *
 * Auth: ADMIN only
 */
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const session = requireAdmin(await getSession());

    const { id } = await context.params;

    // Execute in transaction
    const result = await prisma.$transaction(async (tx) => {
      const sellerProfile = await tx.sellerProfile.findUnique({
        where: { id },
        include: { user: true },
      });

      if (!sellerProfile) {
        throw new Error("SELLER_NOT_FOUND");
      }

      if (sellerProfile.status === "APPROVED") {
        return { ok: true, alreadyApproved: true, sellerProfile };
      }

      // Update profile status
      const updatedProfile = await tx.sellerProfile.update({
        where: { id },
        data: {
          status: "APPROVED",
          rejectedReason: null,
          complianceReviewPending: false,
        },
      });

      // Update user role to SELLER_ACTIVE
      await tx.user.update({
        where: { id: sellerProfile.userId },
        data: { role: "SELLER_ACTIVE" },
      });

      await createAdminActionLog(tx, {
        adminId: session.userId,
        entityType: "SELLER",
        entityId: sellerProfile.id,
        action: "SELLER_APPROVED",
        summary: "판매자 신청을 승인했습니다.",
        beforeJson: {
          status: sellerProfile.status,
          rejectedReason: sellerProfile.rejectedReason,
          complianceReviewPending: sellerProfile.complianceReviewPending,
          userRole: sellerProfile.user.role,
        },
        afterJson: {
          status: "APPROVED",
          rejectedReason: null,
          complianceReviewPending: false,
          userRole: "SELLER_ACTIVE",
        },
      });

      return { ok: true, sellerProfile: updatedProfile };
    });

    return NextResponse.json(result);
  } catch (error: any) {
    if (error instanceof NextResponse) {
      return error;
    }
    if (error.message.includes("SELLER_NOT_FOUND")) {
      return NextResponse.json(
        { error: "판매자 프로필을 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    console.error("POST /api/admin/sellers/[id]/approve error:", error);
    return NextResponse.json(
      { error: "판매자 승인에 실패했습니다" },
      { status: 500 }
    );
  }
}
