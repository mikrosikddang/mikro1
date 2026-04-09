import { PrismaClient, Prisma, type SellerProfile } from "@prisma/client";
import { buildDefaultStoreSlug, isReservedStoreSlug } from "@/lib/sellerTypes";

type DbClient = PrismaClient | Prisma.TransactionClient;

type UserSpaceSeed = {
  id: string;
  name?: string | null;
  email?: string | null;
};

export class StoreSlugConflictError extends Error {
  constructor(message = "이미 사용 중인 상점 URL입니다") {
    super(message);
    this.name = "StoreSlugConflictError";
  }
}

function buildSlugBase(user: UserSpaceSeed, shopName: string) {
  const fallback = `space-${user.id.slice(-6).toLowerCase()}`;
  const base = buildDefaultStoreSlug(shopName);
  if (!base || isReservedStoreSlug(base)) {
    return fallback;
  }
  return base;
}

export async function findStoreSlugOwner(db: DbClient, slug: string) {
  const [current, history] = await Promise.all([
    db.sellerProfile.findFirst({
      where: { storeSlug: slug },
      select: {
        id: true,
        userId: true,
        storeSlug: true,
      },
    }),
    db.storeSlugHistory.findUnique({
      where: { slug },
      select: {
        sellerProfileId: true,
        sellerProfile: {
          select: {
            userId: true,
            storeSlug: true,
          },
        },
      },
    }),
  ]);

  if (current) {
    return {
      source: "current" as const,
      sellerProfileId: current.id,
      userId: current.userId,
      currentStoreSlug: current.storeSlug,
    };
  }

  if (!history) return null;

  return {
    source: "history" as const,
    sellerProfileId: history.sellerProfileId,
    userId: history.sellerProfile.userId,
    currentStoreSlug: history.sellerProfile.storeSlug,
  };
}

export async function isStoreSlugAvailable(
  db: DbClient,
  slug: string,
  excludeSellerProfileId?: string,
) {
  const owner = await findStoreSlugOwner(db, slug);
  if (!owner) return true;
  return owner.sellerProfileId === excludeSellerProfileId;
}

export async function assertStoreSlugAvailable(
  db: DbClient,
  slug: string,
  excludeSellerProfileId?: string,
) {
  const available = await isStoreSlugAvailable(db, slug, excludeSellerProfileId);
  if (!available) {
    throw new StoreSlugConflictError();
  }
}

export async function resolveUniqueStoreSlug(db: DbClient, user: UserSpaceSeed, shopName: string) {
  const base = buildSlugBase(user, shopName);

  for (let attempt = 0; attempt < 50; attempt += 1) {
    const candidate = attempt === 0 ? base : `${base}-${attempt + 1}`;
    if (isReservedStoreSlug(candidate)) continue;
    if (await isStoreSlugAvailable(db, candidate)) {
      return candidate;
    }
  }

  return `space-${user.id.slice(-10).toLowerCase()}`;
}

export async function updateStoreSlugForProfile(
  db: DbClient,
  sellerProfileId: string,
  nextStoreSlug: string,
): Promise<SellerProfile> {
  const current = await db.sellerProfile.findUnique({
    where: { id: sellerProfileId },
  });

  if (!current) {
    throw new Error("SELLER_PROFILE_NOT_FOUND");
  }

  if (current.storeSlug === nextStoreSlug) {
    return current;
  }

  await assertStoreSlugAvailable(db, nextStoreSlug, sellerProfileId);

  await db.storeSlugHistory.deleteMany({
    where: {
      sellerProfileId,
      slug: nextStoreSlug,
    },
  });

  if (current.storeSlug) {
    await db.storeSlugHistory.upsert({
      where: { slug: current.storeSlug },
      update: {},
      create: {
        sellerProfileId,
        slug: current.storeSlug,
      },
    });
  }

  return db.sellerProfile.update({
    where: { id: sellerProfileId },
    data: { storeSlug: nextStoreSlug },
  });
}
