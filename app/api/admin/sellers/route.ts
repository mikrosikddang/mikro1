import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, isAdmin } from "@/lib/auth";
import { SellerApprovalStatus } from "@prisma/client";

export const runtime = "nodejs";

/**
 * GET /api/admin/sellers
 * List all sellers with optional status filter
 *
 * Query params:
 * - status: PENDING | APPROVED | REJECTED (optional)
 *
 * Auth: ADMIN only
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !isAdmin(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get("status");

    // Build filter
    const where: any = {};
    if (statusParam && ["PENDING", "APPROVED", "REJECTED"].includes(statusParam)) {
      where.status = statusParam as SellerApprovalStatus;
    }

    const sellers = await prisma.sellerProfile.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            phone: true,
            name: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ sellers });
  } catch (error) {
    console.error("GET /api/admin/sellers error:", error);
    return NextResponse.json(
      { error: "Failed to fetch sellers" },
      { status: 500 }
    );
  }
}
