/**
 * One-time migration: convert proxy image URLs to direct S3 URLs
 *
 * /api/images/xxx → https://mikro-prod-assets-mikro-9012.s3.ap-northeast-2.amazonaws.com/xxx
 *
 * Usage:  node scripts/migrate-image-urls.mjs [--dry-run]
 */
import "dotenv/config";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const dryRun = process.argv.includes("--dry-run");

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const S3_BASE = "https://mikro-prod-assets-mikro-9012.s3.ap-northeast-2.amazonaws.com";
const PREFIX = "/api/images/";

async function main() {
  console.log(`모드: ${dryRun ? "DRY-RUN (변경 없음)" : "LIVE (실제 변경)"}\n`);

  // 1. ProductImage URL
  const images = await prisma.productImage.findMany({
    where: { url: { startsWith: PREFIX } },
    select: { id: true, url: true },
  });
  console.log(`ProductImage: ${images.length}건 변환 대상`);

  for (const img of images) {
    const newUrl = `${S3_BASE}/${img.url.slice(PREFIX.length)}`;
    console.log(`  ${img.url} → ${newUrl}`);
    if (!dryRun) {
      await prisma.productImage.update({ where: { id: img.id }, data: { url: newUrl } });
    }
  }

  // 2. SellerProfile avatarUrl
  const profiles = await prisma.sellerProfile.findMany({
    where: { avatarUrl: { startsWith: PREFIX } },
    select: { id: true, avatarUrl: true },
  });
  console.log(`\nSellerProfile avatar: ${profiles.length}건 변환 대상`);

  for (const p of profiles) {
    const newUrl = `${S3_BASE}/${p.avatarUrl.slice(PREFIX.length)}`;
    console.log(`  ${p.avatarUrl} → ${newUrl}`);
    if (!dryRun) {
      await prisma.sellerProfile.update({ where: { id: p.id }, data: { avatarUrl: newUrl } });
    }
  }

  console.log(`\n완료: images ${images.length}건, avatars ${profiles.length}건`);

  await prisma.$disconnect();
  await pool.end();
}

main().catch((err) => {
  console.error("마이그레이션 실패:", err);
  process.exit(1);
});
