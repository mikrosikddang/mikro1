import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { SellerApprovalStatus } from "@prisma/client";

export const runtime = "nodejs";

interface SellerApplyRequest {
  shopName: string;
  type: string;
  marketBuilding?: string;
  floor?: string;
  roomNo?: string;
  managerPhone: string;
  csEmail: string;
}

/**
 * GET /api/seller/apply
 * Get current user's seller profile status
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await prisma.sellerProfile.findUnique({
      where: { userId: session.userId },
    });

    return NextResponse.json({
      exists: !!profile,
      profile: profile || null,
    });
  } catch (error) {
    console.error("GET /api/seller/apply error:", error);
    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/seller/apply
 * Apply to become a seller (create or update seller profile)
 */
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as SellerApplyRequest;

    // Validation
    if (!body.shopName?.trim()) {
      return NextResponse.json(
        { error: "상점명은 필수입니다." },
        { status: 400 }
      );
    }

    if (!body.type?.trim()) {
      return NextResponse.json(
        { error: "상점 유형은 필수입니다." },
        { status: 400 }
      );
    }

    if (!body.managerPhone?.trim()) {
      return NextResponse.json(
        { error: "담당자 전화번호는 필수입니다." },
        { status: 400 }
      );
    }

    if (!body.csEmail?.trim()) {
      return NextResponse.json(
        { error: "고객센터 이메일은 필수입니다." },
        { status: 400 }
      );
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.csEmail)) {
      return NextResponse.json(
        { error: "유효한 이메일 주소를 입력해주세요." },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      // Upsert seller profile
      const profile = await tx.sellerProfile.upsert({
        where: { userId: session.userId },
        create: {
          userId: session.userId,
          shopName: body.shopName.trim(),
          type: body.type.trim(),
          marketBuilding: body.marketBuilding?.trim() || null,
          floor: body.floor?.trim() || null,
          roomNo: body.roomNo?.trim() || null,
          managerPhone: body.managerPhone.trim(),
          csEmail: body.csEmail.trim(),
          status: SellerApprovalStatus.APPROVED,
        },
        update: {
          shopName: body.shopName.trim(),
          type: body.type.trim(),
          marketBuilding: body.marketBuilding?.trim() || null,
          floor: body.floor?.trim() || null,
          roomNo: body.roomNo?.trim() || null,
          managerPhone: body.managerPhone.trim(),
          csEmail: body.csEmail.trim(),
          status: SellerApprovalStatus.APPROVED, // Auto-approve immediately
        },
      });

      // Update user role to SELLER_ACTIVE (auto-approved)
      await tx.user.update({
        where: { id: session.userId },
        data: { role: "SELLER_ACTIVE" },
      });

      return profile;
    });

    return NextResponse.json({
      ok: true,
      profile: result,
    });
  } catch (error) {
    console.error("POST /api/seller/apply error:", error);
    return NextResponse.json(
      { error: "Failed to submit application" },
      { status: 500 }
    );
  }
}
