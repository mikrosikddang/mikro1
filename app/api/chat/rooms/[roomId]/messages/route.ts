import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { createNotification } from "@/lib/notifications";

export const runtime = "nodejs";

const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_CONTENT_LENGTH = 2000;

function stripHtml(text: string): string {
  return text.replace(/<[^>]*>/g, "");
}

type Props = { params: Promise<{ roomId: string }> };

/**
 * GET /api/chat/rooms/[roomId]/messages
 * 메시지 조회 (커서 페이지네이션)
 */
export async function GET(request: Request, { params }: Props) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const { roomId } = await params;
    const url = new URL(request.url);
    const cursor = url.searchParams.get("cursor");
    const limitParam = url.searchParams.get("limit");
    const limit = Math.min(parseInt(limitParam || "50", 10), 100);

    // 참여자 확인 (buyer/seller 정보 포함)
    const room = await prisma.chatRoom.findUnique({
      where: { id: roomId },
      include: {
        buyer: {
          select: { id: true, name: true, email: true, sellerProfile: { select: { shopName: true, avatarUrl: true } } },
        },
        seller: {
          select: { id: true, name: true, email: true, sellerProfile: { select: { shopName: true, avatarUrl: true } } },
        },
      },
    });

    if (!room || (room.buyerId !== session.userId && room.sellerId !== session.userId)) {
      return NextResponse.json({ error: "채팅방을 찾을 수 없습니다." }, { status: 404 });
    }

    const isExpired = room.lastMessageAt
      ? Date.now() - room.lastMessageAt.getTime() > FOURTEEN_DAYS_MS
      : false;

    const isBuyer = session.userId === room.buyerId;
    const other = isBuyer ? room.seller : room.buyer;

    const [messagesResult, lastReadMessage] = await Promise.all([
      prisma.chatMessage.findMany({
        where: {
          roomId,
          ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
        },
        orderBy: { createdAt: "desc" },
        take: limit + 1,
        select: {
          id: true,
          senderId: true,
          senderType: true,
          content: true,
          imageUrl: true,
          isRead: true,
          readAt: true,
          channel: true,
          relatedOrderId: true,
          createdAt: true,
        },
      }),
      // 내가 보낸 메시지 중 상대방이 읽은 마지막 것
      prisma.chatMessage.findFirst({
        where: { roomId, senderId: session.userId, isRead: true },
        orderBy: { createdAt: "desc" },
        select: { id: true },
      }),
    ]);

    const hasMore = messagesResult.length > limit;
    const items = hasMore ? messagesResult.slice(0, limit) : messagesResult;
    const nextCursor = hasMore
      ? items[items.length - 1].createdAt.toISOString()
      : null;

    return NextResponse.json({
      messages: items.map((m) => ({
        ...m,
        createdAt: m.createdAt.toISOString(),
        readAt: m.readAt?.toISOString() || null,
      })),
      nextCursor,
      isExpired,
      roomStatus: room.status,
      currentUserId: session.userId,
      roomInfo: {
        otherUserId: other.id,
        otherName: other.sellerProfile?.shopName || other.name || other.email || "사용자",
        otherAvatarUrl: other.sellerProfile?.avatarUrl || null,
      },
      lastReadMessageId: lastReadMessage?.id || null,
    });
  } catch (err) {
    console.error("GET /api/chat/rooms/[roomId]/messages error:", err);
    return NextResponse.json(
      { error: "메시지를 불러오지 못했습니다." },
      { status: 500 },
    );
  }
}

/**
 * POST /api/chat/rooms/[roomId]/messages
 * 메시지 전송
 * Body: { content?: string, imageUrl?: string }
 */
