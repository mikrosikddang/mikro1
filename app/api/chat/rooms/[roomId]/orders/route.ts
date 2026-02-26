import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const runtime = "nodejs";

type Props = { params: Promise<{ roomId: string }> };

/**
 * GET /api/chat/rooms/[roomId]/orders
 * 해당 채팅방의 주문 히스토리 (buyer-seller 쌍)
 */
export async function GET(_request: Request, { params }: Props) {
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

    const orders = await prisma.order.findMany({
      where: {
        buyerId: room.buyerId,
        sellerId: room.sellerId,
      },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        orderNo: true,
        status: true,
        totalAmountKrw: true,
        createdAt: true,
        items: {
          take: 1,
          select: {
            product: {
              select: {
                title: true,
                images: {
                  where: { kind: "MAIN" },
                  orderBy: { sortOrder: "asc" },
                  take: 1,
                  select: { url: true },
                },
              },
            },
            quantity: true,
          },
        },
      },
    });

    const result = orders.map((o) => {
      const firstItem = o.items[0];
      return {
        id: o.id,
        orderNo: o.orderNo,
        status: o.status,
        totalPayKrw: o.totalAmountKrw,
        createdAt: o.createdAt.toISOString(),
        firstItemTitle: firstItem?.product.title || null,
        productImageUrl: firstItem?.product.images[0]?.url || null,
        itemCount: o.items.length,
      };
    });

    return NextResponse.json({ orders: result });
  } catch (err) {
    console.error("GET /api/chat/rooms/[roomId]/orders error:", err);
    return NextResponse.json(
      { error: "주문 내역을 불러오지 못했습니다." },
      { status: 500 },
    );
  }
}
