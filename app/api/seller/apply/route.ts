import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { isAdmin } from "@/lib/roles";
import { SellerApprovalStatus } from "@prisma/client";

export const runtime = "nodejs";

interface SellerApplyRequest {
  shopName: string;
  type: string;
  marketBuilding?: string;
  floor?: string;
  roomNo?: string;
  managerPhone: string;
  bizRegImageUrl?: string;
  bizRegNo?: string | null;
  csKakaoId?: string | null;
  csPhone?: string | null;
  csEmail?: string | null;
  csAddress?: string;
  csHours?: string;
  shippingGuide?: string;
  exchangeGuide?: string;
  refundGuide?: string;
  etcGuide?: string | null;
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
      role: session.role,
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

    const userIsAdmin = isAdmin(session.role);

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

    if (!body.marketBuilding?.trim()) {
      return NextResponse.json(
        { error: "상가명은 필수입니다." },
        { status: 400 }
      );
    }

    if (!body.floor?.trim()) {
      return NextResponse.json(
        { error: "층은 필수입니다." },
        { status: 400 }
      );
    }

    if (!body.roomNo?.trim()) {
      return NextResponse.json(
        { error: "호수는 필수입니다." },
        { status: 400 }
      );
    }

    if (!body.managerPhone?.trim()) {
      return NextResponse.json(
        { error: "담당자 전화번호는 필수입니다." },
        { status: 400 }
      );
    }

    // CS contact: at least one of csKakaoId, csPhone, csEmail must be provided
    const hasCs = body.csKakaoId?.trim() || body.csPhone?.trim() || body.csEmail?.trim();
    if (!hasCs) {
      return NextResponse.json(
        { error: "CS 연락처는 필수입니다." },
        { status: 400 }
      );
    }

    if (!body.csAddress?.trim()) {
      return NextResponse.json(
        { error: "CS 주소는 필수입니다." },
        { status: 400 }
      );
    }

    if (!body.csHours?.trim()) {
      return NextResponse.json(
        { error: "상담 시간은 필수입니다." },
        { status: 400 }
      );
    }

    if (!body.shippingGuide?.trim()) {
      return NextResponse.json(
        { error: "배송 안내는 필수입니다." },
        { status: 400 }
      );
    }

    if (!body.exchangeGuide?.trim()) {
      return NextResponse.json(
        { error: "교환/반품 안내는 필수입니다." },
        { status: 400 }
      );
    }

    if (!body.refundGuide?.trim()) {
      return NextResponse.json(
        { error: "환불 안내는 필수입니다." },
        { status: 400 }
      );
    }

    const profileData = {
      shopName: body.shopName.trim(),
      type: body.type.trim(),
      marketBuilding: body.marketBuilding.trim(),
      floor: body.floor.trim(),
      roomNo: body.roomNo.trim(),
      managerPhone: body.managerPhone.trim(),
      bizRegNo: body.bizRegNo?.trim() || null,
      bizRegImageUrl: body.bizRegImageUrl?.trim() || null,
      csKakaoId: body.csKakaoId?.trim() || null,
      csPhone: body.csPhone?.trim() || null,
      csEmail: body.csEmail?.trim() || null,
      csAddress: body.csAddress.trim(),
      csHours: body.csHours.trim(),
      shippingGuide: body.shippingGuide.trim(),
      exchangeGuide: body.exchangeGuide.trim(),
      refundGuide: body.refundGuide.trim(),
      etcGuide: body.etcGuide?.trim() || null,
    };

    const result = await prisma.$transaction(async (tx) => {
      const profile = await tx.sellerProfile.upsert({
        where: { userId: session.userId },
        create: {
          userId: session.userId,
          ...profileData,
          status: SellerApprovalStatus.APPROVED,
        },
        update: {
          ...profileData,
          status: SellerApprovalStatus.APPROVED,
        },
      });

      // Update user role to SELLER_ACTIVE (auto-approved)
      // ADMIN keeps their role — only creates sellerProfile
      if (!userIsAdmin) {
        await tx.user.update({
          where: { id: session.userId },
          data: { role: "SELLER_ACTIVE" },
        });
      }

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
