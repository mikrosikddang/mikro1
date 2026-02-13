-- Update existing OrderStatus enum values to new enum before changing schema
-- This migration ensures backward compatibility by mapping legacy states deterministically

-- Step 1: Map existing orders to new status values
UPDATE "Order" SET "status" = 'CANCELLED' WHERE "status" IN ('CANCELED', 'CANCEL_REQUESTED');
UPDATE "Order" SET "status" = 'SHIPPED' WHERE "status" IN ('PREPARING', 'SHIPPING');
UPDATE "Order" SET "status" = 'COMPLETED' WHERE "status" = 'DELIVERED';
UPDATE "Order" SET "status" = 'FAILED' WHERE "status" = 'PAYMENT_FAILED';

-- Step 2: Create new enum type with target values
CREATE TYPE "OrderStatus_new" AS ENUM ('PENDING', 'PAID', 'SHIPPED', 'COMPLETED', 'CANCELLED', 'REFUND_REQUESTED', 'REFUNDED', 'FAILED');

-- Step 3: Alter Order table to use new enum
ALTER TABLE "Order" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Order" ALTER COLUMN "status" TYPE "OrderStatus_new" USING ("status"::text::"OrderStatus_new");
ALTER TABLE "Order" ALTER COLUMN "status" SET DEFAULT 'PENDING'::"OrderStatus_new";

-- Step 4: Drop old enum and rename new enum
DROP TYPE "OrderStatus";
ALTER TYPE "OrderStatus_new" RENAME TO "OrderStatus";
