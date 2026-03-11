import type { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  ATTRIBUTION_COOKIE_KEYS,
  sanitizeAttributionValue,
} from "@/lib/attributionShared";

export type AttributionSnapshot = {
  refCode: string | null;
  campaignKey: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  landingPath: string | null;
  firstTouchedAt: Date | null;
  lastTouchedAt: Date | null;
  sessionKey: string | null;
};

type AttributionDbClient = Prisma.TransactionClient | typeof prisma;

function parseDate(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function readAttributionFromRequest(request: NextRequest): AttributionSnapshot {
  const get = (key: string) => request.cookies.get(key)?.value;
  return {
    refCode: sanitizeAttributionValue(get(ATTRIBUTION_COOKIE_KEYS.ref)),
    campaignKey: sanitizeAttributionValue(get(ATTRIBUTION_COOKIE_KEYS.campaign)),
    utmSource: sanitizeAttributionValue(get(ATTRIBUTION_COOKIE_KEYS.utmSource)),
    utmMedium: sanitizeAttributionValue(get(ATTRIBUTION_COOKIE_KEYS.utmMedium)),
    utmCampaign: sanitizeAttributionValue(get(ATTRIBUTION_COOKIE_KEYS.utmCampaign)),
    landingPath: sanitizeAttributionValue(get(ATTRIBUTION_COOKIE_KEYS.landingPath)),
    firstTouchedAt: parseDate(get(ATTRIBUTION_COOKIE_KEYS.firstTouchedAt)),
    lastTouchedAt: parseDate(get(ATTRIBUTION_COOKIE_KEYS.lastTouchedAt)),
    sessionKey: sanitizeAttributionValue(get(ATTRIBUTION_COOKIE_KEYS.sessionKey)),
  };
}

export async function resolveAttribution(
  db: AttributionDbClient,
  snapshot: AttributionSnapshot,
) {
  let campaign =
    snapshot.campaignKey
      ? await db.campaign.findFirst({
          where: {
            status: "ACTIVE",
            OR: [
              { id: snapshot.campaignKey },
              { slug: snapshot.campaignKey },
              { refCode: snapshot.campaignKey },
            ],
          },
          select: {
            id: true,
            sellerId: true,
            refCode: true,
            slug: true,
            defaultCommissionRateBps: true,
          },
        })
      : null;

  let referrerProfile =
    snapshot.refCode
      ? await db.sellerProfile.findFirst({
          where: { creatorSlug: snapshot.refCode },
          select: { userId: true, creatorSlug: true, commissionRateBps: true },
        })
      : null;

  if (!campaign && snapshot.refCode) {
    campaign = await db.campaign.findFirst({
      where: {
        refCode: snapshot.refCode,
        status: "ACTIVE",
      },
      select: {
        id: true,
        sellerId: true,
        refCode: true,
        slug: true,
        defaultCommissionRateBps: true,
      },
    });
  }

  if (!referrerProfile && campaign?.sellerId) {
    referrerProfile = await db.sellerProfile.findUnique({
      where: { userId: campaign.sellerId },
      select: { userId: true, creatorSlug: true, commissionRateBps: true },
    });
  }

  return {
    campaignId: campaign?.id ?? null,
    referrerUserId: referrerProfile?.userId ?? campaign?.sellerId ?? null,
    creatorSlug: referrerProfile?.creatorSlug ?? snapshot.refCode ?? null,
    refCode: campaign?.refCode ?? snapshot.refCode ?? null,
    commissionRateBps:
      campaign?.defaultCommissionRateBps ??
      referrerProfile?.commissionRateBps ??
      null,
  };
}

export async function upsertUserAttribution(
  db: AttributionDbClient,
  userId: string,
  snapshot: AttributionSnapshot,
) {
  const resolved = await resolveAttribution(db, snapshot);
  const hasAny =
    Boolean(resolved.campaignId) ||
    Boolean(resolved.refCode) ||
    Boolean(snapshot.utmSource) ||
    Boolean(snapshot.utmMedium) ||
    Boolean(snapshot.utmCampaign);

  if (!hasAny) return null;

  return db.userAttribution.upsert({
    where: { userId },
    create: {
      userId,
      campaignId: resolved.campaignId,
      refCode: resolved.refCode,
      creatorSlug: resolved.creatorSlug,
      utmSource: snapshot.utmSource,
      utmMedium: snapshot.utmMedium,
      utmCampaign: snapshot.utmCampaign,
      landingPath: snapshot.landingPath,
      firstTouchedAt: snapshot.firstTouchedAt ?? snapshot.lastTouchedAt ?? new Date(),
      lastTouchedAt: snapshot.lastTouchedAt ?? new Date(),
    },
    update: {
      campaignId: resolved.campaignId ?? undefined,
      refCode: resolved.refCode ?? undefined,
      creatorSlug: resolved.creatorSlug ?? undefined,
      utmSource: snapshot.utmSource ?? undefined,
      utmMedium: snapshot.utmMedium ?? undefined,
      utmCampaign: snapshot.utmCampaign ?? undefined,
      landingPath: snapshot.landingPath ?? undefined,
      lastTouchedAt: snapshot.lastTouchedAt ?? new Date(),
    },
  });
}

export async function attachOrderAttributionAndCommission(
  db: AttributionDbClient,
  order: {
    id: string;
    sellerId: string;
    itemsSubtotalKrw: number;
    productIds: string[];
  },
  snapshot: AttributionSnapshot,
) {
  const resolved = await resolveAttribution(db, snapshot);
  const campaignMatchesOrderSeller =
    Boolean(resolved.campaignId) &&
    resolved.referrerUserId === order.sellerId;

  if (!campaignMatchesOrderSeller || !resolved.campaignId) {
    return null;
  }

  const campaignProductCount = await db.campaignProduct.count({
    where: {
      campaignId: resolved.campaignId,
      productId: { in: order.productIds },
    },
  });

  if (campaignProductCount === 0) {
    return null;
  }

  const hasAny =
    Boolean(resolved.campaignId) ||
    Boolean(resolved.refCode) ||
    Boolean(snapshot.utmSource) ||
    Boolean(snapshot.utmMedium) ||
    Boolean(snapshot.utmCampaign);

  if (!hasAny) return null;

  await db.orderAttribution.upsert({
    where: { orderId: order.id },
    create: {
      orderId: order.id,
      campaignId: resolved.campaignId,
      referrerUserId: resolved.referrerUserId,
      refCode: resolved.refCode,
      creatorSlug: resolved.creatorSlug,
      utmSource: snapshot.utmSource,
      utmMedium: snapshot.utmMedium,
      utmCampaign: snapshot.utmCampaign,
      landingPath: snapshot.landingPath,
      firstTouchedAt: snapshot.firstTouchedAt ?? snapshot.lastTouchedAt ?? new Date(),
      lastTouchedAt: snapshot.lastTouchedAt ?? new Date(),
    },
    update: {
      campaignId: resolved.campaignId ?? undefined,
      referrerUserId: resolved.referrerUserId ?? undefined,
      refCode: resolved.refCode ?? undefined,
      creatorSlug: resolved.creatorSlug ?? undefined,
      utmSource: snapshot.utmSource ?? undefined,
      utmMedium: snapshot.utmMedium ?? undefined,
      utmCampaign: snapshot.utmCampaign ?? undefined,
      landingPath: snapshot.landingPath ?? undefined,
      lastTouchedAt: snapshot.lastTouchedAt ?? new Date(),
    },
  });

  if (!resolved.referrerUserId || !resolved.commissionRateBps) {
    return resolved;
  }

  const commissionAmountKrw = Math.floor(
    (order.itemsSubtotalKrw * resolved.commissionRateBps) / 10000,
  );

  await db.orderCommission.upsert({
    where: { orderId: order.id },
    create: {
      orderId: order.id,
      beneficiaryUserId: resolved.referrerUserId,
      campaignId: resolved.campaignId,
      commissionRateBps: resolved.commissionRateBps,
      commissionBaseKrw: order.itemsSubtotalKrw,
      commissionAmountKrw,
      payableAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
    update: {
      beneficiaryUserId: resolved.referrerUserId,
      campaignId: resolved.campaignId,
      commissionRateBps: resolved.commissionRateBps,
      commissionBaseKrw: order.itemsSubtotalKrw,
      commissionAmountKrw,
      payableAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  return resolved;
}
