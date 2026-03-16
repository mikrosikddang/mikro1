import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { requireAdmin } from "@/lib/roleGuards";
import { createAdminActionLog } from "@/lib/adminActionLog";

export const runtime = "nodejs";

/**
 * POST /api/admin/coupons
 * 관리자 쿠폰 생성
 *
 * Body: {
 *   code: string,
 *   name: string,
 *   discountType: "PERCENT" | "FIXED",
 *   discountValue: number,
 *   minOrderAmount?: number,
 *   maxDiscountAmount?: number,
 *   totalCount?: number,
 *   expiresAt?: string (ISO date)
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const session = requireAdmin(await getSession());

    const body = await req.json();
    const {
      code,
      name,
      discountType,
      discountValue,
      minOrderAmount,
      maxDiscountAmount,
      totalCount,
      expiresAt,
    } = body as {
      code?: string;
      name?: string;
      discountType?: string;
      discountValue?: number;
      minOrderAmount?: number;
      maxDiscountAmount?: number;
      totalCount?: number;
      expiresAt?: string;
    };

    // Validation
    if (!code || typeof code !== "string" || code.trim().length === 0) {
      return NextResponse.json(
        { error: "쿠폰 코드를 입력해주세요" },
        { status: 400 },
      );
    }

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "쿠폰 이름을 입력해주세요" },
        { status: 400 },
      );
    }

    if (discountType !== "PERCENT" && discountType !== "FIXED") {
      return NextResponse.json(
        { error: "할인 유형은 PERCENT 또는 FIXED여야 합니다" },
        { status: 400 },
      );
    }

    if (typeof discountValue !== "number" || discountValue <= 0) {
      return NextResponse.json(
        { error: "할인 값은 0보다 커야 합니다" },
        { status: 400 },
      );
    }

    if (discountType === "PERCENT" && (discountValue < 1 || discountValue > 100)) {
      return NextResponse.json(
        { error: "퍼센트 할인은 1~100 사이여야 합니다" },
        { status: 400 },
      );
    }

    if (minOrderAmount !== undefined && minOrderAmount !== null) {
      if (typeof minOrderAmount !== "number" || minOrderAmount < 0) {
        return NextResponse.json(
          { error: "최소 주문 금액이 올바르지 않습니다" },
          { status: 400 },
        );
      }
    }

    if (totalCount !== undefined && totalCount !== null) {
      if (typeof totalCount !== "number" || totalCount < 1) {
        return NextResponse.json(
          { error: "발급 수량은 1 이상이어야 합니다" },
          { status: 400 },
        );
      }
    }

    const normalizedCode = code.trim().toUpperCase();

    // Check duplicate code
    const existing = await prisma.coupon.findUnique({
      where: { code: normalizedCode },
    });

    if (existing) {
      return NextResponse.json(
        { error: "이미 존재하는 쿠폰 코드입니다" },
        { status: 409 },
      );
    }

    // Create coupon
    const coupon = await prisma.$transaction(async (tx) => {
      const createdCoupon = await tx.coupon.create({
        data: {
          code: normalizedCode,
          name: name.trim(),
          discountType: discountType as "PERCENT" | "FIXED",
          discountValue,
          minOrderAmount: minOrderAmount ?? null,
          maxDiscountAmount: maxDiscountAmount ?? null,
          totalCount: totalCount ?? null,
          expiresAt: expiresAt ? new Date(expiresAt) : null,
        },
      });

      await createAdminActionLog(tx, {
        adminId: session.userId,
        entityType: "COUPON",
        entityId: createdCoupon.id,
        action: "COUPON_CREATED",
        summary: "관리자 쿠폰을 생성했습니다.",
        afterJson: {
          code: createdCoupon.code,
          name: createdCoupon.name,
          discountType: createdCoupon.discountType,
          discountValue: createdCoupon.discountValue,
          minOrderAmount: createdCoupon.minOrderAmount,
          maxDiscountAmount: createdCoupon.maxDiscountAmount,
          totalCount: createdCoupon.totalCount,
          isActive: createdCoupon.isActive,
          expiresAt: createdCoupon.expiresAt?.toISOString() ?? null,
        },
      });

      return createdCoupon;
    });

    return NextResponse.json({ ok: true, coupon });
  } catch (error) {
    if (error instanceof NextResponse) {
      return error;
    }
    console.error("POST /api/admin/coupons error:", error);
    return NextResponse.json(
      { error: "쿠폰 생성 중 오류가 발생했습니다" },
      { status: 500 },
    );
  }
}

/**
 * GET /api/admin/coupons
 * 관리자 쿠폰 목록
 *
 * Query: ?active=true|false (optional)
 */
export async function GET(req: NextRequest) {
  try {
    requireAdmin(await getSession());

    const { searchParams } = new URL(req.url);
    const activeParam = searchParams.get("active");

    const where: any = {};
    if (activeParam === "true") where.isActive = true;
    else if (activeParam === "false") where.isActive = false;

    const coupons = await prisma.coupon.findMany({
      where,
      include: {
        _count: { select: { userCoupons: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      coupons: coupons.map((c) => ({
        id: c.id,
        code: c.code,
        name: c.name,
        discountType: c.discountType,
        discountValue: c.discountValue,
        minOrderAmount: c.minOrderAmount,
        maxDiscountAmount: c.maxDiscountAmount,
        totalCount: c.totalCount,
        claimedCount: c._count.userCoupons,
        isActive: c.isActive,
        expiresAt: c.expiresAt,
        createdAt: c.createdAt,
      })),
    });
  } catch (error) {
    if (error instanceof NextResponse) {
      return error;
    }
    console.error("GET /api/admin/coupons error:", error);
    return NextResponse.json(
      { error: "쿠폰 목록 조회 중 오류가 발생했습니다" },
      { status: 500 },
    );
  }
}
