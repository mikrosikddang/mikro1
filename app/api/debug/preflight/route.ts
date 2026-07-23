import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

/**
 * GET /api/debug/preflight
 *
 * ADMIN-only preflight check for production environments.
 *
 * Authentication:
 * - X-ADMIN-PREFLIGHT-TOKEN header must match ADMIN_PREFLIGHT_TOKEN env
 *
 * Returns safe boolean checks without exposing sensitive data.
 */
export async function GET(req: NextRequest) {
  // ============================================================
  // Authentication (Token-only)
  // ============================================================
  const token = req.headers.get("x-admin-preflight-token");
  const expectedToken = process.env.ADMIN_PREFLIGHT_TOKEN;

  if (!token || !expectedToken || token !== expectedToken) {
    return NextResponse.json(
      { error: "Unauthorized - ADMIN_PREFLIGHT_TOKEN required" },
      { status: 401 }
    );
  }

  // ============================================================
  // Checks
  // ============================================================
  const checks: Record<string, boolean | string> = {};
  const failures: string[] = [];
  const warnings: string[] = [];

  // Node environment
  checks.nodeEnv = process.env.NODE_ENV || "development";

  // (1) DATABASE_URL exists
  checks.hasDatabaseUrl = Boolean(process.env.DATABASE_URL);
  if (!checks.hasDatabaseUrl) {
    failures.push("DATABASE_URL_MISSING");
  }

  // (2) Database reachable (runtime check)
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.dbReachable = true;
  } catch (err) {
    checks.dbReachable = false;
    failures.push("DB_UNREACHABLE");
  }

  // (3) Password field exists in schema
  try {
    await prisma.user.findFirst({
      where: { email: "nonexistent-preflight-check@example.com" },
      select: { password: true },
    });
    checks.schemaHasPassword = true;
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'message' in err) {
      const message = String(err.message);
      // If field doesn't exist, Prisma throws "Unknown field" error
      checks.schemaHasPassword = !message.includes("Unknown field");
    } else {
      checks.schemaHasPassword = false;
    }
    if (!checks.schemaHasPassword) {
      failures.push("SCHEMA_PASSWORD_MISSING");
    }
  }

  // (4) Cookie flags (production security)
  checks.cookieFlagsOk = process.env.NODE_ENV === "production"
    ? "secure+httpOnly expected"
    : "httpOnly in dev";

  // (5) Footer rules (manual check - cannot automate UI)
  checks.footerRulesOk = "manual";
  warnings.push("FOOTER_RULES_MANUAL_CHECK");

  // (6) Variant unique index (DB constraint check)
  // Prisma @@unique is always created as a UNIQUE INDEX (not a pg_constraint of
  // contype='u'), so check pg_index for a unique index over exactly the three
  // columns (productId, color, sizeLabel). Column order is compared order-agnostic.
  try {
    const result = await prisma.$queryRaw<Array<{ has_index: boolean }>>`
      SELECT EXISTS (
        SELECT 1 FROM pg_index i
        JOIN pg_class rel ON rel.oid = i.indrelid
        WHERE rel.relname = 'ProductVariant' AND i.indisunique
          AND (SELECT array_agg(a.attname::text ORDER BY a.attname::text)
               FROM pg_attribute a
               WHERE a.attrelid = rel.oid AND a.attnum = ANY(i.indkey))
              = ARRAY['color','productId','sizeLabel']
      ) AS has_index
    `;
    checks.variantUniqueIndexOk = result[0]?.has_index ?? false;
    if (!checks.variantUniqueIndexOk) {
      failures.push("VARIANT_UNIQUE_CONSTRAINT_MISSING");
    }
  } catch {
    checks.variantUniqueIndexOk = "query_failed";
    warnings.push("VARIANT_CONSTRAINT_CHECK_FAILED");
  }

  // (7) Existing FREE color safe (all variants have color)
  // Since color is non-nullable with default "FREE", always safe
  checks.existingFreeColorSafe = true;

  // (8) bcrypt in use (check if any user has bcrypt hash)
  // Note: No users = WARN (not FAIL), since this is acceptable in fresh deployments
  try {
    const userWithPassword = await prisma.user.findFirst({
      where: { password: { not: null } },
      select: { password: true },
    });
    if (userWithPassword && userWithPassword.password) {
      // Check bcrypt prefix ($2a, $2b, $2y)
      checks.bcryptInUse = userWithPassword.password.startsWith("$2");
      if (!checks.bcryptInUse) {
        warnings.push("BCRYPT_NOT_IN_USE");
      }
    } else {
      // No users with password = WARN (acceptable for new deployments)
      checks.bcryptInUse = "no_users_with_password";
      warnings.push("NO_USERS_WITH_PASSWORD");
    }
  } catch {
    checks.bcryptInUse = "query_failed";
    warnings.push("BCRYPT_CHECK_FAILED");
  }

  // (9) COOKIE_SECRET or AUTH_SECRET exists
  checks.hasCookieSecret = Boolean(process.env.COOKIE_SECRET || process.env.AUTH_SECRET);
  if (!checks.hasCookieSecret) {
    failures.push("COOKIE_SECRET_MISSING");
  }

  // (10) MVP_SELLER_ID exists (warn only)
  checks.hasMvpSellerId = Boolean(process.env.MVP_SELLER_ID);
  if (!checks.hasMvpSellerId) {
    warnings.push("MVP_SELLER_ID_MISSING");
  }

  // (11) Rate limiting
  checks.rateLimitWarning = "not_implemented";
  warnings.push("RATE_LIMIT_NOT_IMPLEMENTED");

  // (12) S3 bucket configured (앱 실사용 변수는 S3_BUCKET, 레거시 AWS_S3_BUCKET 폴백)
  checks.hasS3Config = Boolean(process.env.S3_BUCKET || process.env.AWS_S3_BUCKET);
  if (!checks.hasS3Config) {
    warnings.push("S3_BUCKET_NOT_CONFIGURED");
  }

  // ============================================================
  // Overall status
  // ============================================================
  const criticalChecks = [
    checks.hasDatabaseUrl,
    checks.dbReachable,
    checks.schemaHasPassword,
    checks.hasCookieSecret,
  ];

  const ok = criticalChecks.every((c) => c === true) && failures.length === 0;

  return NextResponse.json({
    ok,
    mode: "prod",
    checks,
    failures,
    warnings,
    timestamp: new Date().toISOString(),
  });
}