export async function POST(request: Request, { params }: Props) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const { roomId } = await params;

    // 참여자 확인
    const room = await prisma.chatRoom.findUnique({
      where: { id: roomId },
      include: {
        buyer: { select: { name: true, sellerProfile: { select: { shopName: true } } } },
        seller: { select: { name: true, sellerProfile: { select: { shopName: true } } } },
      },
    });

    if (!room || (room.buyerId !== session.userId && room.sellerId !== session.userId)) {
      return NextResponse.json({ error: "채팅방을 찾을 수 없습니다." }, { status: 404 });
    }

    // 14일 무대화 체크
    if (room.lastMessageAt && Date.now() - room.lastMessageAt.getTime() > FOURTEEN_DAYS_MS) {
      // 1달 이내 새 주문 있으면 재활성화
      const thirtyDaysAgo = new Date(Date.now() - THIRTY_DAYS_MS);
      const recentOrder = await prisma.order.findFirst({
        where: {
          buyerId: room.buyerId,
          sellerId: room.sellerId,
          createdAt: { gte: thirtyDaysAgo },
          status: { notIn: ["PENDING", "FAILED", "CANCELLED"] },
        },
        select: { id: true },
      });

      if (!recentOrder) {
        // 종료 처리
        await prisma.chatRoom.update({
          where: { id: roomId },
          data: { status: "CLOSED", closedAt: new Date() },
        });
        return NextResponse.json(
          { error: "14일 이상 대화가 없어 채팅이 종료되었습니다. 새 주문 후 다시 시작할 수 있습니다." },
          { status: 403 },
        );
      }

      // 새 주문 있으면 재활성화
      await prisma.chatRoom.update({
        where: { id: roomId },
        data: { status: "ACTIVE", closedAt: null },
      });
    }

    // CLOSED 상태 체크
    if (room.status === "CLOSED") {
      return NextResponse.json(
        { error: "종료된 채팅방입니다. 새 주문 후 다시 시작할 수 있습니다." },
        { status: 403 },
      );
    }

    const body = await request.json();
    let { content, imageUrl } = body as { content?: string; imageUrl?: string };

    // content 또는 imageUrl 중 하나는 필수
    if (!content?.trim() && !imageUrl?.trim()) {
      return NextResponse.json(
        { error: "메시지 내용 또는 이미지가 필요합니다." },
        { status: 400 },
      );
    }

    // content 검증
    if (content) {
      content = stripHtml(content).trim();
      if (content.length > MAX_CONTENT_LENGTH) {
        return NextResponse.json(
          { error: `메시지는 ${MAX_CONTENT_LENGTH}자 이하여야 합니다.` },
          { status: 400 },
        );
      }
    }

    const isBuyer = session.userId === room.buyerId;
    const senderType = isBuyer ? "BUYER" : "SELLER";
    const recipientId = isBuyer ? room.sellerId : room.buyerId;

    const message = await prisma.$transaction(async (tx) => {
      const msg = await tx.chatMessage.create({
        data: {
          roomId,
          senderId: session.userId,
          senderType,
          content: content || null,
          imageUrl: imageUrl?.trim() || null,
        },
      });

      await tx.chatRoom.update({
        where: { id: roomId },
        data: { lastMessageAt: new Date() },
      });

      return msg;
    });

    // 알림 생성 (fire-and-forget)
    const senderName = isBuyer
      ? (room.buyer.name || "구매자")
      : (room.seller.sellerProfile?.shopName || room.seller.name || "셀러");

    createNotification(
      recipientId,
      "CHAT_MESSAGE",
      `${senderName}님의 새 메시지`,
      content ? (content.length > 50 ? content.slice(0, 50) + "..." : content) : "이미지를 보냈습니다.",
      `/chat/${roomId}`,
    );

    return NextResponse.json({
      id: message.id,
      senderId: message.senderId,
      senderType: message.senderType,
      content: message.content,
      imageUrl: message.imageUrl,
      isRead: message.isRead,
      createdAt: message.createdAt.toISOString(),
    }, { status: 201 });
  } catch (err) {
    console.error("POST /api/chat/rooms/[roomId]/messages error:", err);
    return NextResponse.json(
      { error: "메시지 전송에 실패했습니다." },
      { status: 500 },
    );
  }
}
