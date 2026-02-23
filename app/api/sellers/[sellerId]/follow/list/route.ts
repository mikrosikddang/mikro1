import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = Promise<{ sellerId: string }>;

/**
 * GET /api/sellers/[sellerId]/follow/list?type=followers|following&cursor=&limit=20
 * 팔로워/팔로잉 리스트 조회 (self만 가능)
 */
export async function GET(req: NextRequest, { params }: { params: Params }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  }

  const { sellerId } = await params;

  // self만 접근 가능
  if (session.userId !== sellerId) {
    return NextResponse.json(
      { error: "권한이 없습니다" },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") || "followers";
  const cursor = searchParams.get("cursor");
  const limit = parseInt(searchParams.get("limit") || "20", 10);

  try {
    if (type === "followers") {
      // 나를 팔로우하는 사람들
      const follows = await prisma.sellerFollow.findMany({
        where: {
          sellerId: sellerId,
          ...(cursor && { id: { lt: cursor } }),
        },
        orderBy: { createdAt: "desc" },
        take: limit + 1,
        include: {
          follower: {
            select: {
              id: true,
              name: true,
              sellerProfile: {
                select: {
                  shopName: true,
                  avatarUrl: true,
                },
              },
            },
          },
        },
      });

      const hasMore = follows.length > limit;
      const items = hasMore ? follows.slice(0, limit) : follows;
      const nextCursor = hasMore ? items[items.length - 1].id : null;

      const users = items.map((f) => ({
        id: f.follower.id,
        displayName: f.follower.sellerProfile?.shopName || f.follower.name || "사용자",
        avatarUrl: f.follower.sellerProfile?.avatarUrl || null,
      }));

      return NextResponse.json({ users, nextCursor });
    } else if (type === "following") {
      // 내가 팔로우하는 사람들
      const follows = await prisma.sellerFollow.findMany({
        where: {
          followerId: sellerId,
          ...(cursor && { id: { lt: cursor } }),
        },
        orderBy: { createdAt: "desc" },
        take: limit + 1,
        include: {
          seller: {
            select: {
              id: true,
              name: true,
              sellerProfile: {
                select: {
                  shopName: true,
                  avatarUrl: true,
                },
              },
            },
          },
        },
      });

      const hasMore = follows.length > limit;
      const items = hasMore ? follows.slice(0, limit) : follows;
      const nextCursor = hasMore ? items[items.length - 1].id : null;

      const users = items.map((f) => ({
        id: f.seller.id,
        displayName: f.seller.sellerProfile?.shopName || f.seller.name || "사용자",
        avatarUrl: f.seller.sellerProfile?.avatarUrl || null,
      }));

      return NextResponse.json({ users, nextCursor });
    } else {
      return NextResponse.json(
        { error: "type은 followers 또는 following이어야 합니다" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Error fetching follow list:", error);
    return NextResponse.json(
      { error: "팔로우 리스트 조회 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
