import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { requireAdmin } from "@/lib/roleGuards";
import { createAdminActionLog } from "@/lib/adminActionLog";

type Props = {
  params: Promise<{ id: string }>;
};

export async function POST(request: NextRequest, { params }: Props) {
  try {
    const session = requireAdmin(await getSession());
    const { id } = await params;
    const body = (await request.json()) as {
      note?: string;
      summary?: string;
    };

    const note = body.note?.trim();
    if (!note || note.length < 5) {
      return NextResponse.json(
        { error: "메모는 최소 5자 이상 입력해주세요" },
        { status: 400 },
      );
    }

    const order = await prisma.order.findUnique({
      where: { id },
      select: {
        id: true,
        orderNo: true,
        status: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: "주문을 찾을 수 없습니다" },
        { status: 404 },
      );
    }

    const log = await createAdminActionLog(prisma, {
      adminId: session.userId,
      entityType: "ORDER",
      entityId: order.id,
      action: "ORDER_NOTE_ADDED",
      summary: body.summary?.trim() || "주문 운영 메모를 추가했습니다.",
      reason: note,
      metadata: {
        orderNo: order.orderNo,
        status: order.status,
      },
    });

    return NextResponse.json({ ok: true, log });
  } catch (error) {
    if (error instanceof NextResponse) {
      return error;
    }
    console.error("POST /api/admin/orders/[id]/notes error:", error);
    return NextResponse.json(
      { error: "주문 메모 저장에 실패했습니다" },
      { status: 500 },
    );
  }
}
