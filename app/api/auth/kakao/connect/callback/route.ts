import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { normalizeName, normalizePhone } from "@/lib/socialAuth";

export const runtime = "nodejs";

/**
 * GET /api/auth/kakao/connect/callback
 * 카카오 OAuth 콜백 처리 (기존 계정 연동 전용)
 */
export async function GET(req: NextRequest) {
  const session = await getSession();
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://www.mikrobrand.kr";
  if (!session) {
    return NextResponse.redirect(`${baseUrl}/login?next=/my/account`);
  }

  const clientId = process.env.KAKAO_REST_API_KEY!;
  const clientSecret = process.env.KAKAO_CLIENT_SECRET!;
  const redirectUri = `${baseUrl}/api/auth/kakao/connect/callback`;

  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    if (error || !code || !state) {
      return NextResponse.redirect(`${baseUrl}/my/account?connectError=kakao_failed`);
    }

    const store = await cookies();
    const savedState = store.get("oauth_connect_state")?.value;
    store.delete("oauth_connect_state");

    if (!savedState || savedState !== state) {
      return NextResponse.redirect(`${baseUrl}/my/account?connectError=kakao_state`);
    }

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
      return NextResponse.redirect(`${baseUrl}/my/account?connectError=kakao_token`);
    }
    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token as string | undefined;
    if (!accessToken) {
      return NextResponse.redirect(`${baseUrl}/my/account?connectError=kakao_token`);
    }

    const userRes = await fetch("https://kapi.kakao.com/v2/user/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!userRes.ok) {
      return NextResponse.redirect(`${baseUrl}/my/account?connectError=kakao_profile`);
    }
    const userData = await userRes.json();
    const kakaoId = String(userData.id);
    const providerName = normalizeName(userData.kakao_account?.profile?.nickname);
    const providerPhone = normalizePhone(userData.kakao_account?.phone_number);

    if (!providerName || !providerPhone) {
      return NextResponse.redirect(`${baseUrl}/my/account?connectError=kakao_required_info`);
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, name: true, phone: true },
    });
    if (!user) {
      return NextResponse.redirect(`${baseUrl}/my/account?connectError=user_not_found`);
    }

    const linkedUser = await prisma.user.findUnique({
      where: { kakaoId },
      select: { id: true },
    });
    if (linkedUser && linkedUser.id !== user.id) {
      return NextResponse.redirect(`${baseUrl}/my/account?connectError=kakao_already_linked`);
    }

    const currentName = normalizeName(user.name);
    const currentPhone = normalizePhone(user.phone);
    const hasMismatch =
      (currentName && currentName !== providerName) ||
      (currentPhone && currentPhone !== providerPhone);

    if (hasMismatch) {
      const pending = JSON.stringify({
        userId: user.id,
        provider: "kakao",
        providerId: kakaoId,
        providerName,
        providerPhone,
        issuedAt: Date.now(),
      });
      const res = NextResponse.redirect(`${baseUrl}/my/account?connectPending=1`);
      res.cookies.set("social_connect_pending", pending, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 600,
      });
      return res;
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        kakaoId,
        ...(currentName ? {} : { name: providerName }),
        ...(currentPhone ? {} : { phone: providerPhone }),
      },
    });

    const res = NextResponse.redirect(`${baseUrl}/my/account?connectSuccess=kakao`);
    res.cookies.set("social_connect_pending", "", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0,
    });
    return res;
  } catch (error) {
    console.error("Kakao connect callback error:", error);
    return NextResponse.redirect(`${baseUrl}/my/account?connectError=kakao_failed`);
  }
}

