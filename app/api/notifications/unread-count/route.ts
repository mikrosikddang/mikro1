import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const runtime = "nodejs";

/**
 * GET /api/notifications/unread-count
 * 안읽은 알림 개수 (TopBar 뱃지용, 가벼운 엔드포인트)
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ count: 0 });
    }

    const count = await prisma.notification.count({
      where: {
        userId: session.userId,
        isRead: false,
      },
    });

    return NextResponse.json({ count });
  } catch (error) {
    console.error("GET /api/notifications/unread-count error:", error);
    return NextResponse.json({ count: 0 });
  }
}
