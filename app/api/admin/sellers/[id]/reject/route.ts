import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { requireAdmin } from "@/lib/roleGuards";
import { createAdminActionLog } from "@/lib/adminActionLog";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

interface RejectRequest {
  reason: string;
}

/**
 * POST /api/admin/sellers/[id]/reject
 * Reject a seller application
 *
 * Updates:
 * - SellerProfile.status = REJECTED
 * - SellerProfile.rejectedReason = reason
 * - User.role stays SELLER_PENDING (or could set back to CUSTOMER)
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
    const body = (await request.json()) as RejectRequest;

    if (!body.reason || body.reason.trim().length < 10) {
      return NextResponse.json(
        { error: "거부 사유는 최소 10자 이상이어야 합니다" },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const sellerProfile = await tx.sellerProfile.findUnique({
        where: { id },
      });

      if (!sellerProfile) {
        throw new Error("SELLER_NOT_FOUND");
      }

      if (sellerProfile.status === "REJECTED") {
        return {
          ok: true,
          alreadyRejected: true,
          sellerProfile,
        };
      }

      const updatedProfile = await tx.sellerProfile.update({
        where: { id },
        data: {
          status: "REJECTED",
          rejectedReason: body.reason.trim(),
        },
      });

      await tx.user.update({
        where: { id: sellerProfile.userId },
        data: { role: "CUSTOMER" },
      });

      await createAdminActionLog(tx, {
        adminId: session.userId,
        entityType: "SELLER",
        entityId: sellerProfile.id,
        action: "SELLER_REJECTED",
        summary: "판매자 신청을 반려했습니다.",
        reason: body.reason.trim(),
        beforeJson: {
          status: sellerProfile.status,
          rejectedReason: sellerProfile.rejectedReason,
        },
        afterJson: {
          status: "REJECTED",
          rejectedReason: body.reason.trim(),
          userRole: "CUSTOMER",
        },
      });

      return { ok: true, sellerProfile: updatedProfile };
    });

    return NextResponse.json(result);
  } catch (error: any) {
    if (error instanceof NextResponse) {
      return error;
    }
    if (error.message?.includes("SELLER_NOT_FOUND")) {
      return NextResponse.json(
        { error: "판매자 프로필을 찾을 수 없습니다" },
        { status: 404 }
      );
    }
    console.error("POST /api/admin/sellers/[id]/reject error:", error);
    return NextResponse.json(
      { error: "판매자 반려에 실패했습니다" },
      { status: 500 }
    );
  }
}
