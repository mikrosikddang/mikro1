import pkg from "pg";
const { Pool } = pkg;
import { config } from "dotenv";
config({ path: ".env.local" });
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

/**
 * Production DB 스키마 정합성 점검 도구.
 *
 * 사용:
 *   node ./scripts/check-schema-integrity.mjs
 *
 * 배경:
 *   _prisma_migrations 에 row 가 있어도 실제 DDL 이 적용되지 않은 "거짓 적용"
 *   사고가 가능하다 (예: vbank 마이그레이션 사고). 마이그레이션 적용 직후엔
 *   반드시 이 스크립트를 돌려 실제 컬럼/enum/테이블 존재 여부를 확인한다.
 */

const colCheck = (table, col) => ({
  label: `${table}.${col}`,
  q: `SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='${table}' AND column_name='${col}'`,
});
const tableCheck = (table) => ({
  label: `${table} table`,
  q: `SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='${table}'`,
});
const enumCheck = (typname, label) => ({
  label: `enum ${typname}.${label}`,
  q: `SELECT 1 FROM pg_type t JOIN pg_enum e ON e.enumtypid=t.oid WHERE t.typname='${typname}' AND e.enumlabel='${label}'`,
});

const checks = [
  // 결제
  colCheck("Payment", "mode"),
  colCheck("Payment", "vbankBank"),
  colCheck("Payment", "vbankCode"),
  colCheck("Payment", "vbankNumber"),
  colCheck("Payment", "vbankHolder"),
  colCheck("Payment", "vbankDueDate"),
  colCheck("Payment", "vbankSecret"),
  enumCheck("OrderStatus", "WAITING_DEPOSIT"),

  // 어드민/정산
  tableCheck("AppSetting"),
  tableCheck("OrderClaim"),
  tableCheck("Payout"),
  colCheck("OrderCommission", "payoutId"),
  colCheck("SellerProfile", "tossSellerId"),
  colCheck("SellerProfile", "tossSellerStatus"),

  // 셀러 / 주문
  colCheck("SellerProfile", "shippingFeeKrw"),
  colCheck("SellerProfile", "freeShippingThreshold"),
  colCheck("SellerProfile", "creatorSlug"),
  colCheck("Order", "checkoutAttemptId"),
  colCheck("Order", "itemsSubtotalKrw"),
  colCheck("Order", "shippingFeeKrw"),
  colCheck("Order", "totalPayKrw"),
  colCheck("Order", "expiresAt"),
];

let failed = 0;
for (const c of checks) {
  const r = await pool.query(c.q);
  const ok = r.rowCount > 0;
  if (!ok) failed += 1;
  console.log(ok ? "✓" : "✗", c.label);
}

console.log("");
if (failed > 0) {
  console.log(`✗ ${failed} schema item(s) missing — DB 가 schema.prisma 와 어긋남.`);
  await pool.end();
  process.exit(1);
} else {
  console.log("✓ all schema items present");
  await pool.end();
}
