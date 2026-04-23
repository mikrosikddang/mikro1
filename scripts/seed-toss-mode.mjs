import pg from "pg";
const { Client } = pg;
const c = new Client({ connectionString: process.env.DATABASE_URL });
await c.connect();
await c.query(
  `INSERT INTO "AppSetting" (key, value, "updatedAt")
   VALUES ('payment.toss.mode', '{"mode":"test"}'::jsonb, NOW())
   ON CONFLICT (key) DO NOTHING`,
);
console.log("seeded payment.toss.mode (default: test)");
await c.end();
