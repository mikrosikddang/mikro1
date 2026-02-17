import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, isAdmin } from "@/lib/auth";

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
    const session = await getSession();
    if (!session || !isAdmin(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await context.params;
    const body = (await request.json()) as RejectRequest;

    if (!body.reason || body.reason.trim().length < 10) {
      return NextResponse.json(
        { error: "Rejection reason must be at least 10 characters" },
        { status: 400 }
      );
    }

    const sellerProfile = await prisma.sellerProfile.findUnique({
      where: { id },
    });

    if (!sellerProfile) {
      return NextResponse.json(
        { error: "Seller not found" },
        { status: 404 }
      );
    }

    if (sellerProfile.status === "REJECTED") {
      return NextResponse.json({
        ok: true,
        alreadyRejected: true,
        sellerProfile,
      });
    }

    // Update profile status and set reason
    const updatedProfile = await prisma.sellerProfile.update({
      where: { id },
      data: {
        status: "REJECTED",
        rejectedReason: body.reason.trim(),
      },
    });

    return NextResponse.json({ ok: true, sellerProfile: updatedProfile });
  } catch (error) {
    console.error("POST /api/admin/sellers/[id]/reject error:", error);
    return NextResponse.json(
      { error: "Failed to reject seller" },
      { status: 500 }
    );
  }
}
