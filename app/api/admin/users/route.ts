import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { requireAdmin } from "@/lib/roleGuards";

export const runtime = "nodejs";

/**
 * GET /api/admin/users
 * List all users with optional role filter and search
 *
 * Query params:
 * - role: CUSTOMER | SELLER | ADMIN (optional, default ALL)
 * - search: name/email/phone search (optional)
 * - cursor: pagination cursor (userId)
 * - limit: page size (default 30)
 *
 * Auth: ADMIN only
 */
export async function GET(request: NextRequest) {
  try {
    requireAdmin(await getSession());

    const { searchParams } = new URL(request.url);
    const roleParam = searchParams.get("role");
    const search = searchParams.get("search")?.trim();
    const cursor = searchParams.get("cursor");
    const limit = Math.min(Number(searchParams.get("limit")) || 30, 100);

    // Build where clause
    const where: any = {};

    if (roleParam === "CUSTOMER") {
      where.role = "CUSTOMER";
    } else if (roleParam === "SELLER") {
      where.role = { in: ["SELLER_PENDING", "SELLER_ACTIVE"] };
    } else if (roleParam === "ADMIN") {
      where.role = "ADMIN";
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { phone: { contains: search } },
      ];
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        phone: true,
        name: true,
        role: true,
        provider: true,
        createdAt: true,
        sellerProfile: {
          select: {
            id: true,
            shopName: true,
            status: true,
            sellerKind: true,
            storeSlug: true,
          },
        },
        _count: {
          select: {
            orders: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const hasMore = users.length > limit;
    const items = hasMore ? users.slice(0, limit) : users;
    const nextCursor = hasMore ? items[items.length - 1].id : null;

    // Counts per role
    const [totalAll, totalCustomers, totalSellers, totalAdmins] =
      await Promise.all([
        prisma.user.count({ where: search ? where : undefined }),
        prisma.user.count({
          where: { ...where, role: "CUSTOMER" },
        }),
        prisma.user.count({
          where: {
            ...where,
            role: { in: ["SELLER_PENDING", "SELLER_ACTIVE"] },
          },
        }),
        prisma.user.count({
          where: { ...where, role: "ADMIN" },
        }),
      ]);

    return NextResponse.json({
      users: items,
      nextCursor,
      counts: {
        all: totalAll,
        customer: totalCustomers,
        seller: totalSellers,
        admin: totalAdmins,
      },
    });
  } catch (error) {
    if (error instanceof NextResponse) {
      return error;
    }
    console.error("GET /api/admin/users error:", error);
    return NextResponse.json(
      { error: "사용자 목록을 불러오지 못했습니다" },
      { status: 500 },
    );
  }
}
