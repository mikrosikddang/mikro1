import { Prisma, PrismaClient, SellerApprovalStatus, SellerKind, type SellerProfile } from "@prisma/client";
import { buildDefaultStoreSlug, defaultCommissionRateBps, isReservedStoreSlug } from "@/lib/sellerTypes";

type DbClient = PrismaClient | Prisma.TransactionClient;

type UserSpaceSeed = {
  id: string;
  name?: string | null;
  email?: string | null;
};

function buildDefaultSpaceName(user: UserSpaceSeed) {
  const base =
    user.name?.trim() ||
    user.email?.split("@")[0]?.trim() ||
    `space-${user.id.slice(-6)}`;
  return base.slice(0, 30);
}

function buildSlugBase(user: UserSpaceSeed, shopName: string) {
  const fallback = `space-${user.id.slice(-6).toLowerCase()}`;
  const base = buildDefaultStoreSlug(shopName);
  if (!base || isReservedStoreSlug(base)) {
    return fallback;
  }
  return base;
}

async function resolveUniqueStoreSlug(db: DbClient, user: UserSpaceSeed, shopName: string) {
  const base = buildSlugBase(user, shopName);

  for (let attempt = 0; attempt < 50; attempt += 1) {
    const candidate = attempt === 0 ? base : `${base}-${attempt + 1}`;
    if (isReservedStoreSlug(candidate)) continue;

    const existing = await db.sellerProfile.findFirst({
      where: { storeSlug: candidate },
      select: { id: true },
    });
    if (!existing) return candidate;
  }

  return `space-${user.id.slice(-10).toLowerCase()}`;
}

export async function ensureUserSpaceProfile(db: DbClient, user: UserSpaceSeed): Promise<SellerProfile> {
  const existing = await db.sellerProfile.findUnique({
    where: { userId: user.id },
  });
  if (existing) return existing;

  const shopName = buildDefaultSpaceName(user);
  const storeSlug = await resolveUniqueStoreSlug(db, user, shopName);

  return db.sellerProfile.create({
    data: {
      userId: user.id,
      shopName,
      storeSlug,
      sellerKind: SellerKind.BRAND,
      type: "개인공간",
      isBusinessSeller: false,
      commissionRateBps: defaultCommissionRateBps(SellerKind.BRAND),
      status: SellerApprovalStatus.PENDING,
    },
  });
}
