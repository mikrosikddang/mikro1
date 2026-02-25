import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const runtime = "nodejs";

/**
 * PATCH /api/notifications/read-all
 * 전체 읽음 처리
 */
export async function PATCH() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    const result = await prisma.notification.updateMany({
      where: {
        userId: session.userId,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });

    return NextResponse.json({ ok: true, updatedCount: result.count });
  } catch (error) {
    console.error("PATCH /api/notifications/read-all error:", error);
    return NextResponse.json(
      { error: "알림 읽음 처리 중 오류가 발생했습니다" },
      { status: 500 },
    );
  }
}
