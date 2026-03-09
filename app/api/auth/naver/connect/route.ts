import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import { getSession } from "@/lib/auth";

export const runtime = "nodejs";

/**
 * GET /api/auth/naver/connect
 * 현재 로그인 계정에 네이버 연동 시작
 */
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.redirect("/login?next=/my/account");
  }

  const clientId = process.env.NAVER_CLIENT_ID!;
  const base = process.env.NEXT_PUBLIC_BASE_URL || "https://www.mikrobrand.kr";
  const redirectUri = `${base}/api/auth/naver/connect/callback`;
  const state = randomBytes(16).toString("hex");

  const store = await cookies();
  store.set("oauth_connect_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600,
  });

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

