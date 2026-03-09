import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { SocialProvider } from "@/lib/socialAuth";

type PendingConnect = {
  userId: string;
  provider: SocialProvider;
  providerId: string;
  providerName: string;
  providerPhone: string;
  issuedAt: number;
};

const PENDING_COOKIE = "social_connect_pending";

function clearPendingCookie(res: NextResponse) {
  res.cookies.set(PENDING_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

function parsePending(raw: string | undefined): PendingConnect | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as PendingConnect;
    if (
      !parsed ||
      (parsed.provider !== "kakao" && parsed.provider !== "naver") ||
      !parsed.userId ||
      !parsed.providerId ||
      !parsed.providerName ||
      !parsed.providerPhone ||
      !parsed.issuedAt
    ) {
      return null;
    }
    if (Date.now() - parsed.issuedAt > 10 * 60 * 1000) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/**
 * GET /api/auth/connect/pending
 * 연동 대기(정보 불일치) 상태 조회
 */
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  }

  const store = await cookies();
  const pending = parsePending(store.get(PENDING_COOKIE)?.value);

  if (!pending || pending.userId !== session.userId) {
    return NextResponse.json({ pending: null });
  }

  return NextResponse.json({
    pending: {
      provider: pending.provider,
      providerName: pending.providerName,
      providerPhone: pending.providerPhone,
    },
  });
}

/**
 * POST /api/auth/connect/pending
 * 정보 불일치 시 사용자 확인 후 연동 확정/취소
 * Body: { applyUpdates: boolean }
 */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as { applyUpdates?: boolean };
  const applyUpdates = Boolean(body.applyUpdates);

  const store = await cookies();
  const pending = parsePending(store.get(PENDING_COOKIE)?.value);
  if (!pending || pending.userId !== session.userId) {
    const res = NextResponse.json({ error: "연동 대기 정보가 없습니다" }, { status: 400 });
    clearPendingCookie(res);
    return res;
  }

  if (!applyUpdates) {
    const res = NextResponse.json({
      ok: false,
      cancelled: true,
      message: "기존 정보를 유지하여 연동을 취소했습니다",
    });
    clearPendingCookie(res);
    return res;
  }

  const providerWhere =
    pending.provider === "kakao"
      ? { kakaoId: pending.providerId }
      : { naverId: pending.providerId };

  const linkedUser = await prisma.user.findUnique({
    where: providerWhere,
    select: { id: true },
  });
  if (linkedUser && linkedUser.id !== session.userId) {
    const res = NextResponse.json(
      { error: "이미 다른 계정에 연동된 소셜 계정입니다" },
      { status: 409 },
    );
    clearPendingCookie(res);
    return res;
  }

  await prisma.user.update({
    where: { id: session.userId },
    data: {
      name: pending.providerName,
      phone: pending.providerPhone,
      ...(pending.provider === "kakao"
        ? { kakaoId: pending.providerId }
        : { naverId: pending.providerId }),
    },
  });

  const res = NextResponse.json({ ok: true });
  clearPendingCookie(res);
  return res;
}

/**
 * DELETE /api/auth/connect/pending
 * 연동 대기 상태 취소
 */
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  clearPendingCookie(res);
  return res;
}

