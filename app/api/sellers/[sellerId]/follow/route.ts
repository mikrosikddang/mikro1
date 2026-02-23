import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = Promise<{ sellerId: string }>;

/**
 * GET /api/sellers/[sellerId]/follow
 * 내가 이 판매자를 팔로우 중인지 확인
 */
export async function GET(req: NextRequest, { params }: { params: Params }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  }

  const { sellerId } = await params;

  try {
    const follow = await prisma.sellerFollow.findUnique({
      where: {
        followerId_sellerId: {
          followerId: session.userId,
          sellerId: sellerId,
        },
      },
    });

    return NextResponse.json({ followed: !!follow });
  } catch (error) {
    console.error("Error checking follow status:", error);
    return NextResponse.json(
      { error: "팔로우 상태 확인 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/sellers/[sellerId]/follow
 * 판매자 팔로우
 */
export async function POST(req: NextRequest, { params }: { params: Params }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  }

  const { sellerId } = await params;

  // 자기 자신 팔로우 금지
  if (session.userId === sellerId) {
    return NextResponse.json(
      { error: "자신을 팔로우할 수 없습니다" },
      { status: 409 }
    );
  }

  try {
    // 이미 팔로우 중인지 확인
    const existing = await prisma.sellerFollow.findUnique({
      where: {
        followerId_sellerId: {
          followerId: session.userId,
          sellerId: sellerId,
        },
      },
    });

    if (existing) {
      return NextResponse.json({ followed: true });
    }

    // 팔로우 생성
    await prisma.sellerFollow.create({
      data: {
        followerId: session.userId,
        sellerId: sellerId,
      },
    });

    return NextResponse.json({ followed: true });
  } catch (error) {
    console.error("Error following seller:", error);
    return NextResponse.json(
      { error: "팔로우 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/sellers/[sellerId]/follow
 * 판매자 언팔로우
 */
export async function DELETE(req: NextRequest, { params }: { params: Params }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  }

  const { sellerId } = await params;

  try {
    await prisma.sellerFollow.deleteMany({
      where: {
        followerId: session.userId,
        sellerId: sellerId,
      },
    });

    return NextResponse.json({ followed: false });
  } catch (error) {
    console.error("Error unfollowing seller:", error);
    return NextResponse.json(
      { error: "언팔로우 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
