import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  buildCookieOptions,
  getSession,
  signSession,
  type Session,
} from "@/lib/auth";
import { isAdmin } from "@/lib/roles";
import {
  SellerApprovalStatus,
  SellerKind,
  SocialChannelType,
} from "@prisma/client";
import {
  buildDefaultCreatorSlug,
  defaultCommissionRateBps,
  isReservedStoreSlug,
  needsCreatorProfile,
  normalizeCreatorSlug,
  normalizeStoreSlug,
  validateSellerKindRequirements,
} from "@/lib/sellerTypes";

export const runtime = "nodejs";

interface SellerApplyRequest {
  shopName: string;
  storeSlug: string;
  sellerKind: SellerKind;
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
  creatorSlug?: string | null;
  socialChannelType?: SocialChannelType | null;
  socialChannelUrl?: string | null;
  followerCount?: number | null;
  isBusinessSeller?: boolean;
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
    const normalize = (value?: string | null) => {
      const trimmed = value?.trim();
      return trimmed ? trimmed : null;
    };
    const sellerKind = body.sellerKind ?? SellerKind.WHOLESALE_STORE;
    const storeSlug = normalizeStoreSlug(body.storeSlug ?? "");
    const creatorSlug =
      needsCreatorProfile(sellerKind)
        ? normalize(body.creatorSlug) != null
          ? normalizeCreatorSlug(body.creatorSlug!)
          : buildDefaultCreatorSlug(body.shopName)
        : null;

    // Validation
    if (!body.shopName?.trim()) {
      return NextResponse.json(
        { error: "상점명은 필수입니다." },
        { status: 400 }
      );
    }

    if (!storeSlug) {
      return NextResponse.json(
        { error: "상점 URL은 필수입니다." },
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

    const kindValidation = validateSellerKindRequirements({
      sellerKind,
      marketBuilding: normalize(body.marketBuilding),
      floor: normalize(body.floor),
      roomNo: normalize(body.roomNo),
      creatorSlug: creatorSlug || null,
      socialChannelType: body.socialChannelType ?? null,
      socialChannelUrl: normalize(body.socialChannelUrl),
    });

    if (kindValidation) {
      return NextResponse.json({ error: kindValidation }, { status: 400 });
    }

    if (creatorSlug && !/^[a-z0-9][a-z0-9-_]{1,39}$/.test(creatorSlug)) {
      return NextResponse.json(
        { error: "슬러그는 영문 소문자, 숫자, -, _ 조합으로 2~40자여야 합니다." },
        { status: 400 }
      );
    }

    if (!/^[a-z0-9][a-z0-9-_]{1,39}$/.test(storeSlug)) {
      return NextResponse.json(
        { error: "상점 URL은 영문 소문자, 숫자, -, _ 조합으로 2~40자여야 합니다." },
        { status: 400 }
      );
    }

    if (isReservedStoreSlug(storeSlug)) {
      return NextResponse.json(
        { error: "사용할 수 없는 상점 URL입니다." },
        { status: 400 }
      );
    }

    if (
      body.followerCount != null &&
      (!Number.isFinite(body.followerCount) || body.followerCount < 0)
    ) {
      return NextResponse.json(
        { error: "팔로워 수는 0 이상 숫자로 입력해주세요." },
        { status: 400 }
      );
    }

    if (normalize(body.socialChannelUrl) && !/^https?:\/\//.test(body.socialChannelUrl!.trim())) {
      return NextResponse.json(
        { error: "SNS 채널 URL은 http 또는 https로 시작해야 합니다." },
        { status: 400 }
      );
    }

    const existingSlug = creatorSlug
      ? await prisma.sellerProfile.findFirst({
          where: {
            creatorSlug,
            userId: { not: session.userId },
          },
          select: { id: true },
        })
      : null;

    const existingStoreSlug = await prisma.sellerProfile.findFirst({
      where: {
        storeSlug,
        userId: { not: session.userId },
      },
      select: { id: true },
    });

    if (existingSlug) {
      return NextResponse.json(
        { error: "이미 사용 중인 크리에이터 슬러그입니다." },
        { status: 409 }
      );
    }

    if (existingStoreSlug) {
      return NextResponse.json(
        { error: "이미 사용 중인 상점 URL입니다." },
        { status: 409 }
      );
    }

    const profileData = {
      shopName: body.shopName.trim(),
      storeSlug,
      sellerKind,
      type: body.type.trim(),
      marketBuilding: normalize(body.marketBuilding),
      floor: normalize(body.floor),
      roomNo: normalize(body.roomNo),
      managerPhone: body.managerPhone.trim(),
      bizRegNo: normalize(body.bizRegNo),
      bizRegImageUrl: normalize(body.bizRegImageUrl),
      csKakaoId: normalize(body.csKakaoId),
      csPhone: normalize(body.csPhone),
      csEmail: normalize(body.csEmail),
      csAddress: body.csAddress.trim(),
      csHours: body.csHours.trim(),
      shippingGuide: body.shippingGuide.trim(),
      exchangeGuide: body.exchangeGuide.trim(),
      refundGuide: body.refundGuide.trim(),
      etcGuide: normalize(body.etcGuide),
      creatorSlug: creatorSlug || null,
      socialChannelType: body.socialChannelType ?? null,
      socialChannelUrl: normalize(body.socialChannelUrl),
      followerCount:
        body.followerCount != null ? Math.floor(body.followerCount) : null,
      isBusinessSeller: body.isBusinessSeller ?? true,
      commissionRateBps: defaultCommissionRateBps(sellerKind),
      ...(normalize(body.bizRegNo) || normalize(body.bizRegImageUrl)
        ? { bizRegSubmittedAt: new Date(), complianceReviewPending: true }
        : {}),
    };

    const result = await prisma.$transaction(async (tx) => {
      const profile = await tx.sellerProfile.upsert({
        where: { userId: session.userId },
        create: {
          userId: session.userId,
          ...profileData,
          status: SellerApprovalStatus.PENDING,
          rejectedReason: null,
        },
        update: {
          ...profileData,
          status: SellerApprovalStatus.PENDING,
          rejectedReason: null,
        },
      });

      // ADMIN keeps their role — only creates sellerProfile
      if (!userIsAdmin) {
        await tx.user.update({
          where: { id: session.userId },
          data: { role: "SELLER_PENDING" },
        });
      }

      return profile;
    });

    const response = NextResponse.json({
      ok: true,
      profile: result,
      nextStatus: SellerApprovalStatus.PENDING,
    });

    if (!userIsAdmin) {
      const nextSession: Session = {
        ...session,
        role: "SELLER_PENDING",
      };
      const token = signSession(nextSession);
      const cookie = buildCookieOptions(token);
      response.cookies.set(cookie.name, cookie.value, {
        httpOnly: cookie.httpOnly,
        sameSite: cookie.sameSite,
        secure: cookie.secure,
        path: cookie.path,
        maxAge: cookie.maxAge,
      });
    }

    return response;
  } catch (error) {
    console.error("POST /api/seller/apply error:", error);
    return NextResponse.json(
      { error: "Failed to submit application" },
      { status: 500 }
    );
  }
}
