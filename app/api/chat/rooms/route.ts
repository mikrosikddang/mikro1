import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const runtime = "nodejs";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * POST /api/chat/rooms
 * 채팅방 생성 또는 재활성화
 * Body: { sellerId?: string, buyerId?: string }
 * - 구매자가 시작: sellerId 전달
 * - 셀러가 시작: buyerId 전달
 */
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const body = await request.json();
    const { sellerId, buyerId } = body as { sellerId?: string; buyerId?: string };

    let finalBuyerId: string;
    let finalSellerId: string;

    if (sellerId) {
      // 구매자가 시작
      finalBuyerId = session.userId;
      finalSellerId = sellerId;
    } else if (buyerId) {
      // 셀러가 시작
      finalBuyerId = buyerId;
      finalSellerId = session.userId;
    } else {
      return NextResponse.json({ error: "sellerId 또는 buyerId가 필요합니다." }, { status: 400 });
    }

    // 자기 자신 차단
    if (finalBuyerId === finalSellerId) {
      return NextResponse.json({ error: "자신에게 채팅을 보낼 수 없습니다." }, { status: 400 });
    }

    // 상대방 존재 확인
    const [buyer, seller] = await Promise.all([
      prisma.user.findUnique({ where: { id: finalBuyerId }, select: { id: true } }),
      prisma.user.findUnique({
        where: { id: finalSellerId },
        include: { sellerProfile: true },
      }),
    ]);

    if (!buyer) {
      return NextResponse.json({ error: "구매자를 찾을 수 없습니다." }, { status: 404 });
    }
    if (!seller || !seller.sellerProfile) {
      return NextResponse.json({ error: "셀러를 찾을 수 없습니다." }, { status: 404 });
    }

    // 1달 이내 주문 존재 확인 (buyer→seller 방향)
    const thirtyDaysAgo = new Date(Date.now() - THIRTY_DAYS_MS);
    const recentOrder = await prisma.order.findFirst({
      where: {
        buyerId: finalBuyerId,
        sellerId: finalSellerId,
        createdAt: { gte: thirtyDaysAgo },
        status: { notIn: ["PENDING", "FAILED", "CANCELLED"] },
      },
      select: { id: true },
    });

    if (!recentOrder) {
      return NextResponse.json(
        { error: "최근 1개월 내 주문 내역이 있어야 채팅을 시작할 수 있습니다." },
        { status: 403 },
      );
    }

    // 기존 방 확인 → 재활성화 or 신규 생성
    const existingRoom = await prisma.chatRoom.findUnique({
      where: {
        buyerId_sellerId: {
          buyerId: finalBuyerId,
          sellerId: finalSellerId,
        },
      },
    });

    if (existingRoom) {
      if (existingRoom.status === "CLOSED") {
        const updated = await prisma.chatRoom.update({
          where: { id: existingRoom.id },
          data: { status: "ACTIVE", closedAt: null },
        });
        return NextResponse.json({ roomId: updated.id, reactivated: true });
      }
      return NextResponse.json({ roomId: existingRoom.id, reactivated: false });
    }

    const room = await prisma.chatRoom.create({
      data: {
        buyerId: finalBuyerId,
        sellerId: finalSellerId,
      },
    });

    return NextResponse.json({ roomId: room.id, reactivated: false }, { status: 201 });
  } catch (err) {
    console.error("POST /api/chat/rooms error:", err);
    return NextResponse.json(
      { error: "채팅방 생성에 실패했습니다." },
      { status: 500 },
    );
  }
}

/**
 * GET /api/chat/rooms
 * 내 채팅방 목록 (구매자/셀러 양쪽)
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const rooms = await prisma.chatRoom.findMany({
      where: {
        OR: [
          { buyerId: session.userId },
          { sellerId: session.userId },
        ],
      },
      orderBy: { lastMessageAt: { sort: "desc", nulls: "last" } },
      include: {
        buyer: {
          select: {
            id: true,
            name: true,
            sellerProfile: { select: { shopName: true, avatarUrl: true } },
          },
        },
        seller: {
          select: {
            id: true,
            name: true,
            sellerProfile: { select: { shopName: true, avatarUrl: true } },
          },
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            content: true,
            imageUrl: true,
            createdAt: true,
            senderType: true,
          },
        },
      },
    });

    // Count unread messages per room
    const roomIds = rooms.map((r) => r.id);
    const unreadCounts = await prisma.chatMessage.groupBy({
      by: ["roomId"],
      where: {
        roomId: { in: roomIds },
        senderId: { not: session.userId },
        isRead: false,
      },
      _count: true,
    });

    const unreadMap = new Map(unreadCounts.map((u) => [u.roomId, u._count]));

    const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;

    const result = rooms.map((room) => {
      const isBuyer = room.buyerId === session.userId;
      const other = isBuyer ? room.seller : room.buyer;
      const lastMessage = room.messages[0] || null;
      const isExpired = room.lastMessageAt
        ? Date.now() - room.lastMessageAt.getTime() > FOURTEEN_DAYS_MS
        : false;

      return {
        id: room.id,
        status: room.status,
        isExpired,
        myRole: isBuyer ? "BUYER" : "SELLER",
        other: {
          id: other.id,
          name: other.sellerProfile?.shopName || other.name || "알 수 없음",
          avatarUrl: other.sellerProfile?.avatarUrl || null,
        },
        lastMessage: lastMessage
          ? {
              content: lastMessage.content,
              imageUrl: lastMessage.imageUrl,
              createdAt: lastMessage.createdAt.toISOString(),
              senderType: lastMessage.senderType,
            }
          : null,
        unreadCount: unreadMap.get(room.id) || 0,
        lastMessageAt: room.lastMessageAt?.toISOString() || null,
        createdAt: room.createdAt.toISOString(),
      };
    });

    return NextResponse.json({ rooms: result });
  } catch (err) {
    console.error("GET /api/chat/rooms error:", err);
    return NextResponse.json(
      { error: "채팅방 목록을 불러오지 못했습니다." },
      { status: 500 },
    );
  }
}
