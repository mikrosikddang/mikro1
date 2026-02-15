/**
 * Auth-related type definitions
 * Separate from lib/auth.ts to avoid client/server import issues
 */

import { UserRole } from "@prisma/client";

// Use Prisma's UserRole directly (single source of truth)
export type Role = UserRole;

export interface Session {
  userId: string;
  role: UserRole;
  issuedAt: number;
}
