CREATE TYPE "ProductPostType" AS ENUM ('SALE', 'ARCHIVE');

ALTER TABLE "Product"
ADD COLUMN "postType" "ProductPostType" NOT NULL DEFAULT 'SALE';

CREATE INDEX "Product_postType_isActive_isDeleted_idx"
ON "Product"("postType", "isActive", "isDeleted");
