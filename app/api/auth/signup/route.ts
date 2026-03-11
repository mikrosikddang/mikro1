import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signSession, buildCookieOptions } from "@/lib/auth";
import type { Session } from "@/lib/auth";
import {
  readAttributionFromRequest,
  upsertUserAttribution,
} from "@/lib/attribution";
import bcrypt from "bcryptjs";

export const runtime = "nodejs";

/**
 * POST /api/auth/signup
 * Body: { email: string, phone: string, password: string }
 *
 * - 이메일 중복 검증
 * - 비밀번호 해시 저장 (bcrypt)
 * - CUSTOMER 역할로 생성
 * - 자동 로그인 (쿠키 발급)
 */
export async function POST(req: NextRequest) {
  let body: { email?: string; phone?: string; password?: string; name?: string };
  try {
    body = (await req.json()) as { email?: string; phone?: string; password?: string; name?: string };
  } catch {
    return NextResponse.json(
      { error: "잘못된 요청입니다" },
      { status: 400 },
    );
  }

  const { email, phone, password, name } = body;

  // 입력 검증
  if (!email || !phone || !password) {
    return NextResponse.json(
      { error: "이메일, 전화번호, 비밀번호를 입력해주세요" },
      { status: 400 },
    );
  }

  // 이메일 형식 간단 검증
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return NextResponse.json(
      { error: "올바른 이메일 형식이 아닙니다" },
      { status: 400 },
    );
  }

  const phoneRegex = /^010-\d{4}-\d{4}$/;
  if (!phoneRegex.test(phone)) {
    return NextResponse.json(
      { error: "전화번호는 010-0000-0000 형식으로 입력해주세요" },
      { status: 400 },
    );
  }

  // 비밀번호: 8자 이상 + 대/소문자 + 숫자 + 특수문자
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
  if (!passwordRegex.test(password)) {
    return NextResponse.json(
      { error: "비밀번호는 최소 8자, 대문자, 소문자, 숫자, 특수문자 혼용이어야 합니다" },
      { status: 400 },
    );
  }

  try {
    const attribution = readAttributionFromRequest(req);

    // 중복 이메일 확인
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { phone }],
      },
    });

    if (existingUser) {
      if (existingUser.phone === phone) {
        return NextResponse.json(
          { error: "이미 사용 중인 전화번호입니다" },
          { status: 409 },
        );
      }
      return NextResponse.json(
        { error: "이미 사용 중인 이메일입니다" },
        { status: 409 },
      );
    }

    // 비밀번호 해시 생성
    const hashedPassword = await bcrypt.hash(password, 10);

    // 사용자 생성
    const user = await prisma.user.create({
      data: {
        email,
        phone,
        password: hashedPassword,
        role: "CUSTOMER",
        name: name?.trim() || undefined,
      },
    });

    await upsertUserAttribution(prisma, user.id, attribution);

    // 자동 로그인 - 쿠키 발급
    const session: Session = {
      userId: user.id,
      role: "CUSTOMER",
      name: user.name || undefined,
      email: user.email || undefined,
      issuedAt: Date.now(),
    };
    const token = signSession(session);

    const res = NextResponse.json({ ok: true });
    const cookie = buildCookieOptions(token);
    res.cookies.set(cookie.name, cookie.value, {
      httpOnly: cookie.httpOnly,
      sameSite: cookie.sameSite,
      secure: cookie.secure,
      path: cookie.path,
      maxAge: cookie.maxAge,
    });

    return res;
  } catch (error: any) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { error: "회원가입 중 오류가 발생했습니다" },
      { status: 500 },
    );
  }
}
