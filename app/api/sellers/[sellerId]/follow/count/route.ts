import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = Promise<{ sellerId: string }>;

/**
 * GET /api/sellers/[sellerId]/follow/count
 * 팔로워/팔로잉 카운트 조회 (self만 가능)
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

  try {
    // 팔로워 수 (나를 팔로우하는 사람)
    const followersCount = await prisma.sellerFollow.count({
      where: { sellerId: sellerId },
    });

    // 팔로잉 수 (내가 팔로우하는 사람)
    const followingCount = await prisma.sellerFollow.count({
      where: { followerId: sellerId },
    });

    return NextResponse.json({
      followers: followersCount,
      following: followingCount,
    });
  } catch (error) {
    console.error("Error fetching follow count:", error);
    return NextResponse.json(
      { error: "팔로우 수 조회 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
