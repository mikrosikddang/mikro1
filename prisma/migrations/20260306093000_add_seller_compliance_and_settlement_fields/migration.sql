-- Add seller compliance and settlement editable fields
ALTER TABLE "SellerProfile"
ADD COLUMN IF NOT EXISTS "bizRegSubmittedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "settlementBank" VARCHAR(40),
ADD COLUMN IF NOT EXISTS "settlementAccountNo" VARCHAR(60),
ADD COLUMN IF NOT EXISTS "settlementAccountHolder" VARCHAR(40),
ADD COLUMN IF NOT EXISTS "settlementSubmittedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "complianceReviewPending" BOOLEAN NOT NULL DEFAULT false;

