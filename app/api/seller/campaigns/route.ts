import { NextRequest, NextResponse } from "next/server";
import { CampaignStatus } from "@prisma/client";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildDefaultCreatorSlug, normalizeCreatorSlug } from "@/lib/sellerTypes";
import { hasSellerPortalAccess } from "@/lib/sellerPortal";

export const runtime = "nodejs";

function normalizeSlug(value: string) {
  return normalizeCreatorSlug(value).replace(/_/g, "-");
}

async function uniqueCampaignSlug(baseInput: string) {
  const base = normalizeSlug(baseInput) || `campaign-${Date.now().toString(36)}`;
  let candidate = base;
  let count = 1;
  while (true) {
    const exists = await prisma.campaign.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!exists) return candidate;
    count += 1;
    candidate = `${base}-${count}`;
  }
}

function buildRefCode(base: string) {
  const normalized = normalizeSlug(base) || "campaign";
  return `${normalized}-${Math.random().toString(36).slice(2, 6)}`;
}

async function uniqueRefCode(baseInput: string) {
  while (true) {
    const candidate = buildRefCode(baseInput);
    const exists = await prisma.campaign.findUnique({
      where: { refCode: candidate },
      select: { id: true },
    });
    if (!exists) return candidate;
  }
}

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  }
  if (!(await hasSellerPortalAccess(session))) {
    return NextResponse.json(
      { error: "판매자 권한이 필요합니다" },
      { status: 403 },
    );
  }

  try {
    const [sellerProfile, products, campaigns, commissions] = await Promise.all([
      prisma.sellerProfile.findUnique({
        where: { userId: session.userId },
        select: {
          shopName: true,
          sellerKind: true,
          creatorSlug: true,
          commissionRateBps: true,
        },
      }),
      prisma.product.findMany({
        where: {
          sellerId: session.userId,
          isDeleted: false,
        },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          title: true,
          isActive: true,
          priceKrw: true,
          salePriceKrw: true,
          images: {
            where: { kind: "MAIN" },
            orderBy: { sortOrder: "asc" },
            take: 1,
            select: { url: true },
          },
        },
      }),
      prisma.campaign.findMany({
        where: { sellerId: session.userId },
        orderBy: { createdAt: "desc" },
        include: {
          coupon: {
            select: {
              code: true,
              name: true,
            },
          },
          products: {
            orderBy: { sortOrder: "asc" },
            include: {
              product: {
                select: {
                  id: true,
                  title: true,
                  images: {
                    where: { kind: "MAIN" },
                    orderBy: { sortOrder: "asc" },
                    take: 1,
                    select: { url: true },
                  },
                },
              },
            },
          },
          _count: {
            select: {
              visits: true,
              orderAttributions: true,
              orderCommissions: true,
            },
          },
        },
      }),
      prisma.orderCommission.findMany({
        where: {
          campaign: {
            sellerId: session.userId,
          },
        },
        select: {
          campaignId: true,
          commissionAmountKrw: true,
          commissionBaseKrw: true,
          status: true,
        },
      }),
    ]);

    const commissionMap = commissions.reduce<
      Record<
        string,
        {
          grossSalesKrw: number;
          expectedCommissionKrw: number;
          payableCommissionKrw: number;
        }
      >
    >((acc, item) => {
      if (!item.campaignId) return acc;
      if (!acc[item.campaignId]) {
        acc[item.campaignId] = {
          grossSalesKrw: 0,
          expectedCommissionKrw: 0,
          payableCommissionKrw: 0,
        };
      }
      acc[item.campaignId].grossSalesKrw += item.commissionBaseKrw;
      acc[item.campaignId].expectedCommissionKrw += item.commissionAmountKrw;
      if (item.status === "PAYABLE" || item.status === "SETTLED") {
        acc[item.campaignId].payableCommissionKrw += item.commissionAmountKrw;
      }
      return acc;
    }, {});

    return NextResponse.json({
      sellerProfile,
      products,
      campaigns: campaigns.map((campaign) => ({
        ...campaign,
        metrics: {
          visits: campaign._count.visits,
          attributedOrders: campaign._count.orderAttributions,
          grossSalesKrw: commissionMap[campaign.id]?.grossSalesKrw ?? 0,
          expectedCommissionKrw:
            commissionMap[campaign.id]?.expectedCommissionKrw ?? 0,
          payableCommissionKrw:
            commissionMap[campaign.id]?.payableCommissionKrw ?? 0,
        },
      })),
    });
  } catch (error) {
    console.error("GET /api/seller/campaigns error:", error);
    return NextResponse.json(
      { error: "캠페인 정보를 불러오지 못했습니다" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  }
  if (!(await hasSellerPortalAccess(session))) {
    return NextResponse.json(
      { error: "판매자 권한이 필요합니다" },
      { status: 403 },
    );
  }

  try {
    const body = (await request.json()) as {
      title?: string;
      description?: string | null;
      landingHeadline?: string | null;
      landingBody?: string | null;
      productIds?: string[];
      startsAt?: string | null;
      endsAt?: string | null;
      defaultCommissionRateBps?: number | null;
      status?: CampaignStatus;
      couponId?: string | null;
    };

    const title = body.title?.trim();
    if (!title) {
      return NextResponse.json(
        { error: "캠페인명을 입력해주세요" },
        { status: 400 },
      );
    }
    if (!body.productIds || body.productIds.length === 0) {
      return NextResponse.json(
        { error: "캠페인에 연결할 상품을 1개 이상 선택해주세요" },
        { status: 400 },
      );
    }
    if (
      body.defaultCommissionRateBps != null &&
      (!Number.isFinite(body.defaultCommissionRateBps) ||
        body.defaultCommissionRateBps < 0 ||
        body.defaultCommissionRateBps > 10000)
    ) {
      return NextResponse.json(
        { error: "캠페인 수수료율은 0~10000bps 범위여야 합니다" },
        { status: 400 },
      );
    }

    const sellerProfile = await prisma.sellerProfile.findUnique({
      where: { userId: session.userId },
      select: {
        creatorSlug: true,
        commissionRateBps: true,
        shopName: true,
      },
    });
    if (!sellerProfile) {
      return NextResponse.json(
        { error: "판매자 프로필을 찾을 수 없습니다" },
        { status: 404 },
      );
    }

    const ownedProducts = await prisma.product.findMany({
      where: {
        sellerId: session.userId,
        id: { in: body.productIds },
        isDeleted: false,
      },
      select: { id: true },
    });
    if (ownedProducts.length !== body.productIds.length) {
      return NextResponse.json(
        { error: "본인 상점 상품만 캠페인에 연결할 수 있습니다" },
        { status: 400 },
      );
    }

    const slug = await uniqueCampaignSlug(title);
    const refSeed =
      sellerProfile.creatorSlug ||
      buildDefaultCreatorSlug(sellerProfile.shopName || title);
    const refCode = await uniqueRefCode(`${refSeed}-${title}`);
    const campaign = await prisma.campaign.create({
      data: {
        sellerId: session.userId,
        title,
        slug,
        description: body.description?.trim() || null,
        landingHeadline: body.landingHeadline?.trim() || null,
        landingBody: body.landingBody?.trim() || null,
        startsAt: body.startsAt ? new Date(body.startsAt) : null,
        endsAt: body.endsAt ? new Date(body.endsAt) : null,
        status: body.status ?? CampaignStatus.ACTIVE,
        defaultCommissionRateBps:
          body.defaultCommissionRateBps ?? sellerProfile.commissionRateBps,
        couponId: body.couponId || null,
        refCode,
        products: {
          create: body.productIds.map((productId, index) => ({
            productId,
            sortOrder: index,
          })),
        },
      },
      include: {
        products: {
          include: {
            product: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({ ok: true, campaign });
  } catch (error) {
    console.error("POST /api/seller/campaigns error:", error);
    return NextResponse.json(
      { error: "캠페인 생성 중 오류가 발생했습니다" },
      { status: 500 },
    );
  }
}
