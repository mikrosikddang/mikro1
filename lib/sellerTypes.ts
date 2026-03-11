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
    value: SellerKind.WHOLESALE_STORE,
    label: "도매 셀러",
    description: "동대문 상가 기반 판매자",
  },
  {
    value: SellerKind.INFLUENCER,
    label: "인플루언서",
    description: "SNS 공동구매 중심 운영",
  },
  {
    value: SellerKind.BRAND,
    label: "브랜드",
    description: "온라인 브랜드/레이블",
  },
  {
    value: SellerKind.HYBRID,
    label: "하이브리드",
    description: "도매와 공동구매를 함께 운영",
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

export function isOfflineSellerKind(kind: SellerKind) {
  return kind === SellerKind.WHOLESALE_STORE || kind === SellerKind.HYBRID;
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
  return (
    SELLER_KIND_OPTIONS.find((option) => option.value === kind)?.label ?? kind
  );
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
      return "도매/하이브리드 유형은 상가명, 층, 호수가 필요합니다.";
    }
  }

  if (needsCreatorProfile(profile.sellerKind)) {
    if (!profile.creatorSlug) {
      return "인플루언서/브랜드 유형은 크리에이터 슬러그가 필요합니다.";
    }
  }

  if (
    profile.sellerKind === SellerKind.INFLUENCER ||
    profile.sellerKind === SellerKind.HYBRID
  ) {
    if (!profile.socialChannelType || !profile.socialChannelUrl) {
      return "인플루언서/하이브리드 유형은 대표 SNS 채널 정보를 입력해주세요.";
    }
  }

  return null;
}
