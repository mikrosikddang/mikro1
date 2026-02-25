import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const runtime = "nodejs";

/**
 * GET /api/notifications
 * 내 알림 목록 (로그인 필수, 최신순, 커서 기반 페이지네이션)
 *
 * Query: ?cursor=<notificationId>&limit=<number>
 * 응답에 unreadCount 포함
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(req.url);
    const cursor = searchParams.get("cursor");
    const limit = Math.min(Number(searchParams.get("limit")) || 20, 50);

    const notifications = await prisma.notification.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(cursor
        ? {
            cursor: { id: cursor },
            skip: 1,
          }
        : {}),
    });

    const hasMore = notifications.length > limit;
    const items = hasMore ? notifications.slice(0, limit) : notifications;
    const nextCursor = hasMore ? items[items.length - 1].id : null;

    const unreadCount = await prisma.notification.count({
      where: { userId: session.userId, isRead: false },
    });

    return NextResponse.json({
      notifications: items,
      nextCursor,
      unreadCount,
    });
  } catch (error) {
    console.error("GET /api/notifications error:", error);
    return NextResponse.json(
      { error: "알림 조회 중 오류가 발생했습니다" },
      { status: 500 },
    );
  }
}
