import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const runtime = "nodejs";

/**
 * GET /api/chat/unread-count
 * 전체 안읽은 채팅 메시지 수 (하단 탭 뱃지용)
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ count: 0 });
    }

    // 내가 참여한 채팅방의 상대방 메시지 중 안읽은 것
    const count = await prisma.chatMessage.count({
      where: {
        senderId: { not: session.userId },
        isRead: false,
        room: {
          OR: [
            { buyerId: session.userId },
            { sellerId: session.userId },
          ],
        },
      },
    });

    return NextResponse.json({ count });
  } catch (err) {
    console.error("GET /api/chat/unread-count error:", err);
    return NextResponse.json({ count: 0 });
  }
}
