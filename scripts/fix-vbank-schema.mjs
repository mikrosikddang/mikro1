import pkg from "pg";
const { Pool } = pkg;
import { config } from "dotenv";
config({ path: ".env.local" });
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const stmts = [
  `ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'WAITING_DEPOSIT'`,
  `ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "vbankBank"     VARCHAR(40)`,
  `ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "vbankCode"     VARCHAR(10)`,
  `ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "vbankNumber"   VARCHAR(40)`,
  `ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "vbankHolder"   VARCHAR(60)`,
  `ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "vbankDueDate"  TIMESTAMP(3)`,
  `ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "vbankSecret"   VARCHAR(64)`,
];

for (const s of stmts) {
  try { await pool.query(s); console.log("OK:", s.slice(0, 70)); }
  catch (e) { console.log("ERR:", s.slice(0, 70), "→", e.message); }
}

const cols = await pool.query(`
  SELECT column_name FROM information_schema.columns
  WHERE table_schema='public' AND table_name='Payment' AND column_name LIKE 'vbank%'`);
console.log("\nVerify vbank cols:", cols.rows.map(r => r.column_name));

const enums = await pool.query(`
  SELECT e.enumlabel FROM pg_type t JOIN pg_enum e ON e.enumtypid=t.oid
  WHERE t.typname='OrderStatus' AND e.enumlabel='WAITING_DEPOSIT'`);
console.log("Verify WAITING_DEPOSIT:", enums.rows.length === 1 ? "EXISTS" : "MISSING");

await pool.end();
