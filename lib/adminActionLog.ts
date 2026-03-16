import type { Prisma, PrismaClient } from "@prisma/client";

export const ADMIN_ENTITY_TYPES = [
  "ORDER",
  "SELLER",
  "CAMPAIGN",
  "PRODUCT",
  "COUPON",
] as const;

export type AdminEntityType = (typeof ADMIN_ENTITY_TYPES)[number];

type AdminLogClient = PrismaClient | Prisma.TransactionClient;

export interface CreateAdminActionLogInput {
  adminId: string;
  entityType: AdminEntityType;
  entityId: string;
  action: string;
  summary: string;
  reason?: string | null;
  beforeJson?: Prisma.InputJsonValue | null;
  afterJson?: Prisma.InputJsonValue | null;
  metadata?: Prisma.InputJsonValue | null;
}

export async function createAdminActionLog(
  db: AdminLogClient,
  input: CreateAdminActionLogInput,
) {
  return db.adminActionLog.create({
    data: {
      adminId: input.adminId,
      entityType: input.entityType,
      entityId: input.entityId,
      action: input.action,
      summary: input.summary,
      reason: input.reason ?? null,
      beforeJson: input.beforeJson ?? undefined,
      afterJson: input.afterJson ?? undefined,
      metadata: input.metadata ?? undefined,
    },
  });
}
