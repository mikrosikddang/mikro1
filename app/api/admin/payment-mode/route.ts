import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { requireAdmin } from "@/lib/roleGuards";
import { createAdminActionLog } from "@/lib/adminActionLog";
import {
  getTossMode,
  setTossMode,
  type TossMode,
} from "@/lib/tossConfig";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function hasKey(mode: TossMode) {
  if (mode === "live") {
    return Boolean(
      (process.env.TOSS_LIVE_SECRET_KEY ?? "").trim() &&
        (process.env.NEXT_PUBLIC_TOSS_LIVE_CLIENT_KEY ?? "").trim(),
    );
  }
  return Boolean(
    (process.env.TOSS_TEST_SECRET_KEY ?? "").trim() &&
      (process.env.NEXT_PUBLIC_TOSS_TEST_CLIENT_KEY ?? "").trim(),
  );
}

export async function GET() {
  try {
    requireAdmin(await getSession());
  } catch {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  const mode = await getTossMode();
  return NextResponse.json({
    mode,
    liveReady: hasKey("live"),
    testReady: hasKey("test"),
  });
}

export async function PATCH(request: NextRequest) {
  let session;
  try {
    session = requireAdmin(await getSession());
  } catch {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { mode?: string };
  const next: TossMode | null =
    body.mode === "live" ? "live" : body.mode === "test" ? "test" : null;
  if (!next) {
    return NextResponse.json(
      { error: "mode 값은 'live' 또는 'test' 여야 합니다." },
      { status: 400 },
    );
  }

  if (!hasKey(next)) {
    return NextResponse.json(
      {
        error:
          next === "live"
            ? "라이브 키(TOSS_LIVE_SECRET_KEY, NEXT_PUBLIC_TOSS_LIVE_CLIENT_KEY)가 환경변수에 설정되어 있지 않습니다."
            : "테스트 키(TOSS_TEST_SECRET_KEY, NEXT_PUBLIC_TOSS_TEST_CLIENT_KEY)가 환경변수에 설정되어 있지 않습니다.",
      },
      { status: 409 },
    );
  }

  const prev = await getTossMode();
  await setTossMode(next, session.userId);

  await createAdminActionLog(prisma, {
    adminId: session.userId,
    entityType: "APP_SETTING",
    entityId: "payment.toss.mode",
    action: "PAYMENT_MODE_CHANGED",
    summary: `결제 모드 ${prev} → ${next}`,
    beforeJson: { mode: prev },
    afterJson: { mode: next },
  });

  return NextResponse.json({ mode: next, prev });
}
