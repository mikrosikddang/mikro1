-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "PayoutStatus" AS ENUM ('REQUESTED', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'CANCELLED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AlterTable: SellerProfile
ALTER TABLE "SellerProfile"
  ADD COLUMN IF NOT EXISTS "tossSellerId"           VARCHAR(80),
  ADD COLUMN IF NOT EXISTS "tossSellerStatus"       VARCHAR(40),
  ADD COLUMN IF NOT EXISTS "tossSellerRegisteredAt" TIMESTAMP(3);

CREATE UNIQUE INDEX IF NOT EXISTS "SellerProfile_tossSellerId_key"
  ON "SellerProfile"("tossSellerId");

-- AlterTable: OrderCommission
ALTER TABLE "OrderCommission"
  ADD COLUMN IF NOT EXISTS "payoutId" TEXT;

CREATE INDEX IF NOT EXISTS "OrderCommission_payoutId_idx"
  ON "OrderCommission"("payoutId");

-- CreateTable: Payout
CREATE TABLE IF NOT EXISTS "Payout" (
  "id"                TEXT PRIMARY KEY,
  "beneficiaryUserId" TEXT NOT NULL,
  "tossPayoutId"      VARCHAR(80),
  "amountKrw"         INTEGER NOT NULL,
  "status"            "PayoutStatus" NOT NULL DEFAULT 'REQUESTED',
  "failureReason"     TEXT,
  "metadata"          JSONB,
  "requestedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "scheduledAt"       TIMESTAMP(3),
  "completedAt"       TIMESTAMP(3),
  "cancelledAt"       TIMESTAMP(3),
  "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"         TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Payout_beneficiaryUserId_fkey"
    FOREIGN KEY ("beneficiaryUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "Payout_tossPayoutId_key"
  ON "Payout"("tossPayoutId");

CREATE INDEX IF NOT EXISTS "Payout_beneficiaryUserId_status_idx"
  ON "Payout"("beneficiaryUserId", "status");

CREATE INDEX IF NOT EXISTS "Payout_status_requestedAt_idx"
  ON "Payout"("status", "requestedAt");

-- FK: OrderCommission.payoutId → Payout.id
DO $$ BEGIN
  ALTER TABLE "OrderCommission"
    ADD CONSTRAINT "OrderCommission_payoutId_fkey"
    FOREIGN KEY ("payoutId") REFERENCES "Payout"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
