import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { signSession, buildCookieOptions } from "@/lib/auth";
import type { Session } from "@/lib/auth";
import {
  readAttributionFromRequest,
  upsertUserAttribution,
} from "@/lib/attribution";
import { ensureUserSpaceProfile } from "@/lib/userSpace";

export const runtime = "nodejs";

/**
 * GET /api/auth/naver/callback
 * 네이버 OAuth 콜백 처리
 */
export async function GET(req: NextRequest) {
  const clientId = process.env.NAVER_CLIENT_ID!;
  const clientSecret = process.env.NAVER_CLIENT_SECRET!;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://www.mikrobrand.kr";
  const redirectUri = `${baseUrl}/api/auth/naver/callback`;

  try {
    const attribution = readAttributionFromRequest(req);
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
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
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
    const naverPhone = userData.response?.mobile as string | undefined;
    const naverId = userData.response?.id as string | undefined;

    // 3. DB: naverId → 이름+전화번호 → 이메일 순으로 매칭, 없으면 자동 회원가입
    // 1순위: naverId로 매칭
    let user = naverId ? await prisma.user.findUnique({ where: { naverId } }) : null;

    // 2순위: 이름+전화번호로 매칭
    if (!user && naverName && naverPhone) {
      const normalized = naverPhone.replace(/-/g, "");
      user = await prisma.user.findFirst({
        where: { name: naverName, phone: normalized },
      });
      if (user && naverId) {
        await prisma.user.update({ where: { id: user.id }, data: { naverId } });
      }
    }

    // 3순위: 이메일로 매칭
    if (!user && naverEmail) {
      user = await prisma.user.findUnique({ where: { email: naverEmail } });
      if (user && naverId) {
        await prisma.user.update({ where: { id: user.id }, data: { naverId } });
      }
    }

    // 없으면 신규 가입
    let isNewUser = false;
    let welcomeStoreSlug: string | null = null;
    if (!user) {
      const createdResult = await prisma.$transaction(async (tx) => {
        const created = await tx.user.create({
          data: {
            email: naverEmail,
            name: naverName || null,
            phone: naverPhone?.replace(/-/g, "") || null,
            provider: "naver",
            naverId: naverId || null,
            role: "CUSTOMER",
          },
        });
        const space = await ensureUserSpaceProfile(tx, {
          id: created.id,
          name: created.name,
          email: created.email,
        });
        return { created, welcomeStoreSlug: space.storeSlug };
      });
      user = createdResult.created;
      welcomeStoreSlug = createdResult.welcomeStoreSlug;
      isNewUser = true;
    }

    await upsertUserAttribution(prisma, user.id, attribution);

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

    const targetPath =
      isNewUser && welcomeStoreSlug
        ? `${baseUrl}/${welcomeStoreSlug}?welcome=1`
        : `${baseUrl}/`;
    const res = NextResponse.redirect(targetPath);
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
