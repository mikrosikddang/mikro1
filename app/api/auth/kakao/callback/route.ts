import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { signSession, buildCookieOptions } from "@/lib/auth";
import type { Session } from "@/lib/auth";

export const runtime = "nodejs";

/**
 * GET /api/auth/kakao/callback
 * 카카오 OAuth 콜백 처리
 */
export async function GET(req: NextRequest) {
  const clientId = process.env.KAKAO_REST_API_KEY!;
  const clientSecret = process.env.KAKAO_CLIENT_SECRET!;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://www.mikrobrand.kr";
  const redirectUri = `${baseUrl}/api/auth/kakao/callback`;

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
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
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
    const kakaoPhone = userData.kakao_account?.phone_number as string | undefined;
    const kakaoId = String(userData.id);

    // +82 10-1234-5678 → 01012345678
    const normalizedPhone = kakaoPhone
      ?.replace(/\+82\s?/, "0")
      ?.replace(/-/g, "")
      ?.trim() || null;

    if (!kakaoEmail && !normalizedPhone) {
      return NextResponse.redirect(`${baseUrl}/login?error=kakao_no_info`);
    }

    // 3. DB: kakaoId → 이름+전화번호 → 이메일 순으로 매칭, 없으면 자동 회원가입
    // 1순위: kakaoId
    let user = await prisma.user.findUnique({ where: { kakaoId } });

    // 2순위: 이름+전화번호
    if (!user && kakaoName && normalizedPhone) {
      user = await prisma.user.findFirst({
        where: { name: kakaoName, phone: normalizedPhone },
      });
      if (user) {
        await prisma.user.update({ where: { id: user.id }, data: { kakaoId } });
      }
    }

    // 3순위: 이메일
    if (!user && kakaoEmail) {
      user = await prisma.user.findUnique({ where: { email: kakaoEmail } });
      if (user) {
        await prisma.user.update({ where: { id: user.id }, data: { kakaoId } });
      }
    }

    // 없으면 신규 가입
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: kakaoEmail,
          name: kakaoName || null,
          phone: normalizedPhone,
          provider: "kakao",
          kakaoId,
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
