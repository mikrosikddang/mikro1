import { NextResponse } from "next/server";
import { OrderStatus } from "@prisma/client";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireSeller } from "@/lib/roleGuards";
import { notifyOrderStatusChange } from "@/lib/notifications";
import { getCourierLabel, normalizeTrackingNo } from "@/lib/shipping";

export const runtime = "nodejs";

type Props = { params: Promise<{ id: string }> };

type ShipmentRequestBody = {
  courier?: string;
  trackingNo?: string;
};

const ACTIVE_CLAIM_STATUSES = ["REQUESTED", "APPROVED"] as const;

export async function PATCH(request: Request, { params }: Props) {
  try {
    const session = await requireSeller(await getSession());
    const { id } = await params;
    const body = (await request.json()) as ShipmentRequestBody;

    const courier = getCourierLabel(body.courier ?? "");
    const trackingNo = normalizeTrackingNo(body.trackingNo ?? "");

    if (!courier) {
      return NextResponse.json(
        { error: "택배사를 선택해주세요" },
        { status: 400 },
      );
    }

    if (!trackingNo || trackingNo.length < 6 || trackingNo.length > 40) {
      return NextResponse.json(
        { error: "송장번호를 올바르게 입력해주세요" },
        { status: 400 },
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${id} FOR UPDATE`;

      const order = await tx.order.findUnique({
        where: { id },
        include: {
          claims: {
            where: { status: { in: [...ACTIVE_CLAIM_STATUSES] } },
            select: { id: true },
          },
          shipment: true,
        },
      });

      if (!order || order.sellerId !== session.userId) {
        throw new Error("ORDER_NOT_FOUND");
      }

      if (order.claims.length > 0) {
        throw new Error("ACTIVE_CLAIM_EXISTS");
      }

      if (order.status !== OrderStatus.PAID && order.status !== OrderStatus.SHIPPED) {
        throw new Error("INVALID_STATUS");
      }

      const shouldNotify = order.status === OrderStatus.PAID;
      const shippedAt = order.shipment?.shippedAt ?? new Date();

      const shipment = await tx.shipment.upsert({
        where: { orderId: id },
        update: {
          courier,
          trackingNo,
          shippedAt,
        },
        create: {
          orderId: id,
          courier,
          trackingNo,
          shippedAt,
        },
      });

      const updatedOrder = shouldNotify
        ? await tx.order.update({
            where: { id },
            data: { status: OrderStatus.SHIPPED },
          })
        : order;

      return {
        order: updatedOrder,
        shipment,
        shouldNotify,
      };
    });

    if (result.shouldNotify) {
      await notifyOrderStatusChange(
        result.order.id,
        result.order.orderNo,
        result.order.buyerId,
        result.order.sellerId,
        OrderStatus.SHIPPED,
      );
    }

    return NextResponse.json({
      ok: true,
      order: result.order,
      shipment: result.shipment,
      notified: result.shouldNotify,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (message === "ORDER_NOT_FOUND") {
      return NextResponse.json({ error: "주문을 찾을 수 없습니다" }, { status: 404 });
    }

    if (message === "ACTIVE_CLAIM_EXISTS") {
      return NextResponse.json(
        { error: "진행 중인 환불/교환 신청이 있어 송장을 등록할 수 없습니다" },
        { status: 409 },
      );
    }

    if (message === "INVALID_STATUS") {
      return NextResponse.json(
        { error: "결제 완료 또는 배송중 주문만 송장을 등록할 수 있습니다" },
        { status: 400 },
      );
    }

    if (error instanceof NextResponse) {
      return error;
    }

    console.error("PATCH /api/seller/orders/[id]/shipment error:", error);
    return NextResponse.json(
      { error: "송장 정보 저장 중 오류가 발생했습니다" },
      { status: 500 },
    );
  }
}
