import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { cookies } from "next/headers";

export const runtime = "nodejs";

const NAVER_CLIENT_ID = process.env.NAVER_CLIENT_ID!;

function getRedirectUri() {
  const base = process.env.NEXT_PUBLIC_BASE_URL || "https://www.mikrobrand.kr";
  return `${base}/api/auth/naver/callback`;
}

/**
 * GET /api/auth/naver
 * 네이버 인증 페이지로 리다이렉트
 */
export async function GET() {
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

  const params = new URLSearchParams({
    client_id: NAVER_CLIENT_ID,
    redirect_uri: getRedirectUri(),
    response_type: "code",
    state,
  });

  return NextResponse.redirect(
    `https://nid.naver.com/oauth2.0/authorize?${params.toString()}`,
  );
}
