import { NextRequest, NextResponse } from "next/server";
import { OrderClaimReason, OrderClaimType, OrderClaimStatus, OrderStatus } from "@prisma/client";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createNotification, notifySellerClaimCreated } from "@/lib/notifications";

/**
 * 클레임(환불/교환) 정책
 * - 단순변심(CHANGED_MIND): 자동 승인. 왕복배송비를 환불액에서 차감.
 * - 그 외(DEFECT/WRONG_ITEM/DAMAGED_DELIVERY/OTHER): 셀러 검토 후 승인/반려.
 */
const ROUND_TRIP_SHIPPING_FEE_KRW = 6000; // 왕복 표준 배송비 (필요 시 셀러 정책 도입 가능)

const ALLOWED_TYPES: OrderClaimType[] = [OrderClaimType.REFUND, OrderClaimType.EXCHANGE];
const ALLOWED_REASONS: OrderClaimReason[] = [
  OrderClaimReason.CHANGED_MIND,
  OrderClaimReason.DEFECT,
  OrderClaimReason.WRONG_ITEM,
  OrderClaimReason.DAMAGED_DELIVERY,
  OrderClaimReason.OTHER,
];

const CLAIM_ELIGIBLE_STATUSES: OrderStatus[] = [
  OrderStatus.PAID,
  OrderStatus.SHIPPED,
  OrderStatus.COMPLETED,
];

/** 주문에 대한 클레임 목록 조회 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  }

  const { id: orderId } = await params;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, buyerId: true, sellerId: true },
  });

  if (!order) {
    return NextResponse.json({ error: "주문을 찾을 수 없습니다" }, { status: 404 });
  }

  if (order.buyerId !== session.userId && order.sellerId !== session.userId) {
    return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 });
  }

  const claims = await prisma.orderClaim.findMany({
    where: { orderId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(claims);
}

/** 새 클레임(환불/교환) 신청 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  }

  const { id: orderId } = await params;
  const body = await req.json();
  const type = body.type as OrderClaimType;
  const reason = body.reason as OrderClaimReason;
  const message = typeof body.message === "string" ? body.message.trim() : "";
  const photoUrls = Array.isArray(body.photoUrls)
    ? (body.photoUrls as unknown[]).filter((u): u is string => typeof u === "string").slice(0, 10)
    : [];

  if (!ALLOWED_TYPES.includes(type)) {
    return NextResponse.json({ error: "신청 종류가 올바르지 않습니다" }, { status: 400 });
  }
  if (!ALLOWED_REASONS.includes(reason)) {
    return NextResponse.json({ error: "신청 사유가 올바르지 않습니다" }, { status: 400 });
  }
  if (message.length > 1000) {
    return NextResponse.json({ error: "사유는 1000자 이하로 입력해주세요" }, { status: 400 });
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      orderNo: true,
      buyerId: true,
      sellerId: true,
      status: true,
      totalPayKrw: true,
      shippingFeeKrw: true,
    },
  });

  if (!order) {
    return NextResponse.json({ error: "주문을 찾을 수 없습니다" }, { status: 404 });
  }

  if (order.buyerId !== session.userId) {
    return NextResponse.json({ error: "본인 주문만 신청할 수 있습니다" }, { status: 403 });
  }

  if (!CLAIM_ELIGIBLE_STATUSES.includes(order.status)) {
    return NextResponse.json(
      { error: "환불/교환 신청이 가능한 주문 상태가 아닙니다" },
      { status: 409 },
    );
  }

  // 이미 진행 중인 클레임이 있는지 확인
  const existing = await prisma.orderClaim.findFirst({
    where: {
      orderId,
      status: { in: [OrderClaimStatus.REQUESTED, OrderClaimStatus.APPROVED] },
    },
  });
  if (existing) {
    return NextResponse.json(
      { error: "이미 진행 중인 환불/교환 신청이 있습니다" },
      { status: 409 },
    );
  }

  // 단순변심: 자동 승인 + 왕복배송비 자동 차감
  const isAutoApprove = reason === OrderClaimReason.CHANGED_MIND;
  const buyerBurdenKrw = isAutoApprove ? ROUND_TRIP_SHIPPING_FEE_KRW : 0;
  const refundAmountKrw = Math.max(0, order.totalPayKrw - buyerBurdenKrw);

  const now = new Date();
  const claim = await prisma.orderClaim.create({
    data: {
      orderId,
      type,
      reason,
      status: isAutoApprove ? OrderClaimStatus.APPROVED : OrderClaimStatus.REQUESTED,
      message: message || null,
      photoUrls,
      buyerBurdenKrw,
      refundAmountKrw,
      decidedAt: isAutoApprove ? now : null,
    },
  });

  // 알림 생성
  if (isAutoApprove) {
    await createNotification(
      order.buyerId,
      "ORDER_STATUS",
      type === OrderClaimType.REFUND
        ? "환불 신청이 자동 승인되었습니다"
        : "교환 신청이 자동 승인되었습니다",
      `주문번호 ${order.orderNo} · 단순변심 자동 승인. 왕복배송비 ${ROUND_TRIP_SHIPPING_FEE_KRW.toLocaleString()}원이 환불 금액에서 차감됩니다.`,
      `/orders/${orderId}`,
    );
    await createNotification(
      order.sellerId,
      "ORDER_STATUS",
      "단순변심 환불/교환 신청이 접수되었습니다",
      `주문번호 ${order.orderNo} · 자동 승인됨. 회수 후 처리해주세요.`,
      `/seller/orders/${orderId}`,
    );
  } else {
    await createNotification(
      order.sellerId,
      "ORDER_STATUS",
      type === OrderClaimType.REFUND
        ? "환불 요청이 접수되었습니다 (검토 필요)"
        : "교환 요청이 접수되었습니다 (검토 필요)",
      `주문번호 ${order.orderNo} · ${reasonLabel(reason)}. 검토 후 승인/반려해주세요.`,
      `/seller/orders/${orderId}`,
    );
  }

  // 셀러용 알림톡 (강조표기형 mikro_seller_claim_new_v1)
  await notifySellerClaimCreated({
    orderId: order.id,
    orderNo: order.orderNo,
    sellerId: order.sellerId,
    claimType: type === OrderClaimType.REFUND ? "환불" : "교환",
    reason: reasonLabel(reason),
  });

  return NextResponse.json(claim, { status: 201 });
}

function reasonLabel(reason: OrderClaimReason): string {
  switch (reason) {
    case OrderClaimReason.CHANGED_MIND:
      return "단순변심";
    case OrderClaimReason.DEFECT:
      return "상품 하자";
    case OrderClaimReason.WRONG_ITEM:
      return "오배송";
    case OrderClaimReason.DAMAGED_DELIVERY:
      return "배송 중 파손";
    case OrderClaimReason.OTHER:
      return "기타";
  }
}
