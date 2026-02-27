import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { signSession, buildCookieOptions } from "@/lib/auth";
import type { Session } from "@/lib/auth";

export const runtime = "nodejs";

const KAKAO_CLIENT_ID = process.env.KAKAO_REST_API_KEY!;
const KAKAO_CLIENT_SECRET = process.env.KAKAO_CLIENT_SECRET!;

function getBaseUrl() {
  return process.env.NEXT_PUBLIC_BASE_URL || "https://main.dg04s98ouvm6k.amplifyapp.com";
}

function getRedirectUri() {
  return `${getBaseUrl()}/api/auth/kakao/callback`;
}

/**
 * GET /api/auth/kakao/callback
 * 카카오 OAuth 콜백 처리
 */
export async function GET(req: NextRequest) {
  const baseUrl = getBaseUrl();

  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    // 사용자가 로그인 취소
    if (error) {
      return NextResponse.redirect(`${baseUrl}/login?error=kakao_cancelled`);
    }

    if (!code || !state) {
      return NextResponse.redirect(`${baseUrl}/login?error=kakao_failed`);
    }

    // CSRF 검증
    const store = await cookies();
    const savedState = store.get("oauth_state")?.value;
    store.delete("oauth_state");

    if (!savedState || savedState !== state) {
      return NextResponse.redirect(`${baseUrl}/login?error=kakao_failed`);
    }

    // 1. code → access_token 교환
    const tokenRes = await fetch("https://kauth.kakao.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: KAKAO_CLIENT_ID,
        client_secret: KAKAO_CLIENT_SECRET,
        redirect_uri: getRedirectUri(),
        code,
      }),
    });

    if (!tokenRes.ok) {
      console.error("Kakao token exchange failed:", await tokenRes.text());
      return NextResponse.redirect(`${baseUrl}/login?error=kakao_failed`);
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      return NextResponse.redirect(`${baseUrl}/login?error=kakao_failed`);
    }

    // 2. access_token → 사용자 정보 조회
    const userRes = await fetch("https://kapi.kakao.com/v2/user/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!userRes.ok) {
      console.error("Kakao user info failed:", await userRes.text());
      return NextResponse.redirect(`${baseUrl}/login?error=kakao_failed`);
    }

    const userData = await userRes.json();
    const kakaoEmail = userData.kakao_account?.email as string | undefined;
    const kakaoName = userData.kakao_account?.profile?.nickname as string | undefined;

    if (!kakaoEmail) {
      return NextResponse.redirect(`${baseUrl}/login?error=kakao_no_email`);
    }

    // 3. DB: 이메일로 기존 유저 조회 → 없으면 자동 회원가입
    let user = await prisma.user.findUnique({
      where: { email: kakaoEmail },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: kakaoEmail,
          name: kakaoName || null,
          provider: "kakao",
          role: "CUSTOMER",
        },
      });
    }

    // 4. 세션 쿠키 발급
    const session: Session = {
      userId: user.id,
      role: user.role,
      name: user.name || undefined,
      email: user.email || undefined,
      issuedAt: Date.now(),
    };
    const token = signSession(session);
    const cookie = buildCookieOptions(token);

    const res = NextResponse.redirect(`${baseUrl}/`);
    res.cookies.set(cookie.name, cookie.value, {
      httpOnly: cookie.httpOnly,
      sameSite: cookie.sameSite,
      secure: cookie.secure,
      path: cookie.path,
      maxAge: cookie.maxAge,
    });

    return res;
  } catch (err) {
    console.error("Kakao callback error:", err);
    return NextResponse.redirect(`${baseUrl}/login?error=kakao_failed`);
  }
}
