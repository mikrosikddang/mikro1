/**
 * One-time cleanup: cancel all existing PENDING orders
 *
 * These are unpaid orders that should have been cancelled.
 *
 * Usage:  node scripts/cancel-pending-orders.mjs [--dry-run]
 */
import "dotenv/config";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const dryRun = process.argv.includes("--dry-run");

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log(`모드: ${dryRun ? "DRY-RUN (변경 없음)" : "LIVE (실제 변경)"}\n`);

  const pendingOrders = await prisma.order.findMany({
    where: { status: "PENDING" },
    select: {
      id: true,
      orderNo: true,
      createdAt: true,
      expiresAt: true,
      totalPayKrw: true,
    },
  });

  console.log(`PENDING 주문: ${pendingOrders.length}건\n`);

  for (const order of pendingOrders) {
    const expired = order.expiresAt && order.expiresAt < new Date();
    console.log(
      `  ${order.orderNo} | ${order.totalPayKrw}원 | ${order.createdAt.toISOString()} | 만료: ${expired ? "Y" : "N"}`
    );
  }

  if (!dryRun && pendingOrders.length > 0) {
    const result = await prisma.order.updateMany({
      where: { status: "PENDING" },
      data: { status: "EXPIRED" },
    });
    console.log(`\n${result.count}건 EXPIRED 처리 완료`);
  } else if (dryRun) {
    console.log("\n(DRY-RUN: 변경 없음)");
  } else {
    console.log("\n처리할 PENDING 주문 없음");
  }

  await prisma.$disconnect();
  await pool.end();
}

main().catch((err) => {
  console.error("스크립트 실패:", err);
  process.exit(1);
});
