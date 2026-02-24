/**
 * One-time migration: backfill categoryMain/Mid/Sub for existing products
 *
 * Products created before the 3-depth category system only have the old
 * `category` field (바지, 아우터, 반팔티, 긴팔티, 니트, etc.).
 * This script maps them to the new categoryMain / categoryMid / categorySub.
 *
 * Usage:  node scripts/migrate-categories.mjs [--dry-run]
 */
import "dotenv/config";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const dryRun = process.argv.includes("--dry-run");
if (dryRun) console.log("🔍 DRY RUN — no changes will be written\n");

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

/**
 * Old category → new 3-depth mapping.
 * Gender is resolved per-product using the seller's profile type.
 */
const CATEGORY_MAP = {
  // mid + sub (gender determined at runtime)
  "바지":   { mid: "하의",   sub: "슬랙스" },
  "아우터": { mid: "아우터", sub: "자켓" },
  "반팔티": { mid: "상의",   sub: "티셔츠" },
  "긴팔티": { mid: "상의",   sub: "티셔츠" },
  "니트":   { mid: "상의",   sub: "니트/스웨터" },
};

/** Resolve gender (categoryMain) from seller profile type */
function resolveGender(sellerType) {
  if (sellerType === "남성") return "남성의류";
  return "여성의류"; // 여성, 혼합, 도매, null → default 여성
}

async function main() {
  // Fetch products with null categoryMain, include seller profile for gender
  const products = await prisma.product.findMany({
    where: { categoryMain: null },
    select: {
      id: true,
      title: true,
      category: true,
      seller: {
        select: {
          sellerProfile: {
            select: { type: true },
          },
        },
      },
    },
  });

  console.log(`Found ${products.length} product(s) with null categoryMain\n`);
  if (products.length === 0) {
    console.log("Nothing to migrate.");
    return;
  }

  let updated = 0;
  let defaulted = 0;

  for (const product of products) {
    const sellerType = product.seller?.sellerProfile?.type ?? null;
    const gender = resolveGender(sellerType);
    const mapping = product.category ? CATEGORY_MAP[product.category] : null;

    const newMain = gender;
    const newMid = mapping?.mid ?? "상의";
    const newSub = mapping?.sub ?? "티셔츠";
    const wasDefault = !mapping;

    if (wasDefault) defaulted++;

    const label = `${product.title} | old="${product.category ?? "null"}" seller="${sellerType ?? "?"}" → ${newMain}/${newMid}/${newSub}`;

    if (dryRun) {
      console.log(`  ${wasDefault ? "⚠️" : "✅"} [dry] ${label}`);
    } else {
      await prisma.product.update({
        where: { id: product.id },
        data: {
          categoryMain: newMain,
          categoryMid: newMid,
          categorySub: newSub,
        },
      });
      console.log(`  ${wasDefault ? "⚠️" : "✅"} ${label}`);
    }
    updated++;
  }

  console.log(`\n${dryRun ? "[DRY RUN] " : ""}Migration complete: ${updated} updated (${defaulted} used defaults)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
