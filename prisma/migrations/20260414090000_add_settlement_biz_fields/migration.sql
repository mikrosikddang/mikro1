-- AlterTable
ALTER TABLE "SellerProfile" ADD COLUMN "taxType" VARCHAR(20);
ALTER TABLE "SellerProfile" ADD COLUMN "bizName" VARCHAR(80);
ALTER TABLE "SellerProfile" ADD COLUMN "bizOwnerName" VARCHAR(40);
ALTER TABLE "SellerProfile" ADD COLUMN "settlementPhone" VARCHAR(30);
ALTER TABLE "SellerProfile" ADD COLUMN "settlementEmail" TEXT;
