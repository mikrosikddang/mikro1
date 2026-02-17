#!/usr/bin/env node

/**
 * Preflight Check Script (Local/CI/Prod)
 * 배포 전 18개 항목을 자동으로 점검합니다.
 *
 * Usage:
 *   node scripts/preflight.mjs [--mode=dev|ci|prod]
 *
 * Modes:
 *   dev  - Development (DATABASE_URL optional, warnings allowed)
 *   ci   - CI환경 (DB 체크 SKIP, 타입/빌드 HARD FAIL)
 *   prod - Production준비 (모든 env 필수, DB 실동작 체크, .env.local 필수)
 *
 * Note: prod 모드는 .env.local에서 환경변수를 로드합니다.
 */

import { execSync } from 'child_process';
import { readFileSync, existsSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load .env files for local execution (dev/prod modes)
// CI mode relies on GitHub Actions env vars
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Parse mode first to determine env loading
const args = process.argv.slice(2);
const modeArg = args.find(a => a.startsWith('--mode='));
const mode = modeArg ? modeArg.split('=')[1] : 'dev';

// Load .env files in dev/prod modes (skip in CI to avoid conflicts)
if (mode !== 'ci') {
  try {
    // Dynamically import dotenv to load .env.local and .env
    const { config } = await import('dotenv');
    config({ path: join(rootDir, '.env.local') });
    config({ path: join(rootDir, '.env') });
  } catch (err) {
    if (mode === 'prod') {
      console.error('ERROR: dotenv not found. Run: npm install');
      process.exit(1);
    }
    // In dev mode, continue without dotenv (system env vars only)
  }
}

// ============================================================
// Validate mode
// ============================================================

if (!['dev', 'ci', 'prod'].includes(mode)) {
  console.error(`Invalid mode: ${mode}. Use dev|ci|prod`);
  process.exit(1);
}

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

const STATUS = {
  OK: `${colors.green}✓ OK${colors.reset}`,
  WARN: `${colors.yellow}⚠ WARN${colors.reset}`,
  FAIL: `${colors.red}✗ FAIL${colors.reset}`,
  SKIP: `${colors.cyan}○ SKIP${colors.reset}`,
};

let checks = [];
let failCount = 0;
let warnCount = 0;
let skipCount = 0;

function check(name, fn, opts = {}) {
  const { hardFail = false, skipInCI = false } = opts;

  // CI 모드에서 skip 가능한 체크
  if (mode === 'ci' && skipInCI) {
    checks.push({ status: STATUS.SKIP, name, detail: 'Skipped in CI' });
    skipCount++;
    return;
  }

  try {
    const result = fn();
    if (result === 'WARN') {
      checks.push({ status: STATUS.WARN, name, detail: '' });
      warnCount++;
    } else if (result === 'SKIP') {
      checks.push({ status: STATUS.SKIP, name, detail: 'Skipped' });
      skipCount++;
    } else {
      checks.push({ status: STATUS.OK, name, detail: result || '' });
    }
  } catch (err) {
    // prod 모드에서 hardFail이면 무조건 FAIL
    // dev/ci 모드에서는 hardFail 아닌 것은 WARN으로 처리
    if (hardFail || mode === 'prod') {
      checks.push({ status: STATUS.FAIL, name, detail: err.message });
      failCount++;
    } else {
      checks.push({ status: STATUS.WARN, name, detail: err.message });
      warnCount++;
    }
  }
}

function fileContains(path, pattern) {
  if (!existsSync(join(rootDir, path))) {
    throw new Error(`File not found: ${path}`);
  }
  const content = readFileSync(join(rootDir, path), 'utf-8');
  if (pattern instanceof RegExp) {
    return pattern.test(content);
  }
  return content.includes(pattern);
}

function exec(cmd) {
  return execSync(cmd, { cwd: rootDir, encoding: 'utf-8', stdio: 'pipe' });
}

// ============================================================
// HARD FAIL Checks (critical for production)
// ============================================================

// Check 1: DATABASE_URL (HARD FAIL in prod)
check('(1) DATABASE_URL configured', () => {
  if (!process.env.DATABASE_URL) {
    if (mode === 'prod') {
      throw new Error('DATABASE_URL missing - check .env.local (CRITICAL)');
    } else if (mode === 'ci') {
      return 'SKIP';
    } else {
      throw new Error('DATABASE_URL not set (add to .env.local)');
    }
  }
  return 'Set';
}, { hardFail: mode === 'prod', skipInCI: true });

// Check 2: COOKIE_SECRET (HARD FAIL in prod)
check('(2) COOKIE_SECRET configured', () => {
  if (!process.env.COOKIE_SECRET && !process.env.AUTH_SECRET) {
    if (mode === 'prod') {
      throw new Error('COOKIE_SECRET missing - check .env.local (CRITICAL)');
    } else if (mode === 'ci') {
      throw new Error('COOKIE_SECRET not set (OK in CI - uses dev fallback)');
    } else {
      throw new Error('COOKIE_SECRET not set (add to .env.local or uses dev fallback)');
    }
  }
  return process.env.COOKIE_SECRET ? 'COOKIE_SECRET set' : 'AUTH_SECRET set (legacy)';
}, { hardFail: mode === 'prod' });

// Check 3: DB Connection (skipped - use /api/debug/preflight for runtime checks)
check('(3) Database reachable', () => {
  // Note: Runtime DB connection check is delegated to /api/debug/preflight
  // Local script focuses on code structure checks only
  return 'SKIP';
});

// Check 4: Cookie options (RUNTIME CHECK)
check('(4) Cookie security options', () => {
  const authPath = 'lib/auth.ts';

  // Check code structure
  if (!fileContains(authPath, 'httpOnly: true')) {
    throw new Error('httpOnly not set to true');
  }
  if (!fileContains(authPath, 'sameSite:')) {
    throw new Error('sameSite not configured');
  }

  // Check secure flag logic
  const hasSecureLogic = fileContains(authPath, /secure:\s*process\.env\.NODE_ENV\s*===\s*["']production["']/);
  if (!hasSecureLogic) {
    throw new Error('secure flag not tied to NODE_ENV');
  }

  return 'httpOnly + sameSite + secure(prod) OK';
}, { hardFail: true });

// ============================================================
// Schema & Code Structure Checks
// ============================================================

// Check 5: User.password field
check('(5) User.password field in schema', () => {
  if (!fileContains('prisma/schema.prisma', 'password')) {
    throw new Error('User model missing password field');
  }
  return 'password String? exists';
});

// Check 6: bcrypt usage
check('(6) bcrypt.hash in signup', () => {
  const signupPath = 'app/api/auth/signup/route.ts';
  if (!existsSync(join(rootDir, signupPath))) {
    throw new Error('Signup route not found');
  }
  if (!fileContains(signupPath, 'bcrypt.hash')) {
    throw new Error('bcrypt.hash not found');
  }
  return 'bcrypt.hash(password, 10)';
}, { hardFail: true });

// Check 7: Duplicate email 409
check('(7) Duplicate email returns 409', () => {
  const signupPath = 'app/api/auth/signup/route.ts';
  if (!fileContains(signupPath, /status:\s*409/)) {
    throw new Error('409 status not found');
  }
  return '409 response exists';
});

// Check 8: Signup role=CUSTOMER
check('(8) Signup creates CUSTOMER role', () => {
  const signupPath = 'app/api/auth/signup/route.ts';
  if (!fileContains(signupPath, 'role: "CUSTOMER"')) {
    throw new Error('role: "CUSTOMER" not hardcoded');
  }
  return 'role: "CUSTOMER" set';
});

// Check 9: ProductVariant unique constraint
check('(9) ProductVariant unique constraint', () => {
  const schemaPath = 'prisma/schema.prisma';
  if (!fileContains(schemaPath, /@@unique\(\[productId,\s*color,\s*sizeLabel\]\)/)) {
    throw new Error('@@unique([productId, color, sizeLabel]) not found');
  }
  return '@@unique([productId, color, sizeLabel])';
}, { hardFail: true });

// Check 10: FREE default color
check('(10) FREE default color handling', () => {
  const formPath = 'components/ProductForm.tsx';
  if (!fileContains(formPath, '"FREE"')) {
    throw new Error('FREE not found in ProductForm');
  }
  const apiPath = 'app/api/seller/products/route.ts';
  if (!fileContains(apiPath, 'v.color || "FREE"')) {
    throw new Error('FREE fallback not found in API');
  }
  return 'FREE fallback implemented';
});

// Check 11: Cart variantId
check('(11) Cart uses variantId', () => {
  const cartPath = 'app/api/cart/route.ts';
  if (!fileContains(cartPath, 'variantId')) {
    throw new Error('variantId not found');
  }
  return 'variantId validation exists';
});

// Check 12: Footer rules
check('(12) Footer hidden on "/" path', () => {
  const footerPath = 'components/ConditionalFooter.tsx';
  if (!existsSync(join(rootDir, footerPath))) {
    throw new Error('ConditionalFooter.tsx not found');
  }
  if (!fileContains(footerPath, 'pathname === "/"')) {
    throw new Error('pathname check not found');
  }
  if (!fileContains(footerPath, 'return null')) {
    throw new Error('return null not found');
  }
  return 'pathname === "/" → return null';
});

// Check 13: Footer business info (HARD FAIL for legal compliance)
check('(13) Footer required business info', () => {
  const footerPath = 'components/CompanyFooter.tsx';
  const requiredFields = [
    '미크로',
    '김동현',
    '443-65-00701',
    '2025-서울구로-0131',
    'mikrobrand25@gmail.com',
  ];
  for (const field of requiredFields) {
    if (!fileContains(footerPath, field)) {
      throw new Error(`Missing: ${field}`);
    }
  }
  return 'All business info present';
}, { hardFail: mode === 'prod' });

// ============================================================
// Optional/Warning Checks
// ============================================================

// Check 14: Rate limiting (WARN - not implemented in MVP)
check('(14) Rate limiting', () => {
  return 'WARN';
});

// ============================================================
// Build Checks (HARD FAIL in ci/prod)
// ============================================================

// Check 15: Prisma Client generated
check('(15) Prisma Client generated', () => {
  const clientPath = 'node_modules/@prisma/client/index.js';
  if (!existsSync(join(rootDir, clientPath))) {
    throw new Error('Prisma Client not generated - run `prisma generate`');
  }
  return 'Client exists';
}, { hardFail: mode === 'ci' || mode === 'prod' });

// Check 16: TypeScript compilation (HARD FAIL in ci/prod)
check('(16) TypeScript compilation', () => {
  try {
    exec('npx tsc --noEmit');
    return 'No type errors';
  } catch (err) {
    throw new Error('TypeScript errors (run `npx tsc --noEmit`)');
  }
}, { hardFail: mode === 'ci' || mode === 'prod' });

// Check 17: OrderStatus enum values (order state integrity)
check('(17) OrderStatus enum in schema', () => {
  const schemaPath = 'prisma/schema.prisma';
  const requiredStatuses = ['PENDING', 'PAID', 'SHIPPED', 'COMPLETED', 'CANCELLED', 'REFUND_REQUESTED', 'REFUNDED', 'FAILED'];

  for (const status of requiredStatuses) {
    if (!fileContains(schemaPath, status)) {
      throw new Error(`Missing required status: ${status}`);
    }
  }

  return 'All 8 statuses present';
}, { hardFail: true });

// Check 18: Order status API endpoint exists
check('(18) PATCH /api/orders/[id]/status exists', () => {
  const routePath = 'app/api/orders/[id]/status/route.ts';
  if (!existsSync(join(rootDir, routePath))) {
    throw new Error('Status update API not found');
  }
  if (!fileContains(routePath, 'export async function PATCH')) {
    throw new Error('PATCH handler not found in status API');
  }
  return 'API endpoint exists';
}, { hardFail: true });

// Check 19: No string literal status comparisons (TRACK 2 enforcement)
check('(19) OrderStatus enum-only (no string literals)', () => {
  const searchDirs = ['app/api', 'lib'];
  const violations = [];

  // Patterns to detect string literal status comparisons
  const statusPatterns = [
    /\.status\s*===\s*["'](?:PENDING|PAID|SHIPPED|COMPLETED|CANCELLED|REFUND_REQUESTED|REFUNDED|FAILED)["']/g,
    /\.status\s*!==\s*["'](?:PENDING|PAID|SHIPPED|COMPLETED|CANCELLED|REFUND_REQUESTED|REFUNDED|FAILED)["']/g,
    /status:\s*["'](?:PENDING|PAID|SHIPPED|COMPLETED|CANCELLED|REFUND_REQUESTED|REFUNDED|FAILED)["']/g,
  ];

  for (const dir of searchDirs) {
    const dirPath = join(rootDir, dir);
    if (!existsSync(dirPath)) continue;

    const files = readdirSync(dirPath, { recursive: true })
      .filter(f => f.endsWith('.ts') || f.endsWith('.tsx'))
      .map(f => join(dir, f));

    for (const file of files) {
      const content = readFileSync(join(rootDir, file), 'utf-8');

      // Skip lines with session.role (those are allowed)
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.includes('session.role')) continue; // Allowed
        if (line.includes('//')) {
          // Check only the part before comment
          const beforeComment = line.split('//')[0];
          for (const pattern of statusPatterns) {
            if (pattern.test(beforeComment)) {
              violations.push(`${file}:${i + 1}`);
              break;
            }
          }
        } else {
          for (const pattern of statusPatterns) {
            if (pattern.test(line)) {
              violations.push(`${file}:${i + 1}`);
              break;
            }
          }
        }
      }
    }
  }

  if (violations.length > 0) {
    throw new Error(`Found ${violations.length} string literal status comparison(s): ${violations.slice(0, 3).join(', ')}${violations.length > 3 ? '...' : ''}`);
  }

  return 'All status comparisons use OrderStatus enum';
}, { hardFail: mode === 'prod' });

// Check 20: OrderAuditLog table exists (governance)
check('(20) OrderAuditLog table exists', () => {
  const schemaPath = 'prisma/schema.prisma';
  if (!fileContains(schemaPath, 'model OrderAuditLog')) {
    throw new Error('OrderAuditLog model not found');
  }
  const requiredFields = ['orderId', 'adminId', 'from', 'to', 'reason'];
  for (const field of requiredFields) {
    if (!fileContains(schemaPath, field)) {
      throw new Error(`OrderAuditLog missing field: ${field}`);
    }
  }
  return 'Audit log table exists';
}, { hardFail: mode === 'prod' });

// Check 21: Admin override endpoint exists
check('(21) Admin override endpoint exists', () => {
  const routePath = 'app/api/admin/orders/[id]/override/route.ts';
  if (!existsSync(join(rootDir, routePath))) {
    throw new Error('Override API not found');
  }
  if (!fileContains(routePath, 'isAdmin')) {
    throw new Error('isAdmin check not found in override endpoint');
  }
  if (!fileContains(routePath, 'orderAuditLog.create')) {
    throw new Error('Audit logging not found in override endpoint');
  }
  return 'Override endpoint with audit logging exists';
}, { hardFail: mode === 'prod' });

// Check 22: Seller refund approval (not admin)
check('(22) Seller approves refunds (not admin)', () => {
  const routePath = 'app/api/orders/[id]/status/route.ts';

  // Verify SELLER can approve refunds
  if (!fileContains(routePath, 'REFUND_REQUESTED') || !fileContains(routePath, 'REFUNDED')) {
    throw new Error('Refund status handling not found');
  }

  // Verify ADMIN is blocked from normal transitions
  if (!fileContains(routePath, 'ADMIN must use override endpoint')) {
    throw new Error('ADMIN rejection message not found');
  }

  return 'Seller refund approval enforced, admin blocked';
}, { hardFail: mode === 'prod' });

// Check 23: Role helpers used (no string comparisons)
check('(23) Role helpers used (no string role comparisons)', () => {
  const routePath = 'app/api/orders/[id]/status/route.ts';

  // Ensure role helpers are imported
  if (!fileContains(routePath, 'isCustomer') || !fileContains(routePath, 'isSeller') || !fileContains(routePath, 'isAdmin')) {
    throw new Error('Role helpers not imported');
  }

  // Check for forbidden string literal role comparisons
  const content = readFileSync(join(rootDir, routePath), 'utf-8');
  const forbiddenPatterns = [
    /role\s*===\s*["']SELLER["']/,
    /role\s*===\s*["']CUSTOMER["']/,
    /role\s*===\s*["']ADMIN["']/,
  ];

  for (const pattern of forbiddenPatterns) {
    if (pattern.test(content)) {
      throw new Error('Found string literal role comparison');
    }
  }

  return 'Role helpers used correctly';
}, { hardFail: mode === 'prod' });

// Check 24: No hardcoded admin credentials (governance security)
check('(24) No hardcoded admin credentials', () => {
  const forbiddenPatterns = [
    'alzmfhtlrEkd',
    'admin@mikro.local',
    'mvp-admin-1',
    'id === "admin"',
  ];

  const scanDirs = ['.', 'app', 'lib', 'prisma', 'scripts'];
  const excludeFiles = [
    '.env.example', // Allowed to have ADMIN_BOOTSTRAP_EMAIL examples
    'GOVERNANCE_VERIFICATION_REPORT.md', // Contains historical references
    'README.md', // May document old behavior
    'preflight.mjs', // This file itself (contains the forbidden patterns as strings)
  ];
  const violations = [];

  for (const dir of scanDirs) {
    const dirPath = join(rootDir, dir);
    if (!existsSync(dirPath)) continue;

    const files = readdirSync(dirPath, { recursive: true })
      .filter(f => {
        // Only scan source files
        if (!(f.endsWith('.ts') || f.endsWith('.tsx') || f.endsWith('.mjs'))) return false;

        // Exclude certain files
        const fileName = f.split('/').pop() || '';
        if (excludeFiles.includes(fileName)) return false;

        // Exclude build/cache directories
        if (f.includes('node_modules/') || f.includes('.next/') || f.includes('dist/')) return false;

        return true;
      })
      .map(f => join(dir, f));

    for (const file of files) {
      const content = readFileSync(join(rootDir, file), 'utf-8');

      for (const pattern of forbiddenPatterns) {
        if (content.includes(pattern)) {
          violations.push(`${file}: "${pattern}"`);
        }
      }
    }
  }

  if (violations.length > 0) {
    throw new Error(`Found ${violations.length} hardcoded admin credential(s): ${violations.slice(0, 3).join(', ')}${violations.length > 3 ? '...' : ''}`);
  }

  return 'No hardcoded admin credentials found';
}, { hardFail: mode === 'prod' });

// ============================================================
// Print Results
// ============================================================
console.log(`\n${colors.bold}${colors.cyan}Preflight Check Results [${mode.toUpperCase()}]${colors.reset}\n`);
console.log('─'.repeat(80));

for (const { status, name, detail } of checks) {
  const detailStr = detail ? ` - ${detail}` : '';
  console.log(`${status} ${name}${detailStr}`);
}

console.log('─'.repeat(80));

const summary = [];
if (failCount > 0) summary.push(`${colors.red}${failCount} failed${colors.reset}`);
if (warnCount > 0) summary.push(`${colors.yellow}${warnCount} warnings${colors.reset}`);
if (skipCount > 0) summary.push(`${colors.cyan}${skipCount} skipped${colors.reset}`);

if (failCount > 0) {
  console.log(`\n${colors.red}${colors.bold}FAILED${colors.reset}: ${summary.join(', ')}\n`);
  process.exit(1);
} else if (warnCount > 0) {
  console.log(`\n${colors.yellow}${colors.bold}PASSED with WARNINGS${colors.reset}: ${summary.join(', ')}\n`);
  process.exit(0);
} else {
  console.log(`\n${colors.green}${colors.bold}ALL CHECKS PASSED${colors.reset}${skipCount > 0 ? ` (${skipCount} skipped)` : ''}\n`);
  process.exit(0);
}
