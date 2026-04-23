-- CreateEnum
CREATE TYPE "OrderClaimType" AS ENUM ('REFUND', 'EXCHANGE');

-- CreateEnum
CREATE TYPE "OrderClaimReason" AS ENUM ('CHANGED_MIND', 'DEFECT', 'WRONG_ITEM', 'DAMAGED_DELIVERY', 'OTHER');

-- CreateEnum
CREATE TYPE "OrderClaimStatus" AS ENUM ('REQUESTED', 'APPROVED', 'REJECTED', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "OrderClaim" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "type" "OrderClaimType" NOT NULL,
    "reason" "OrderClaimReason" NOT NULL,
    "status" "OrderClaimStatus" NOT NULL DEFAULT 'REQUESTED',
    "message" TEXT,
    "photoUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sellerResponse" TEXT,
    "buyerBurdenKrw" INTEGER NOT NULL DEFAULT 0,
    "refundAmountKrw" INTEGER NOT NULL DEFAULT 0,
    "decidedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderClaim_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OrderClaim_orderId_idx" ON "OrderClaim"("orderId");

-- CreateIndex
CREATE INDEX "OrderClaim_status_idx" ON "OrderClaim"("status");

-- CreateIndex
CREATE INDEX "OrderClaim_createdAt_idx" ON "OrderClaim"("createdAt");

-- AddForeignKey
ALTER TABLE "OrderClaim" ADD CONSTRAINT "OrderClaim_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
