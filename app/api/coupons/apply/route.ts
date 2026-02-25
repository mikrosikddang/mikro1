import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const runtime = "nodejs";

/**
 * POST /api/coupons/apply
 * 체크아웃 시 쿠폰 적용 검증 + 할인 금액 계산
 *
 * Body: { couponId: string (UserCoupon.id), orderAmount: number }
 * Response: { ok, discountAmount, finalAmount }
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    const body = await req.json();
    const { couponId, orderAmount } = body as {
      couponId?: string;
      orderAmount?: number;
    };

    if (!couponId) {
      return NextResponse.json(
        { error: "쿠폰을 선택해주세요" },
        { status: 400 },
      );
    }

    if (typeof orderAmount !== "number" || orderAmount <= 0) {
      return NextResponse.json(
        { error: "주문 금액이 올바르지 않습니다" },
        { status: 400 },
      );
    }

    // Fetch user coupon with coupon details
    const userCoupon = await prisma.userCoupon.findUnique({
      where: { id: couponId },
      include: { coupon: true },
    });

    if (!userCoupon) {
      return NextResponse.json(
        { error: "쿠폰을 찾을 수 없습니다" },
        { status: 404 },
      );
    }

    // Ownership check
    if (userCoupon.userId !== session.userId) {
      return NextResponse.json(
        { error: "본인의 쿠폰만 사용할 수 있습니다" },
        { status: 403 },
      );
    }

    // Already used
    if (userCoupon.usedAt) {
      return NextResponse.json(
        { error: "이미 사용된 쿠폰입니다" },
        { status: 400 },
      );
    }

    const coupon = userCoupon.coupon;

    // Coupon active check
    if (!coupon.isActive) {
      return NextResponse.json(
        { error: "비활성화된 쿠폰입니다" },
        { status: 400 },
      );
    }

    // Expiry check
    if (coupon.expiresAt && coupon.expiresAt < new Date()) {
      return NextResponse.json(
        { error: "만료된 쿠폰입니다" },
        { status: 400 },
      );
    }

    // Minimum order amount check
    if (coupon.minOrderAmount && orderAmount < coupon.minOrderAmount) {
      return NextResponse.json(
        {
          error: `최소 주문 금액 ${coupon.minOrderAmount.toLocaleString()}원 이상부터 사용 가능합니다`,
        },
        { status: 400 },
      );
    }

    // Calculate discount
    let discountAmount: number;

    if (coupon.discountType === "PERCENT") {
      discountAmount = Math.floor(orderAmount * (coupon.discountValue / 100));
      // Cap at maxDiscountAmount
      if (coupon.maxDiscountAmount && discountAmount > coupon.maxDiscountAmount) {
        discountAmount = coupon.maxDiscountAmount;
      }
    } else {
      // FIXED
      discountAmount = coupon.discountValue;
    }

    // Discount cannot exceed order amount
    if (discountAmount > orderAmount) {
      discountAmount = orderAmount;
    }

    const finalAmount = orderAmount - discountAmount;

    return NextResponse.json({
      ok: true,
      discountAmount,
      finalAmount,
      coupon: {
        name: coupon.name,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
      },
    });
  } catch (error) {
    console.error("POST /api/coupons/apply error:", error);
    return NextResponse.json(
      { error: "쿠폰 적용 중 오류가 발생했습니다" },
      { status: 500 },
    );
  }
}
