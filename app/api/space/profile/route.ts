import { NextRequest, NextResponse } from "next/server";
import { SocialChannelType } from "@prisma/client";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureUserSpaceProfile } from "@/lib/userSpace";
import { isReservedStoreSlug, normalizeStoreSlug } from "@/lib/sellerTypes";

function normalizeString(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  }

  try {
    const profile = await ensureUserSpaceProfile(prisma, {
      id: session.userId,
      name: session.name,
      email: session.email,
    });
    return NextResponse.json(profile);
  } catch (error) {
    console.error("GET /api/space/profile error:", error);
    return NextResponse.json(
      { error: "공간 정보를 불러오지 못했습니다" },
      { status: 500 },
    );
  }
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const current = await ensureUserSpaceProfile(prisma, {
      id: session.userId,
      name: session.name,
      email: session.email,
    });

    const {
      shopName,
      storeSlug,
      bio,
      locationText,
      avatarUrl,
      socialChannelType,
      socialChannelUrl,
      csEmail,
      csPhone,
      csHours,
    } = body;

    if (shopName !== undefined) {
      const trimmed = typeof shopName === "string" ? shopName.trim() : "";
      if (!trimmed || trimmed.length > 30) {
        return NextResponse.json(
          { error: "공간 이름은 1~30자여야 합니다" },
          { status: 400 },
        );
      }
    }

    const nextStoreSlug =
      storeSlug !== undefined
        ? normalizeStoreSlug(storeSlug ?? "")
        : current.storeSlug;

    if (!nextStoreSlug) {
      return NextResponse.json({ error: "공간 주소는 필수입니다" }, { status: 400 });
    }
    if (!/^[a-z0-9][a-z0-9-_]{1,39}$/.test(nextStoreSlug)) {
      return NextResponse.json(
        { error: "공간 주소는 영문 소문자, 숫자, -, _ 조합으로 2~40자여야 합니다" },
        { status: 400 },
      );
    }
    if (isReservedStoreSlug(nextStoreSlug)) {
      return NextResponse.json(
        { error: "사용할 수 없는 공간 주소입니다" },
        { status: 400 },
      );
    }

    if (bio !== undefined && typeof bio === "string" && bio.length > 160) {
      return NextResponse.json(
        { error: "소개글은 160자 이하여야 합니다" },
        { status: 400 },
      );
    }

    if (
      locationText !== undefined &&
      typeof locationText === "string" &&
      locationText.length > 60
    ) {
      return NextResponse.json(
        { error: "위치 문구는 60자 이하여야 합니다" },
        { status: 400 },
      );
    }

    if (csEmail !== undefined && normalizeString(csEmail)) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(String(csEmail).trim())) {
        return NextResponse.json(
          { error: "올바른 이메일 형식이 아닙니다" },
          { status: 400 },
        );
      }
    }

    if (
      socialChannelType !== undefined &&
      socialChannelType !== null &&
      !Object.values(SocialChannelType).includes(socialChannelType as SocialChannelType)
    ) {
      return NextResponse.json(
        { error: "대표 SNS 채널 타입이 올바르지 않습니다" },
        { status: 400 },
      );
    }

    if (
      socialChannelUrl !== undefined &&
      normalizeString(socialChannelUrl) &&
      !/^https?:\/\//.test(String(socialChannelUrl).trim())
    ) {
      return NextResponse.json(
        { error: "대표 SNS 채널 URL은 http 또는 https로 시작해야 합니다" },
        { status: 400 },
      );
    }

    const existingSlug = await prisma.sellerProfile.findFirst({
      where: {
        storeSlug: nextStoreSlug,
        userId: { not: session.userId },
      },
      select: { id: true },
    });
    if (existingSlug) {
      return NextResponse.json(
        { error: "이미 사용 중인 공간 주소입니다" },
        { status: 409 },
      );
    }

    const updated = await prisma.sellerProfile.update({
      where: { userId: session.userId },
      data: {
        ...(shopName !== undefined && { shopName: String(shopName).trim() }),
        ...(storeSlug !== undefined && { storeSlug: nextStoreSlug }),
        ...(bio !== undefined && { bio: normalizeString(bio) }),
        ...(locationText !== undefined && { locationText: normalizeString(locationText) }),
        ...(avatarUrl !== undefined && { avatarUrl: normalizeString(avatarUrl) }),
        ...(socialChannelType !== undefined && {
          socialChannelType: (socialChannelType as SocialChannelType | null) ?? null,
        }),
        ...(socialChannelUrl !== undefined && {
          socialChannelUrl: normalizeString(socialChannelUrl),
        }),
        ...(csEmail !== undefined && { csEmail: normalizeString(csEmail) }),
        ...(csPhone !== undefined && { csPhone: normalizeString(csPhone) }),
        ...(csHours !== undefined && { csHours: normalizeString(csHours) }),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PATCH /api/space/profile error:", error);
    return NextResponse.json(
      { error: "공간 정보 저장에 실패했습니다" },
      { status: 500 },
    );
  }
}
