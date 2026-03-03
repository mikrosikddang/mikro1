import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/user/me
 * 현재 로그인 유저 정보 반환
 */
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        name: true,
        email: true,
        phone: true,
        provider: true,
        password: true,
        kakaoId: true,
        naverId: true,
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "사용자를 찾을 수 없습니다" }, { status: 404 });
    }

    return NextResponse.json({
      name: user.name,
      email: user.email,
      phone: user.phone,
      provider: user.provider,
      hasPassword: !!user.password,
      kakaoId: !!user.kakaoId,
      naverId: !!user.naverId,
      createdAt: user.createdAt,
    });
  } catch (error) {
    console.error("GET /api/user/me error:", error);
    return NextResponse.json(
      { error: "사용자 정보 조회 중 오류가 발생했습니다" },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/user/me
 * 기본 정보 수정 (name, email, phone)
 */
export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, email, phone } = body;

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { provider: true },
    });

    if (!user) {
      return NextResponse.json({ error: "사용자를 찾을 수 없습니다" }, { status: 404 });
    }

    // 소셜 로그인 유저는 이메일 변경 불가
    if (email !== undefined && user.provider !== "email") {
      return NextResponse.json(
        { error: "소셜 로그인 계정은 이메일을 변경할 수 없습니다" },
        { status: 400 },
      );
    }

    // 이메일 중복 체크
    if (email !== undefined && email !== null) {
      const trimmed = email.trim();
      if (trimmed) {
        const existing = await prisma.user.findFirst({
          where: { email: trimmed, id: { not: session.userId } },
        });
        if (existing) {
          return NextResponse.json(
            { error: "이미 사용 중인 이메일입니다" },
            { status: 409 },
          );
        }
      }
    }

    // 전화번호 중복 체크 (하이픈 제거)
    let normalizedPhone: string | null | undefined = undefined;
    if (phone !== undefined) {
      normalizedPhone = phone ? phone.replace(/-/g, "").trim() || null : null;
      if (normalizedPhone) {
        const existing = await prisma.user.findFirst({
          where: { phone: normalizedPhone, id: { not: session.userId } },
        });
        if (existing) {
          return NextResponse.json(
            { error: "이미 사용 중인 전화번호입니다" },
            { status: 409 },
          );
        }
      }
    }

    const updated = await prisma.user.update({
      where: { id: session.userId },
      data: {
        ...(name !== undefined && { name: name?.trim() || null }),
        ...(email !== undefined && { email: email?.trim() || null }),
        ...(normalizedPhone !== undefined && { phone: normalizedPhone }),
      },
      select: {
        name: true,
        email: true,
        phone: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PATCH /api/user/me error:", error);
    return NextResponse.json(
      { error: "사용자 정보 수정 중 오류가 발생했습니다" },
      { status: 500 },
    );
  }
}
