/**
 * /admin/payouts 가 사용하는 prisma 쿼리들을 직접 실행해 데이터/타입 점검.
 */
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

try {
  console.log("\n[1] OrderCommission groupBy (PAYABLE & payoutId IS NULL)");
  const payable = await prisma.orderCommission.groupBy({
    by: ["beneficiaryUserId"],
    where: {
      status: "PAYABLE",
      payoutId: null,
      beneficiaryUserId: { not: null },
    },
    _sum: { commissionAmountKrw: true },
    _count: { _all: true },
  });
  console.log("rows:", payable.length);
  console.log(JSON.stringify(payable, null, 2));

  console.log("\n[2] SellerProfile.tossSellerId 컬럼 read 확인");
  const sps = await prisma.sellerProfile.findMany({
    select: {
      id: true,
      shopName: true,
      tossSellerId: true,
      tossSellerStatus: true,
      tossSellerRegisteredAt: true,
    },
    take: 5,
  });
  console.log(JSON.stringify(sps, null, 2));

  console.log("\n[3] Payout 테이블 read");
  const payouts = await prisma.payout.findMany({ take: 5 });
  console.log("count:", payouts.length);

  console.log("\n[4] Payout count by status");
  const grouped = await prisma.payout.groupBy({
    by: ["status"],
    _count: { _all: true },
  });
  console.log(JSON.stringify(grouped, null, 2));

  console.log("\n✅ all queries passed");
} catch (err) {
  console.error("❌ error:", err);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
