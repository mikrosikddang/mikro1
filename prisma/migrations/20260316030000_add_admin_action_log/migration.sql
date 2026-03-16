CREATE TABLE IF NOT EXISTS "AdminActionLog" (
  "id" TEXT NOT NULL,
  "adminId" TEXT NOT NULL,
  "entityType" VARCHAR(40) NOT NULL,
  "entityId" TEXT NOT NULL,
  "action" VARCHAR(80) NOT NULL,
  "summary" TEXT NOT NULL,
  "reason" TEXT,
  "beforeJson" JSONB,
  "afterJson" JSONB,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AdminActionLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AdminActionLog_entityType_entityId_createdAt_idx"
ON "AdminActionLog"("entityType", "entityId", "createdAt");

CREATE INDEX IF NOT EXISTS "AdminActionLog_adminId_createdAt_idx"
ON "AdminActionLog"("adminId", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'AdminActionLog_adminId_fkey'
      AND table_name = 'AdminActionLog'
  ) THEN
    ALTER TABLE "AdminActionLog"
    ADD CONSTRAINT "AdminActionLog_adminId_fkey"
    FOREIGN KEY ("adminId") REFERENCES "User"("id")
    ON DELETE RESTRICT
    ON UPDATE CASCADE;
  END IF;
END $$;
