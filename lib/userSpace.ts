import { Prisma, PrismaClient, SellerApprovalStatus, SellerKind, type SellerProfile } from "@prisma/client";
import { defaultCommissionRateBps } from "@/lib/sellerTypes";
import { resolveUniqueStoreSlug } from "@/lib/storeSlug";

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
