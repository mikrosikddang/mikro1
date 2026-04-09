import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import { getCanonicalOrigin } from "@/lib/siteUrl";

export const runtime = "nodejs";

/**
 * GET /api/auth/naver
 * 네이버 인증 페이지로 리다이렉트
 */
export async function GET(req: NextRequest) {
  const clientId = process.env.NAVER_CLIENT_ID!;
  const base = getCanonicalOrigin();
  const redirectUri = `${base}/api/auth/naver/callback`;
  const intent = new URL(req.url).searchParams.get("intent");

  const state = randomBytes(16).toString("hex");

  // state를 쿠키에 저장 (CSRF 방지)
  const store = await cookies();
  store.set("oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600, // 10분
  });

  if (intent === "signup") {
    store.set("oauth_signup_consent", "1", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 600,
    });
  } else {
    store.delete("oauth_signup_consent");
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    state,
  });

  return NextResponse.redirect(
    `https://nid.naver.com/oauth2.0/authorize?${params.toString()}`,
  );
}
