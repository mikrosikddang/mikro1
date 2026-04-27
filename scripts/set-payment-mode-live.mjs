import pkg from "pg";
const { Pool } = pkg;
import { config } from "dotenv";
config({ path: ".env.local" });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const SETTING_KEY = "payment.toss.mode";
const NEXT_VALUE = { mode: "live" };

const before = await pool.query(`SELECT key, value FROM "AppSetting" WHERE key=$1`, [SETTING_KEY]);
console.log("BEFORE:", before.rows);

await pool.query(
  `INSERT INTO "AppSetting" (key, value, "updatedBy", "updatedAt")
   VALUES ($1, $2::jsonb, 'manual-cli', NOW())
   ON CONFLICT (key)
   DO UPDATE SET value=$2::jsonb, "updatedBy"='manual-cli', "updatedAt"=NOW()`,
  [SETTING_KEY, JSON.stringify(NEXT_VALUE)]
);

const after = await pool.query(`SELECT key, value, "updatedBy", "updatedAt" FROM "AppSetting" WHERE key=$1`, [SETTING_KEY]);
console.log("AFTER:", after.rows);

await pool.end();
