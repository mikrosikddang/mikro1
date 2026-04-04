import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SellerKind, SocialChannelType } from "@prisma/client";
import {
  isReservedStoreSlug,
  normalizeCreatorSlug,
  normalizeStoreSlug,
  validateSellerKindRequirements,
} from "@/lib/sellerTypes";
import { hasSellerPortalAccess } from "@/lib/sellerPortal";

/**
 * GET /api/seller/profile
 * 내 프로필 조회 (판매자 전용)
 */
export async function GET(req: NextRequest) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  }

  if (!(await hasSellerPortalAccess(session))) {
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

  if (!(await hasSellerPortalAccess(session))) {
    return NextResponse.json(
      { error: "판매자 권한이 필요합니다" },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const {
      shopName,
      storeSlug,
      bio,
      locationText,
      sellerKind,
      type,
      marketBuilding,
      floor,
      roomNo,
      managerPhone,
      csEmail,
      csPhone,
      csHours,
      avatarUrl,
      bizRegNo,
      bizRegImageUrl,
      mailOrderReportImageUrl,
      passbookImageUrl,
      instagramHandle,
      csKakaoId,
      csAddress,
      shippingGuide,
      exchangeGuide,
      refundGuide,
      etcGuide,
      settlementBank,
      settlementAccountNo,
      settlementAccountHolder,
      creatorSlug,
      socialChannelType,
      socialChannelUrl,
      followerCount,
      isBusinessSeller,
      commissionRateBps,
    } = body;

    const current = await prisma.sellerProfile.findUnique({
      where: { userId: session.userId },
    });

    if (!current) {
      return NextResponse.json(
        { error: "판매자 프로필을 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    const normalize = (value: unknown) => {
      if (typeof value !== "string") return null;
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : null;
    };

    // Validation
    if (shopName !== undefined && shopName !== null) {
      const trimmed = shopName.trim();
      if (trimmed.length === 0 || trimmed.length > 30) {
        return NextResponse.json(
          { error: "상점명은 1~30자여야 합니다" },
          { status: 400 }
        );
      }
    }

    const nextStoreSlug =
      storeSlug !== undefined ? normalizeStoreSlug(storeSlug ?? "") : current.storeSlug;
    if (!nextStoreSlug) {
      return NextResponse.json(
        { error: "상점 URL은 필수입니다" },
        { status: 400 }
      );
    }
    if (!/^[a-z0-9][a-z0-9-_]{1,39}$/.test(nextStoreSlug)) {
      return NextResponse.json(
        { error: "상점 URL은 영문 소문자, 숫자, -, _ 조합으로 2~40자여야 합니다" },
        { status: 400 }
      );
    }
    if (isReservedStoreSlug(nextStoreSlug)) {
      return NextResponse.json(
        { error: "사용할 수 없는 상점 URL입니다" },
        { status: 400 }
      );
    }

    if (bio !== undefined && bio && bio.length > 160) {
      return NextResponse.json(
        { error: "소개글은 160자 이하여야 합니다" },
        { status: 400 }
      );
    }

    if (locationText !== undefined && locationText && locationText.length > 60) {
      return NextResponse.json(
        { error: "위치는 60자 이하여야 합니다" },
        { status: 400 }
      );
    }

    if (type !== undefined && type && type.length > 30) {
      return NextResponse.json(
        { error: "상점 유형은 30자 이하여야 합니다" },
        { status: 400 }
      );
    }

    const nextSellerKind =
      sellerKind !== undefined ? (sellerKind as SellerKind) : current.sellerKind;
    if (!Object.values(SellerKind).includes(nextSellerKind)) {
      return NextResponse.json(
        { error: "올바른 입점 유형이 아닙니다" },
        { status: 400 }
      );
    }

    if (marketBuilding !== undefined && marketBuilding && marketBuilding.length > 40) {
      return NextResponse.json(
        { error: "상가명은 40자 이하여야 합니다" },
        { status: 400 }
      );
    }

    if (floor !== undefined && floor && floor.length > 20) {
      return NextResponse.json(
        { error: "층 정보는 20자 이하여야 합니다" },
        { status: 400 }
      );
    }

    if (roomNo !== undefined && roomNo && roomNo.length > 20) {
      return NextResponse.json(
        { error: "호수 정보는 20자 이하여야 합니다" },
        { status: 400 }
      );
    }

    if (managerPhone !== undefined && managerPhone && managerPhone.length > 30) {
      return NextResponse.json(
        { error: "담당자 전화번호는 30자 이하여야 합니다" },
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

    if (csPhone !== undefined && csPhone && csPhone.length > 30) {
      return NextResponse.json(
        { error: "전화번호는 30자 이하여야 합니다" },
        { status: 400 }
      );
    }

    if (csHours !== undefined && csHours && csHours.length > 40) {
      return NextResponse.json(
        { error: "운영시간은 40자 이하여야 합니다" },
        { status: 400 }
      );
    }

    if (bizRegNo !== undefined && bizRegNo) {
      const bizRegNoRegex = /^\d{3}-\d{2}-\d{5}$/;
      if (!bizRegNoRegex.test(bizRegNo.trim())) {
        return NextResponse.json(
          { error: "사업자등록번호는 000-00-00000 형식으로 입력해주세요" },
          { status: 400 }
        );
      }
    }

    if (instagramHandle !== undefined && instagramHandle && instagramHandle.trim().length > 80) {
      return NextResponse.json(
        { error: "인스타그램 계정은 80자 이하여야 합니다" },
        { status: 400 }
      );
    }

    const nextCreatorSlug =
      creatorSlug !== undefined
        ? normalizeCreatorSlug(creatorSlug ?? "")
        : current.creatorSlug;
    if (
      nextCreatorSlug &&
      !/^[a-z0-9][a-z0-9-_]{1,39}$/.test(nextCreatorSlug)
    ) {
      return NextResponse.json(
        { error: "크리에이터 슬러그는 영문 소문자, 숫자, -, _ 조합으로 2~40자여야 합니다" },
        { status: 400 }
      );
    }

    if (
      socialChannelType !== undefined &&
      socialChannelType !== null &&
      !Object.values(SocialChannelType).includes(socialChannelType as SocialChannelType)
    ) {
      return NextResponse.json(
        { error: "대표 SNS 채널 타입이 올바르지 않습니다" },
        { status: 400 }
      );
    }

    if (
      socialChannelUrl !== undefined &&
      socialChannelUrl &&
      !/^https?:\/\//.test(socialChannelUrl.trim())
    ) {
      return NextResponse.json(
        { error: "대표 SNS 채널 URL은 http 또는 https로 시작해야 합니다" },
        { status: 400 }
      );
    }

    if (
      followerCount !== undefined &&
      followerCount !== null &&
      (!Number.isFinite(followerCount) || followerCount < 0)
    ) {
      return NextResponse.json(
        { error: "팔로워 수는 0 이상 숫자로 입력해주세요" },
        { status: 400 }
      );
    }

    if (
      commissionRateBps !== undefined &&
      commissionRateBps !== null &&
      (!Number.isFinite(commissionRateBps) ||
        commissionRateBps < 0 ||
        commissionRateBps > 10000)
    ) {
      return NextResponse.json(
        { error: "수수료율은 0~10000bps 범위여야 합니다" },
        { status: 400 }
      );
    }

    if (nextCreatorSlug) {
      const existingSlug = await prisma.sellerProfile.findFirst({
        where: {
          creatorSlug: nextCreatorSlug,
          userId: { not: session.userId },
        },
        select: { id: true },
      });
      if (existingSlug) {
        return NextResponse.json(
          { error: "이미 사용 중인 크리에이터 슬러그입니다" },
          { status: 409 }
        );
      }
    }

    const existingStoreSlug = await prisma.sellerProfile.findFirst({
      where: {
        storeSlug: nextStoreSlug,
        userId: { not: session.userId },
      },
      select: { id: true },
    });
    if (existingStoreSlug) {
      return NextResponse.json(
        { error: "이미 사용 중인 상점 URL입니다" },
        { status: 409 }
      );
    }

    const nextSettlementBank =
      settlementBank !== undefined ? normalize(settlementBank) : normalize(current.settlementBank);
    const nextSettlementAccountNo =
      settlementAccountNo !== undefined ? normalize(settlementAccountNo) : normalize(current.settlementAccountNo);
    const nextSettlementAccountHolder =
      settlementAccountHolder !== undefined ? normalize(settlementAccountHolder) : normalize(current.settlementAccountHolder);

    const hasAnySettlementField =
      Boolean(nextSettlementBank) ||
      Boolean(nextSettlementAccountNo) ||
      Boolean(nextSettlementAccountHolder);

    if (
      hasAnySettlementField &&
      (!nextSettlementBank || !nextSettlementAccountNo || !nextSettlementAccountHolder)
    ) {
      return NextResponse.json(
        { error: "정산 계좌 정보는 은행/계좌번호/예금주를 모두 입력해주세요" },
        { status: 400 }
      );
    }

    if (nextSettlementBank && nextSettlementBank.length > 40) {
      return NextResponse.json(
        { error: "정산 은행명은 40자 이하여야 합니다" },
        { status: 400 }
      );
    }
    if (nextSettlementAccountNo && nextSettlementAccountNo.length > 60) {
      return NextResponse.json(
        { error: "정산 계좌번호는 60자 이하여야 합니다" },
        { status: 400 }
      );
    }
    if (nextSettlementAccountHolder && nextSettlementAccountHolder.length > 40) {
      return NextResponse.json(
        { error: "예금주명은 40자 이하여야 합니다" },
        { status: 400 }
      );
    }

    const nextBizRegNo = bizRegNo !== undefined ? normalize(bizRegNo) : normalize(current.bizRegNo);
    const nextBizRegImageUrl =
      bizRegImageUrl !== undefined ? normalize(bizRegImageUrl) : normalize(current.bizRegImageUrl);
    const nextMailOrderReportImageUrl =
      mailOrderReportImageUrl !== undefined
        ? normalize(mailOrderReportImageUrl)
        : normalize(current.mailOrderReportImageUrl);
    const nextPassbookImageUrl =
      passbookImageUrl !== undefined
        ? normalize(passbookImageUrl)
        : normalize(current.passbookImageUrl);
    const passbookTouched =
      passbookImageUrl !== undefined &&
      nextPassbookImageUrl !== normalize(current.passbookImageUrl);
    const settlementTouched =
      (settlementBank !== undefined && normalize(settlementBank) !== normalize(current.settlementBank)) ||
      (settlementAccountNo !== undefined &&
        normalize(settlementAccountNo) !== normalize(current.settlementAccountNo)) ||
      (settlementAccountHolder !== undefined &&
        normalize(settlementAccountHolder) !== normalize(current.settlementAccountHolder));
    const bizTouched =
      (bizRegNo !== undefined && nextBizRegNo !== normalize(current.bizRegNo)) ||
      (bizRegImageUrl !== undefined && nextBizRegImageUrl !== normalize(current.bizRegImageUrl)) ||
      (mailOrderReportImageUrl !== undefined &&
        nextMailOrderReportImageUrl !== normalize(current.mailOrderReportImageUrl)) ||
      (passbookImageUrl !== undefined &&
        nextPassbookImageUrl !== normalize(current.passbookImageUrl));
    const complianceTouched = settlementTouched || bizTouched;

    const kindValidation = validateSellerKindRequirements({
      sellerKind: nextSellerKind,
      marketBuilding:
        marketBuilding !== undefined
          ? normalize(marketBuilding)
          : normalize(current.marketBuilding),
      floor: floor !== undefined ? normalize(floor) : normalize(current.floor),
      roomNo: roomNo !== undefined ? normalize(roomNo) : normalize(current.roomNo),
      creatorSlug: nextCreatorSlug,
      socialChannelType:
        socialChannelType !== undefined
          ? (socialChannelType as SocialChannelType | null)
          : current.socialChannelType,
      socialChannelUrl:
        socialChannelUrl !== undefined
          ? normalize(socialChannelUrl)
          : normalize(current.socialChannelUrl),
    });
    if (kindValidation) {
      return NextResponse.json({ error: kindValidation }, { status: 400 });
    }

    // SellerProfile 업데이트
    const updated = await prisma.sellerProfile.update({
      where: { userId: session.userId },
      data: {
        ...(shopName !== undefined && { shopName: shopName?.trim() || null }),
        ...(storeSlug !== undefined && { storeSlug: nextStoreSlug }),
        ...(bio !== undefined && { bio: bio?.trim() || null }),
        ...(locationText !== undefined && { locationText: locationText?.trim() || null }),
        ...(sellerKind !== undefined && { sellerKind: nextSellerKind }),
        ...(type !== undefined && { type: type?.trim() || null }),
        ...(marketBuilding !== undefined && { marketBuilding: marketBuilding?.trim() || null }),
        ...(floor !== undefined && { floor: floor?.trim() || null }),
        ...(roomNo !== undefined && { roomNo: roomNo?.trim() || null }),
        ...(managerPhone !== undefined && { managerPhone: managerPhone?.trim() || null }),
        ...(csEmail !== undefined && { csEmail: csEmail?.trim() || null }),
        ...(csPhone !== undefined && { csPhone: csPhone?.trim() || null }),
        ...(csHours !== undefined && { csHours: csHours?.trim() || null }),
        ...(avatarUrl !== undefined && { avatarUrl }),
        ...(bizRegNo !== undefined && { bizRegNo: bizRegNo?.trim() || null }),
        ...(bizRegImageUrl !== undefined && { bizRegImageUrl: bizRegImageUrl?.trim() || null }),
        ...(mailOrderReportImageUrl !== undefined && {
          mailOrderReportImageUrl: mailOrderReportImageUrl?.trim() || null,
        }),
        ...(passbookImageUrl !== undefined && {
          passbookImageUrl: passbookImageUrl?.trim() || null,
        }),
        ...(instagramHandle !== undefined && {
          instagramHandle: instagramHandle?.trim().replace(/^@+/, "") || null,
        }),
        ...(csKakaoId !== undefined && { csKakaoId: csKakaoId?.trim() || null }),
        ...(csAddress !== undefined && { csAddress: csAddress?.trim() || null }),
        ...(shippingGuide !== undefined && { shippingGuide: shippingGuide?.trim() || null }),
        ...(exchangeGuide !== undefined && { exchangeGuide: exchangeGuide?.trim() || null }),
        ...(refundGuide !== undefined && { refundGuide: refundGuide?.trim() || null }),
        ...(etcGuide !== undefined && { etcGuide: etcGuide?.trim() || null }),
        ...(settlementBank !== undefined && { settlementBank: settlementBank?.trim() || null }),
        ...(settlementAccountNo !== undefined && {
          settlementAccountNo: settlementAccountNo?.trim() || null,
        }),
        ...(settlementAccountHolder !== undefined && {
          settlementAccountHolder: settlementAccountHolder?.trim() || null,
        }),
        ...(creatorSlug !== undefined && { creatorSlug: nextCreatorSlug || null }),
        ...(socialChannelType !== undefined && {
          socialChannelType: (socialChannelType as SocialChannelType | null) ?? null,
        }),
        ...(socialChannelUrl !== undefined && {
          socialChannelUrl: socialChannelUrl?.trim() || null,
        }),
        ...(followerCount !== undefined && {
          followerCount:
            followerCount === null || followerCount === ""
              ? null
              : Math.floor(Number(followerCount)),
        }),
        ...(isBusinessSeller !== undefined && {
          isBusinessSeller: true,
        }),
        ...(commissionRateBps !== undefined && {
          commissionRateBps: Math.floor(Number(commissionRateBps)),
        }),
        ...(bizTouched &&
          (nextBizRegNo || nextBizRegImageUrl) && { bizRegSubmittedAt: new Date() }),
        ...((settlementTouched || passbookTouched) &&
          (hasAnySettlementField || nextPassbookImageUrl) && { settlementSubmittedAt: new Date() }),
        ...(complianceTouched && { complianceReviewPending: true }),
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
