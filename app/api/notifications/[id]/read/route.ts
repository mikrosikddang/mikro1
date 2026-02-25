import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * PATCH /api/notifications/[id]/read
 * 개별 알림 읽음 처리
 */
export async function PATCH(_req: NextRequest, context: RouteContext) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    const { id } = await context.params;

    const notification = await prisma.notification.findUnique({
      where: { id },
      select: { id: true, userId: true },
    });

    if (!notification) {
      return NextResponse.json(
        { error: "알림을 찾을 수 없습니다" },
        { status: 404 },
      );
    }

    if (notification.userId !== session.userId) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 },
      );
    }

    await prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("PATCH /api/notifications/[id]/read error:", error);
    return NextResponse.json(
      { error: "알림 읽음 처리 중 오류가 발생했습니다" },
      { status: 500 },
    );
  }
}
