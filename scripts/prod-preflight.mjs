#!/usr/bin/env node

/**
 * Production Preflight Check
 * 프로덕션 환경에서 /api/debug/preflight를 호출하여 점검합니다.
 *
 * Usage:
 *   PROD_URL=https://main.xxx.amplifyapp.com ADMIN_PREFLIGHT_TOKEN=your_token node scripts/prod-preflight.mjs
 *
 * 또는:
 *   ADMIN_PREFLIGHT_TOKEN=your_token node scripts/prod-preflight.mjs https://main.xxx.amplifyapp.com
 */

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
  OK: `${colors.green}✓${colors.reset}`,
  WARN: `${colors.yellow}⚠${colors.reset}`,
  FAIL: `${colors.red}✗${colors.reset}`,
};

// Parse arguments
const prodUrl = process.argv[2] || process.env.PROD_URL;
const token = process.env.ADMIN_PREFLIGHT_TOKEN;

if (!prodUrl) {
  console.error(`${colors.red}Error: PROD_URL not provided${colors.reset}`);
  console.error(`\nUsage:\n  PROD_URL=https://your-app.amplifyapp.com ADMIN_PREFLIGHT_TOKEN=token node scripts/prod-preflight.mjs`);
  console.error(`  OR\n  ADMIN_PREFLIGHT_TOKEN=token node scripts/prod-preflight.mjs https://your-app.amplifyapp.com\n`);
  process.exit(1);
}

if (!token) {
  console.error(`${colors.red}Error: ADMIN_PREFLIGHT_TOKEN not set${colors.reset}`);
  console.error(`\nSet ADMIN_PREFLIGHT_TOKEN environment variable or add to .env.local\n`);
  process.exit(1);
}

// Normalize URL (remove trailing slash)
const baseUrl = prodUrl.replace(/\/$/, '');
const apiUrl = `${baseUrl}/api/debug/preflight`;

console.log(`\n${colors.bold}${colors.cyan}Production Preflight Check${colors.reset}`);
console.log(`Target: ${colors.cyan}${baseUrl}${colors.reset}\n`);
console.log('─'.repeat(80));

// Fetch preflight data with timeout
async function runCheck() {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout

  try {
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'X-ADMIN-PREFLIGHT-TOKEN': token,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 401) {
        console.error(`${STATUS.FAIL} ${colors.red}Authentication failed${colors.reset}`);
        console.error(`  Check ADMIN_PREFLIGHT_TOKEN matches the token set in Amplify environment variables\n`);
        process.exit(1);
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    // Print checks
    const checks = data.checks || {};
    let failCount = 0;
    let warnCount = 0;

    for (const [key, value] of Object.entries(checks)) {
      let status = STATUS.OK;
      let detail = String(value);

      if (value === false) {
        status = STATUS.FAIL;
        failCount++;
      } else if (value === 'manual' || value === 'not_implemented' || value === 'query_failed' || String(value).includes('no_users')) {
        status = STATUS.WARN;
        warnCount++;
      } else if (typeof value === 'string' && value !== 'true') {
        // String values are informational
        status = STATUS.OK;
      }

      console.log(`${status} ${key}: ${detail}`);
    }

    console.log('─'.repeat(80));

    // Print failures
    if (data.failures && data.failures.length > 0) {
      console.log(`\n${colors.red}${colors.bold}Failures:${colors.reset}`);
      for (const failure of data.failures) {
        console.log(`  ${STATUS.FAIL} ${failure}`);
      }
    }

    // Print warnings
    if (data.warnings && data.warnings.length > 0) {
      console.log(`\n${colors.yellow}${colors.bold}Warnings:${colors.reset}`);
      for (const warning of data.warnings) {
        console.log(`  ${STATUS.WARN} ${warning}`);
      }
    }

    console.log('─'.repeat(80));

    // Overall status
    if (data.ok) {
      console.log(`\n${colors.green}${colors.bold}OVERALL: PASSED${colors.reset}`);
      if (warnCount > 0 || (data.warnings && data.warnings.length > 0)) {
        console.log(`${colors.yellow}Warnings: ${data.warnings?.length || warnCount}${colors.reset}`);
      }
      console.log(`Timestamp: ${data.timestamp}\n`);
      process.exit(0);
    } else {
      console.log(`\n${colors.red}${colors.bold}OVERALL: FAILED${colors.reset}`);
      console.log(`${colors.red}Failures: ${data.failures?.length || failCount}${colors.reset}`);
      if (warnCount > 0 || (data.warnings && data.warnings.length > 0)) {
        console.log(`${colors.yellow}Warnings: ${data.warnings?.length || warnCount}${colors.reset}`);
      }
      console.log(`Timestamp: ${data.timestamp}\n`);
      process.exit(1);
    }
  } catch (err) {
    clearTimeout(timeoutId);

    if (err.name === 'AbortError') {
      console.error(`${STATUS.FAIL} ${colors.red}Request timeout (8s)${colors.reset}`);
      console.error(`  Check if the production URL is accessible\n`);
      process.exit(1);
    }

    console.error(`${STATUS.FAIL} ${colors.red}Failed to fetch preflight data${colors.reset}`);
    console.error(`  Error: ${err.message}\n`);
    process.exit(1);
  }
}

runCheck();
