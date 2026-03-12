ALTER TABLE "SellerProfile"
ADD COLUMN IF NOT EXISTS "storeSlug" TEXT;

UPDATE "SellerProfile"
SET "storeSlug" = CASE
  WHEN trim(both '-' FROM regexp_replace(lower(coalesce("shopName", '')), '[^a-z0-9]+', '-', 'g')) <> ''
    THEN trim(both '-' FROM regexp_replace(lower(coalesce("shopName", '')), '[^a-z0-9]+', '-', 'g')) || '-' || substr("userId", 1, 6)
  ELSE 'shop-' || substr("userId", 1, 8)
END
WHERE "storeSlug" IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "SellerProfile_storeSlug_key"
ON "SellerProfile"("storeSlug");
