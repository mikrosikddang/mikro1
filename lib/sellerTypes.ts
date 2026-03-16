import {
  SellerKind,
  SocialChannelType,
  type SellerProfile,
} from "@prisma/client";

export const SELLER_KIND_OPTIONS: Array<{
  value: SellerKind;
  label: string;
  description: string;
}> = [
  {
    value: SellerKind.BRAND,
    label: "브랜드상점",
    description: "자체 브랜드 상품을 운영하는 상점",
  },
  {
    value: SellerKind.INFLUENCER,
    label: "인플루언서상점",
    description: "SNS 공동구매 중심으로 운영하는 상점",
  },
];

export const SOCIAL_CHANNEL_OPTIONS: Array<{
  value: SocialChannelType;
  label: string;
}> = [
  { value: SocialChannelType.INSTAGRAM, label: "인스타그램" },
  { value: SocialChannelType.YOUTUBE, label: "유튜브" },
  { value: SocialChannelType.TIKTOK, label: "틱톡" },
  { value: SocialChannelType.NAVER_BLOG, label: "네이버 블로그" },
  { value: SocialChannelType.OTHER, label: "기타" },
];

export const RESERVED_STORE_SLUGS = new Set([
  "admin",
  "api",
  "apply",
  "brands",
  "c",
  "cart",
  "chat",
  "checkout",
  "info",
  "login",
  "my",
  "news",
  "notifications",
  "orders",
  "p",
  "policy",
  "s",
  "seller",
  "signup",
  "wishlist",
  "_next",
  "favicon.ico",
  "robots.txt",
  "sitemap.xml",
]);

export function isOfflineSellerKind(kind: SellerKind) {
  return kind === SellerKind.WHOLESALE_STORE || kind === SellerKind.HYBRID;
}

export function normalizeVisibleSellerKind(kind: SellerKind | null | undefined) {
  return kind === SellerKind.INFLUENCER ? SellerKind.INFLUENCER : SellerKind.BRAND;
}

export function needsCreatorProfile(kind: SellerKind) {
  return (
    kind === SellerKind.INFLUENCER ||
    kind === SellerKind.HYBRID ||
    kind === SellerKind.BRAND
  );
}

export function sellerKindLabel(kind: SellerKind | null | undefined) {
  if (!kind) return "-";
  return normalizeVisibleSellerKind(kind) === SellerKind.INFLUENCER
    ? "인플루언서상점"
    : "브랜드상점";
}

export function socialChannelLabel(channel: SocialChannelType | null | undefined) {
  if (!channel) return "-";
  return (
    SOCIAL_CHANNEL_OPTIONS.find((option) => option.value === channel)?.label ??
    channel
  );
}

export function normalizeCreatorSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export function normalizeStoreSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export function defaultCommissionRateBps(kind: SellerKind) {
  switch (kind) {
    case SellerKind.INFLUENCER:
      return 1200;
    case SellerKind.HYBRID:
      return 1000;
    case SellerKind.BRAND:
      return 900;
    case SellerKind.WHOLESALE_STORE:
    default:
      return 800;
  }
}

export function buildDefaultCreatorSlug(
  shopName: string,
  existingSlug?: string | null,
) {
  if (existingSlug) return existingSlug;
  const base = normalizeCreatorSlug(shopName);
  return base || `seller-${Date.now().toString(36)}`;
}

export function buildDefaultStoreSlug(
  shopName: string,
  existingSlug?: string | null,
) {
  if (existingSlug) return existingSlug;
  const base = normalizeStoreSlug(shopName);
  return base || `shop-${Date.now().toString(36)}`;
}

export function isReservedStoreSlug(slug: string) {
  return RESERVED_STORE_SLUGS.has(slug);
}

export type SellerProfileLike = Pick<
  SellerProfile,
  | "sellerKind"
  | "marketBuilding"
  | "floor"
  | "roomNo"
  | "creatorSlug"
  | "socialChannelType"
  | "socialChannelUrl"
>;

export function validateSellerKindRequirements(profile: SellerProfileLike) {
  if (isOfflineSellerKind(profile.sellerKind)) {
    if (!profile.marketBuilding || !profile.floor || !profile.roomNo) {
      return "오프라인 기반 유형은 상가명, 층, 호수가 필요합니다.";
    }
  }

  if (needsCreatorProfile(profile.sellerKind)) {
    if (!profile.creatorSlug) {
      return "브랜드상점/인플루언서상점 유형은 공유 슬러그가 필요합니다.";
    }
  }

  if (
    profile.sellerKind === SellerKind.INFLUENCER ||
    profile.sellerKind === SellerKind.HYBRID
  ) {
    if (!profile.socialChannelType || !profile.socialChannelUrl) {
      return "인플루언서 중심 유형은 대표 SNS 채널 정보를 입력해주세요.";
    }
  }

  return null;
}
