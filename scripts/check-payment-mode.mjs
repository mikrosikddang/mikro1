import pkg from "pg";
const { Pool } = pkg;
import { config } from "dotenv";
config({ path: ".env.local" });
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const rows = await pool.query(`SELECT key, value, "updatedAt" FROM "AppSetting" WHERE key IN ('TOSS_PAYMENT_MODE','toss.mode','payment.mode') ORDER BY key`);
console.log("AppSetting rows:", rows.rows);

await pool.end();
