import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const runtime = "nodejs";

type Props = { params: Promise<{ roomId: string }> };

/**
 * PATCH /api/chat/rooms/[roomId]/read
 * 읽음 처리 — 상대방이 보낸 메시지만 isRead=true
 */
export async function PATCH(_request: Request, { params }: Props) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const { roomId } = await params;

    // 참여자 확인
    const room = await prisma.chatRoom.findUnique({
      where: { id: roomId },
      select: { buyerId: true, sellerId: true },
    });

    if (!room || (room.buyerId !== session.userId && room.sellerId !== session.userId)) {
      return NextResponse.json({ error: "채팅방을 찾을 수 없습니다." }, { status: 404 });
    }

    // 상대방이 보낸 읽지 않은 메시지만 업데이트
    const result = await prisma.chatMessage.updateMany({
      where: {
        roomId,
        senderId: { not: session.userId },
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return NextResponse.json({ ok: true, count: result.count });
  } catch (err) {
    console.error("PATCH /api/chat/rooms/[roomId]/read error:", err);
    return NextResponse.json(
      { error: "읽음 처리에 실패했습니다." },
      { status: 500 },
    );
  }
}
