import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, isAdmin } from "@/lib/auth";

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
    const session = await getSession();
    if (!session || !isAdmin(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

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
        data: { status: "APPROVED", rejectedReason: null },
      });

      // Update user role to SELLER_ACTIVE
      await tx.user.update({
        where: { id: sellerProfile.userId },
        data: { role: "SELLER_ACTIVE" },
      });

      return { ok: true, sellerProfile: updatedProfile };
    });

    return NextResponse.json(result);
  } catch (error: any) {
    if (error.message.includes("SELLER_NOT_FOUND")) {
      return NextResponse.json(
        { error: "Seller not found" },
        { status: 404 }
      );
    }

    console.error("POST /api/admin/sellers/[id]/approve error:", error);
    return NextResponse.json(
      { error: "Failed to approve seller" },
      { status: 500 }
    );
  }
}
