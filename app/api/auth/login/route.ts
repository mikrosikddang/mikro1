import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signSession, buildCookieOptions } from "@/lib/auth";
import type { Role, Session } from "@/lib/auth";
import bcrypt from "bcryptjs";

export const runtime = "nodejs";

/**
 * POST /api/auth/login
 * Body: { id: string, pw: string }
 *
 * MVP deterministic credentials (mapped to real DB users):
 *   1/1  → Fetches user with email "mvp1@mikro.local" (id: "mvp-customer-1")
 *   s/s  → Fetches user with email "seller1@mikro.local" (id: "mvp-seller-1")
 *
 * + 실제 이메일/비밀번호 로그인 지원
 */
export async function POST(req: NextRequest) {
  let body: { id?: string; pw?: string };
  try {
    body = (await req.json()) as { id?: string; pw?: string };
  } catch {
    return NextResponse.json(
      { ok: false, message: "잘못된 요청입니다" },
      { status: 400 },
    );
  }

  const { id, pw } = body;

  if (!id || !pw) {
    return NextResponse.json(
      { ok: false, message: "아이디와 비밀번호를 입력해주세요" },
      { status: 400 },
    );
  }

  let userId: string;
  let role: Role;

  try {
    let user;

    // MVP shortcut logins - map to real DB users
    if (id === "1" && pw === "1") {
      user = await prisma.user.findUnique({
        where: { email: "mvp1@mikro.local" },
      });
    } else if (id === "s" && pw === "s") {
      user = await prisma.user.findUnique({
        where: { email: "seller1@mikro.local" },
      });
    } else {
      // Regular email/password login
      user = await prisma.user.findUnique({
        where: { email: id },
      });
    }

    if (!user || !user.password) {
      return NextResponse.json(
        { ok: false, message: "아이디 또는 비밀번호가 일치하지 않습니다" },
        { status: 401 },
      );
    }

    // Verify password using bcrypt
    const passwordMatch = await bcrypt.compare(pw, user.password);
    if (!passwordMatch) {
      return NextResponse.json(
        { ok: false, message: "아이디 또는 비밀번호가 일치하지 않습니다" },
        { status: 401 },
      );
    }

    // Use actual DB user ID and role (preserve exact role from DB)
    userId = user.id;
    role = user.role as Role;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { ok: false, message: "로그인 중 오류가 발생했습니다" },
      { status: 500 },
    );
  }

  const session: Session = { userId, role, issuedAt: Date.now() };
  const token = signSession(session);

  const res = NextResponse.json({ ok: true, role });
  const cookie = buildCookieOptions(token);
  res.cookies.set(cookie.name, cookie.value, {
    httpOnly: cookie.httpOnly,
    sameSite: cookie.sameSite,
    secure: cookie.secure,
    path: cookie.path,
    maxAge: cookie.maxAge,
  });

  return res;
}
