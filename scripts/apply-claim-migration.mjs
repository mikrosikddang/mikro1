import "dotenv/config";
import pg from "pg";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

const sql = readFileSync(
  join(__dirname, "..", "prisma", "migrations", "20260404170000_add_order_claim", "migration.sql"),
  "utf8",
);

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  await client.query("BEGIN");
  await client.query(sql);
  await client.query("COMMIT");
  console.log("OrderClaim migration applied successfully");
} catch (err) {
  await client.query("ROLLBACK").catch(() => {});
  console.error("Migration error:", err.message);
  process.exit(1);
} finally {
  await client.end();
}
