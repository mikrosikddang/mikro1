import fs from "node:fs";
import path from "node:path";
import pg from "pg";

const { Client } = pg;
const MIGRATION_NAME = "20260423210000_add_toss_payouts";
const SQL_PATH = path.join("prisma", "migrations", MIGRATION_NAME, "migration.sql");

async function main() {
  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) throw new Error("DATABASE_URL missing");

  const sql = fs.readFileSync(SQL_PATH, "utf8");
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  try {
    await client.query("BEGIN");
    await client.query(sql);
    await client.query("COMMIT");

    const existing = await client.query(
      `SELECT 1 FROM "_prisma_migrations" WHERE migration_name = $1 LIMIT 1`,
      [MIGRATION_NAME],
    );
    if (existing.rowCount === 0) {
      await client.query(
        `INSERT INTO "_prisma_migrations"
         (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
         VALUES (gen_random_uuid()::text, 'manual', NOW(), $1, NULL, NULL, NOW(), 1)`,
        [MIGRATION_NAME],
      );
    }
    console.log(`[migration] applied ${MIGRATION_NAME}`);
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
