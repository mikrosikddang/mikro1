import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const runtime = "nodejs";

/**
 * POST /api/coupons/claim
 * 쿠폰 코드 입력하여 발급 (트랜잭션으로 race condition 방지)
 *
 * Body: { code: string }
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
    const { code } = body as { code?: string };

    if (!code || typeof code !== "string" || code.trim().length === 0) {
      return NextResponse.json(
        { error: "쿠폰 코드를 입력해주세요" },
        { status: 400 },
      );
    }

    const normalizedCode = code.trim().toUpperCase();

    // Atomic: totalCount check + duplicate check + create in single transaction
    const result = await prisma.$transaction(async (tx) => {
      // Find coupon with count inside transaction
      const coupon = await tx.coupon.findUnique({
        where: { code: normalizedCode },
        include: {
          _count: { select: { userCoupons: true } },
        },
      });

      if (!coupon) {
        throw new Error("NOT_FOUND");
      }

      if (!coupon.isActive) {
        throw new Error("INACTIVE");
      }

      if (coupon.expiresAt && coupon.expiresAt < new Date()) {
        throw new Error("EXPIRED");
      }

      // Check total count limit (atomic within txn)
      if (coupon.totalCount !== null && coupon._count.userCoupons >= coupon.totalCount) {
        throw new Error("SOLD_OUT");
      }

      // Check if user already claimed (atomic within txn)
      const existing = await tx.userCoupon.findUnique({
        where: {
          userId_couponId: {
            userId: session.userId,
            couponId: coupon.id,
          },
        },
      });

      if (existing) {
        throw new Error("ALREADY_CLAIMED");
      }

      // Create user coupon (atomic within txn)
      const userCoupon = await tx.userCoupon.create({
        data: {
          userId: session.userId,
          couponId: coupon.id,
        },
      });

      return {
        userCouponId: userCoupon.id,
        name: coupon.name,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        minOrderAmount: coupon.minOrderAmount,
        maxDiscountAmount: coupon.maxDiscountAmount,
        expiresAt: coupon.expiresAt,
      };
    });

    return NextResponse.json({
      ok: true,
      coupon: {
        id: result.userCouponId,
        name: result.name,
        discountType: result.discountType,
        discountValue: result.discountValue,
        minOrderAmount: result.minOrderAmount,
        maxDiscountAmount: result.maxDiscountAmount,
        expiresAt: result.expiresAt,
      },
    });
  } catch (error: any) {
    const msg = error?.message || "";

    if (msg === "NOT_FOUND") {
      return NextResponse.json({ error: "유효하지 않은 쿠폰 코드입니다" }, { status: 404 });
    }
    if (msg === "INACTIVE") {
      return NextResponse.json({ error: "비활성화된 쿠폰입니다" }, { status: 400 });
    }
    if (msg === "EXPIRED") {
      return NextResponse.json({ error: "만료된 쿠폰입니다" }, { status: 400 });
    }
    if (msg === "SOLD_OUT") {
      return NextResponse.json({ error: "쿠폰 발급 수량이 소진되었습니다" }, { status: 409 });
    }
    if (msg === "ALREADY_CLAIMED") {
      return NextResponse.json({ error: "이미 발급받은 쿠폰입니다" }, { status: 409 });
    }

    console.error("POST /api/coupons/claim error:", error);
    return NextResponse.json(
      { error: "쿠폰 발급 중 오류가 발생했습니다" },
      { status: 500 },
    );
  }
}
