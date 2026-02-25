import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const runtime = "nodejs";

/**
 * GET /api/my/coupons
 * 내 쿠폰 목록 (사용가능 / 사용완료 / 만료 구분)
 *
 * Query: ?status=available|used|expired|all (default: all)
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || "all";
    const now = new Date();

    // Fetch all user coupons with coupon details
    const userCoupons = await prisma.userCoupon.findMany({
      where: { userId: session.userId },
      include: { coupon: true },
      orderBy: { createdAt: "desc" },
    });

    // Categorize coupons
    const categorized = userCoupons.map((uc) => {
      let couponStatus: "available" | "used" | "expired";

      if (uc.usedAt) {
        couponStatus = "used";
      } else if (
        (uc.coupon.expiresAt && uc.coupon.expiresAt < now) ||
        !uc.coupon.isActive
      ) {
        couponStatus = "expired";
      } else {
        couponStatus = "available";
      }

      return {
        id: uc.id,
        couponId: uc.couponId,
        name: uc.coupon.name,
        code: uc.coupon.code,
        discountType: uc.coupon.discountType,
        discountValue: uc.coupon.discountValue,
        minOrderAmount: uc.coupon.minOrderAmount,
        maxDiscountAmount: uc.coupon.maxDiscountAmount,
        expiresAt: uc.coupon.expiresAt,
        usedAt: uc.usedAt,
        status: couponStatus,
        createdAt: uc.createdAt,
      };
    });

    // Filter by status
    const filtered =
      status === "all"
        ? categorized
        : categorized.filter((c) => c.status === status);

    return NextResponse.json({
      coupons: filtered,
      counts: {
        available: categorized.filter((c) => c.status === "available").length,
        used: categorized.filter((c) => c.status === "used").length,
        expired: categorized.filter((c) => c.status === "expired").length,
      },
    });
  } catch (error) {
    console.error("GET /api/my/coupons error:", error);
    return NextResponse.json(
      { error: "쿠폰 목록 조회 중 오류가 발생했습니다" },
      { status: 500 },
    );
  }
}
