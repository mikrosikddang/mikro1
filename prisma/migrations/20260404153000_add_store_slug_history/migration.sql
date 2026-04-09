CREATE TABLE IF NOT EXISTS "StoreSlugHistory" (
  "id" TEXT NOT NULL,
  "sellerProfileId" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "StoreSlugHistory_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "StoreSlugHistory_sellerProfileId_fkey"
    FOREIGN KEY ("sellerProfileId") REFERENCES "SellerProfile"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "StoreSlugHistory_slug_key"
ON "StoreSlugHistory"("slug");

CREATE INDEX IF NOT EXISTS "StoreSlugHistory_sellerProfileId_createdAt_idx"
ON "StoreSlugHistory"("sellerProfileId", "createdAt");
