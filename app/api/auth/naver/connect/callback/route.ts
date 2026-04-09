import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { normalizeName, normalizePhone } from "@/lib/socialAuth";
import { getCanonicalOrigin } from "@/lib/siteUrl";

export const runtime = "nodejs";

/**
 * GET /api/auth/naver/connect/callback
 * 네이버 OAuth 콜백 처리 (기존 계정 연동 전용)
 */
export async function GET(req: NextRequest) {
  const session = await getSession();
  const baseUrl = getCanonicalOrigin();
  if (!session) {
    return NextResponse.redirect(`${baseUrl}/login?next=/my/account`);
  }

  const clientId = process.env.NAVER_CLIENT_ID!;
  const clientSecret = process.env.NAVER_CLIENT_SECRET!;
  const redirectUri = `${baseUrl}/api/auth/naver/connect/callback`;

  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    if (error || !code || !state) {
      return NextResponse.redirect(`${baseUrl}/my/account?connectError=naver_failed`);
    }

    const store = await cookies();
    const savedState = store.get("oauth_connect_state")?.value;
    store.delete("oauth_connect_state");

    if (!savedState || savedState !== state) {
      return NextResponse.redirect(`${baseUrl}/my/account?connectError=naver_state`);
    }

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
      return NextResponse.redirect(`${baseUrl}/my/account?connectError=naver_token`);
    }
    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token as string | undefined;
    if (!accessToken) {
      return NextResponse.redirect(`${baseUrl}/my/account?connectError=naver_token`);
    }

    const userRes = await fetch("https://openapi.naver.com/v1/nid/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!userRes.ok) {
      return NextResponse.redirect(`${baseUrl}/my/account?connectError=naver_profile`);
    }
    const userData = await userRes.json();
    const naverId = userData.response?.id as string | undefined;
    const providerName = normalizeName(userData.response?.name);
    const providerPhone = normalizePhone(userData.response?.mobile);

    if (!naverId || !providerName || !providerPhone) {
      return NextResponse.redirect(`${baseUrl}/my/account?connectError=naver_required_info`);
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, name: true, phone: true },
    });
    if (!user) {
      return NextResponse.redirect(`${baseUrl}/my/account?connectError=user_not_found`);
    }

    const linkedUser = await prisma.user.findUnique({
      where: { naverId },
      select: { id: true },
    });
    if (linkedUser && linkedUser.id !== user.id) {
      return NextResponse.redirect(`${baseUrl}/my/account?connectError=naver_already_linked`);
    }

    const currentName = normalizeName(user.name);
    const currentPhone = normalizePhone(user.phone);
    const hasMismatch =
      (currentName && currentName !== providerName) ||
      (currentPhone && currentPhone !== providerPhone);

    if (hasMismatch) {
      const pending = JSON.stringify({
        userId: user.id,
        provider: "naver",
        providerId: naverId,
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
        naverId,
        ...(currentName ? {} : { name: providerName }),
        ...(currentPhone ? {} : { phone: providerPhone }),
      },
    });

    const res = NextResponse.redirect(`${baseUrl}/my/account?connectSuccess=naver`);
    res.cookies.set("social_connect_pending", "", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0,
    });
    return res;
  } catch (error) {
    console.error("Naver connect callback error:", error);
    return NextResponse.redirect(`${baseUrl}/my/account?connectError=naver_failed`);
  }
}

