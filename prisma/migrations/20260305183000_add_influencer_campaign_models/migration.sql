DO $$
BEGIN
  CREATE TYPE "SellerKind" AS ENUM ('WHOLESALE_STORE', 'INFLUENCER', 'BRAND', 'HYBRID');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "SocialChannelType" AS ENUM ('INSTAGRAM', 'YOUTUBE', 'TIKTOK', 'NAVER_BLOG', 'OTHER');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ENDED', 'ARCHIVED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "CommissionSettlementStatus" AS ENUM ('PENDING', 'PAYABLE', 'SETTLED', 'CANCELLED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "SellerProfile"
  ADD COLUMN IF NOT EXISTS "sellerKind" "SellerKind" NOT NULL DEFAULT 'WHOLESALE_STORE',
  ADD COLUMN IF NOT EXISTS "creatorSlug" TEXT,
  ADD COLUMN IF NOT EXISTS "socialChannelType" "SocialChannelType",
  ADD COLUMN IF NOT EXISTS "socialChannelUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "followerCount" INTEGER,
  ADD COLUMN IF NOT EXISTS "isBusinessSeller" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "commissionRateBps" INTEGER NOT NULL DEFAULT 1000;

CREATE UNIQUE INDEX IF NOT EXISTS "SellerProfile_creatorSlug_key" ON "SellerProfile"("creatorSlug");

CREATE TABLE IF NOT EXISTS "Campaign" (
  "id" TEXT NOT NULL,
  "sellerId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT,
  "coverImageUrl" TEXT,
  "landingHeadline" TEXT,
  "landingBody" TEXT,
  "couponId" TEXT,
  "refCode" TEXT NOT NULL,
  "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
  "startsAt" TIMESTAMP(3),
  "endsAt" TIMESTAMP(3),
  "defaultCommissionRateBps" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Campaign_slug_key" ON "Campaign"("slug");
CREATE UNIQUE INDEX IF NOT EXISTS "Campaign_refCode_key" ON "Campaign"("refCode");
CREATE INDEX IF NOT EXISTS "Campaign_sellerId_status_idx" ON "Campaign"("sellerId", "status");
CREATE INDEX IF NOT EXISTS "Campaign_startsAt_endsAt_idx" ON "Campaign"("startsAt", "endsAt");

DO $$
BEGIN
  ALTER TABLE "Campaign"
    ADD CONSTRAINT "Campaign_sellerId_fkey"
    FOREIGN KEY ("sellerId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "Campaign"
    ADD CONSTRAINT "Campaign_couponId_fkey"
    FOREIGN KEY ("couponId") REFERENCES "Coupon"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "CampaignProduct" (
  "id" TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CampaignProduct_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CampaignProduct_campaignId_productId_key" ON "CampaignProduct"("campaignId", "productId");
CREATE INDEX IF NOT EXISTS "CampaignProduct_campaignId_sortOrder_idx" ON "CampaignProduct"("campaignId", "sortOrder");
CREATE INDEX IF NOT EXISTS "CampaignProduct_productId_idx" ON "CampaignProduct"("productId");

DO $$
BEGIN
  ALTER TABLE "CampaignProduct"
    ADD CONSTRAINT "CampaignProduct_campaignId_fkey"
    FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "CampaignProduct"
    ADD CONSTRAINT "CampaignProduct_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "Product"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "CampaignVisit" (
  "id" TEXT NOT NULL,
  "campaignId" TEXT,
  "sellerId" TEXT,
  "refCode" TEXT,
  "creatorSlug" TEXT,
  "utmSource" TEXT,
  "utmMedium" TEXT,
  "utmCampaign" TEXT,
  "landingPath" TEXT,
  "sessionKey" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CampaignVisit_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "CampaignVisit_campaignId_createdAt_idx" ON "CampaignVisit"("campaignId", "createdAt");
CREATE INDEX IF NOT EXISTS "CampaignVisit_sellerId_createdAt_idx" ON "CampaignVisit"("sellerId", "createdAt");

DO $$
BEGIN
  ALTER TABLE "CampaignVisit"
    ADD CONSTRAINT "CampaignVisit_campaignId_fkey"
    FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "CampaignVisit"
    ADD CONSTRAINT "CampaignVisit_sellerId_fkey"
    FOREIGN KEY ("sellerId") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "UserAttribution" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "campaignId" TEXT,
  "refCode" TEXT,
  "creatorSlug" TEXT,
  "utmSource" TEXT,
  "utmMedium" TEXT,
  "utmCampaign" TEXT,
  "landingPath" TEXT,
  "firstTouchedAt" TIMESTAMP(3),
  "lastTouchedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserAttribution_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "UserAttribution_userId_key" ON "UserAttribution"("userId");
CREATE INDEX IF NOT EXISTS "UserAttribution_campaignId_idx" ON "UserAttribution"("campaignId");

DO $$
BEGIN
  ALTER TABLE "UserAttribution"
    ADD CONSTRAINT "UserAttribution_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "UserAttribution"
    ADD CONSTRAINT "UserAttribution_campaignId_fkey"
    FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "OrderAttribution" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "campaignId" TEXT,
  "referrerUserId" TEXT,
  "refCode" TEXT,
  "creatorSlug" TEXT,
  "utmSource" TEXT,
  "utmMedium" TEXT,
  "utmCampaign" TEXT,
  "landingPath" TEXT,
  "firstTouchedAt" TIMESTAMP(3),
  "lastTouchedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OrderAttribution_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "OrderAttribution_orderId_key" ON "OrderAttribution"("orderId");
CREATE INDEX IF NOT EXISTS "OrderAttribution_campaignId_idx" ON "OrderAttribution"("campaignId");
CREATE INDEX IF NOT EXISTS "OrderAttribution_referrerUserId_idx" ON "OrderAttribution"("referrerUserId");

DO $$
BEGIN
  ALTER TABLE "OrderAttribution"
    ADD CONSTRAINT "OrderAttribution_orderId_fkey"
    FOREIGN KEY ("orderId") REFERENCES "Order"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "OrderAttribution"
    ADD CONSTRAINT "OrderAttribution_campaignId_fkey"
    FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "OrderAttribution"
    ADD CONSTRAINT "OrderAttribution_referrerUserId_fkey"
    FOREIGN KEY ("referrerUserId") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "OrderCommission" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "beneficiaryUserId" TEXT,
  "campaignId" TEXT,
  "commissionRateBps" INTEGER NOT NULL,
  "commissionBaseKrw" INTEGER NOT NULL,
  "commissionAmountKrw" INTEGER NOT NULL,
  "status" "CommissionSettlementStatus" NOT NULL DEFAULT 'PENDING',
  "payableAt" TIMESTAMP(3),
  "settledAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OrderCommission_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "OrderCommission_orderId_key" ON "OrderCommission"("orderId");
CREATE INDEX IF NOT EXISTS "OrderCommission_beneficiaryUserId_status_idx" ON "OrderCommission"("beneficiaryUserId", "status");
CREATE INDEX IF NOT EXISTS "OrderCommission_campaignId_status_idx" ON "OrderCommission"("campaignId", "status");

DO $$
BEGIN
  ALTER TABLE "OrderCommission"
    ADD CONSTRAINT "OrderCommission_orderId_fkey"
    FOREIGN KEY ("orderId") REFERENCES "Order"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "OrderCommission"
    ADD CONSTRAINT "OrderCommission_beneficiaryUserId_fkey"
    FOREIGN KEY ("beneficiaryUserId") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "OrderCommission"
    ADD CONSTRAINT "OrderCommission_campaignId_fkey"
    FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
