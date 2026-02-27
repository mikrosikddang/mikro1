import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { signSession, buildCookieOptions } from "@/lib/auth";
import type { Session } from "@/lib/auth";

export const runtime = "nodejs";

const NAVER_CLIENT_ID = process.env.NAVER_CLIENT_ID!;
const NAVER_CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET!;

function getBaseUrl() {
  return process.env.NEXT_PUBLIC_BASE_URL || "https://main.dg04s98ouvm6k.amplifyapp.com";
}

function getRedirectUri() {
  return `${getBaseUrl()}/api/auth/naver/callback`;
}

/**
 * GET /api/auth/naver/callback
 * 네이버 OAuth 콜백 처리
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
      return NextResponse.redirect(`${baseUrl}/login?error=naver_cancelled`);
    }

    if (!code || !state) {
      return NextResponse.redirect(`${baseUrl}/login?error=naver_failed`);
    }

    // CSRF 검증
    const store = await cookies();
    const savedState = store.get("oauth_state")?.value;
    store.delete("oauth_state");

    if (!savedState || savedState !== state) {
      return NextResponse.redirect(`${baseUrl}/login?error=naver_failed`);
    }

    // 1. code → access_token 교환
    const tokenParams = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: NAVER_CLIENT_ID,
      client_secret: NAVER_CLIENT_SECRET,
      redirect_uri: getRedirectUri(),
      code,
      state,
    });

    const tokenRes = await fetch(
      `https://nid.naver.com/oauth2.0/token?${tokenParams.toString()}`,
      { method: "POST" },
    );

    if (!tokenRes.ok) {
      console.error("Naver token exchange failed:", await tokenRes.text());
      return NextResponse.redirect(`${baseUrl}/login?error=naver_failed`);
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      return NextResponse.redirect(`${baseUrl}/login?error=naver_failed`);
    }

    // 2. access_token → 사용자 정보 조회
    const userRes = await fetch("https://openapi.naver.com/v1/nid/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!userRes.ok) {
      console.error("Naver user info failed:", await userRes.text());
      return NextResponse.redirect(`${baseUrl}/login?error=naver_failed`);
    }

    const userData = await userRes.json();
    const naverEmail = userData.response?.email as string | undefined;
    const naverName = userData.response?.name as string | undefined;

    if (!naverEmail) {
      return NextResponse.redirect(`${baseUrl}/login?error=naver_no_email`);
    }

    // 3. DB: 이메일로 기존 유저 조회 → 없으면 자동 회원가입
    let user = await prisma.user.findUnique({
      where: { email: naverEmail },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: naverEmail,
          name: naverName || null,
          provider: "naver",
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
    console.error("Naver callback error:", err);
    return NextResponse.redirect(`${baseUrl}/login?error=naver_failed`);
  }
}
