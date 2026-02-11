import { NextRequest, NextResponse } from "next/server";
import { signSession, buildCookieOptions } from "@/lib/auth";
import type { Role, Session } from "@/lib/auth";

export const runtime = "nodejs";

/**
 * POST /api/auth/login
 * Body: { id: string, pw: string }
 *
 * MVP deterministic credentials:
 *   1/1  → CUSTOMER (userId = "mvp-customer-1")
 *   s/s  → SELLER   (userId = MVP_SELLER_ID from env)
 */
export async function POST(req: NextRequest) {
  let body: { id?: string; pw?: string };
  try {
    body = (await req.json()) as { id?: string; pw?: string };
  } catch {
    return NextResponse.json(
      { ok: false, message: "잘못된 요청입니다" },
      { status: 400 },
    );
  }

  const { id, pw } = body;

  if (!id || !pw) {
    return NextResponse.json(
      { ok: false, message: "아이디와 비밀번호를 입력해주세요" },
      { status: 400 },
    );
  }

  let userId: string;
  let role: Role;

  if (id === "1" && pw === "1") {
    userId = "mvp-customer-1";
    role = "CUSTOMER";
  } else if (id === "s" && pw === "s") {
    const sellerId = process.env.MVP_SELLER_ID;
    if (!sellerId) {
      return NextResponse.json(
        { ok: false, message: "서버 설정 오류 (MVP_SELLER_ID)" },
        { status: 500 },
      );
    }
    userId = sellerId;
    role = "SELLER";
  } else {
    return NextResponse.json(
      { ok: false, message: "아이디 또는 비밀번호가 일치하지 않습니다" },
      { status: 401 },
    );
  }

  const session: Session = { userId, role, issuedAt: Date.now() };
  const token = signSession(session);

  const res = NextResponse.json({ ok: true, role });
  const cookie = buildCookieOptions(token);
  res.cookies.set(cookie.name, cookie.value, {
    httpOnly: cookie.httpOnly,
    sameSite: cookie.sameSite,
    secure: cookie.secure,
    path: cookie.path,
    maxAge: cookie.maxAge,
  });

  return res;
}
