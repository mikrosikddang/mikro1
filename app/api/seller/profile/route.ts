import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canAccessSellerFeatures } from "@/lib/roles";

/**
 * GET /api/seller/profile
 * 내 프로필 조회 (판매자 전용)
 */
export async function GET(req: NextRequest) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  }

  if (!canAccessSellerFeatures(session.role)) {
    return NextResponse.json(
      { error: "판매자 권한이 필요합니다" },
      { status: 403 }
    );
  }

  try {
    const profile = await prisma.sellerProfile.findUnique({
      where: { userId: session.userId },
    });

    if (!profile) {
      return NextResponse.json(
        { error: "판매자 프로필을 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    return NextResponse.json(profile);
  } catch (error) {
    console.error("Error fetching seller profile:", error);
    return NextResponse.json(
      { error: "프로필 조회 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/seller/profile
 * 내 프로필 수정 (판매자 전용)
 */
export async function PATCH(req: NextRequest) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  }

  if (!canAccessSellerFeatures(session.role)) {
    return NextResponse.json(
      { error: "판매자 권한이 필요합니다" },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const { shopName, bio, locationText, csEmail, csPhone, csHours, avatarUrl, bizRegNo, csKakaoId, csAddress, shippingGuide, exchangeGuide, refundGuide, etcGuide } = body;

    // Validation
    if (shopName !== undefined) {
      const trimmed = shopName.trim();
      if (trimmed.length === 0 || trimmed.length > 30) {
        return NextResponse.json(
          { error: "상점명은 1~30자여야 합니다" },
          { status: 400 }
        );
      }
    }

    if (bio !== undefined && bio.length > 160) {
      return NextResponse.json(
        { error: "소개글은 160자 이하여야 합니다" },
        { status: 400 }
      );
    }

    if (locationText !== undefined && locationText.length > 60) {
      return NextResponse.json(
        { error: "위치는 60자 이하여야 합니다" },
        { status: 400 }
      );
    }

    if (csEmail !== undefined && csEmail) {
      // 간단한 이메일 형식 검증
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(csEmail)) {
        return NextResponse.json(
          { error: "올바른 이메일 형식이 아닙니다" },
          { status: 400 }
        );
      }
    }

    if (csPhone !== undefined && csPhone.length > 30) {
      return NextResponse.json(
        { error: "전화번호는 30자 이하여야 합니다" },
        { status: 400 }
      );
    }

    if (csHours !== undefined && csHours.length > 40) {
      return NextResponse.json(
        { error: "운영시간은 40자 이하여야 합니다" },
        { status: 400 }
      );
    }

    // SellerProfile 업데이트
    const updated = await prisma.sellerProfile.update({
      where: { userId: session.userId },
      data: {
        ...(shopName !== undefined && { shopName: shopName.trim() }),
        ...(bio !== undefined && { bio: bio.trim() || null }),
        ...(locationText !== undefined && { locationText: locationText.trim() || null }),
        ...(csEmail !== undefined && { csEmail: csEmail.trim() || null }),
        ...(csPhone !== undefined && { csPhone: csPhone.trim() || null }),
        ...(csHours !== undefined && { csHours: csHours.trim() || null }),
        ...(avatarUrl !== undefined && { avatarUrl }),
        ...(bizRegNo !== undefined && { bizRegNo: bizRegNo?.trim() || null }),
        ...(csKakaoId !== undefined && { csKakaoId: csKakaoId?.trim() || null }),
        ...(csAddress !== undefined && { csAddress: csAddress?.trim() || null }),
        ...(shippingGuide !== undefined && { shippingGuide: shippingGuide?.trim() || null }),
        ...(exchangeGuide !== undefined && { exchangeGuide: exchangeGuide?.trim() || null }),
        ...(refundGuide !== undefined && { refundGuide: refundGuide?.trim() || null }),
        ...(etcGuide !== undefined && { etcGuide: etcGuide?.trim() || null }),
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Error updating seller profile:", error);

    // Prisma not found error
    if (error.code === "P2025") {
      return NextResponse.json(
        { error: "판매자 프로필을 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: "프로필 수정 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
