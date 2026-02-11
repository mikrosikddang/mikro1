import { NextResponse } from "next/server";
import { buildDeleteCookieOptions } from "@/lib/auth";

export const runtime = "nodejs";

/**
 * POST /api/auth/logout
 * Clears the session cookie.
 */
export async function POST() {
  const res = NextResponse.json({ ok: true });
  const cookie = buildDeleteCookieOptions();
  res.cookies.set(cookie.name, cookie.value, {
    httpOnly: cookie.httpOnly,
    sameSite: cookie.sameSite,
    secure: cookie.secure,
    path: cookie.path,
    maxAge: cookie.maxAge,
  });
  return res;
}
