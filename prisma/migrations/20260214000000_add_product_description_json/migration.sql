-- Add structured description JSON column to Product table
-- Keeps legacy description String? for backward compatibility

ALTER TABLE "Product" ADD COLUMN "descriptionJson" JSONB;
