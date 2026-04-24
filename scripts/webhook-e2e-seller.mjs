/**
 * E2E: seller.changed 웹훅이 실제로 DB 를 업데이트하는지 검증.
 * 임의 SellerProfile 하나에 더미 tossSellerId 부여 → 웹훅 호출 → 상태 변경 확인 → 롤백.
 */
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const DUMMY_TOSS_SELLER_ID = `e2e_seller_${Date.now()}`;

try {
  const target = await prisma.sellerProfile.findFirst({
    where: { tossSellerId: null },
    select: { id: true, shopName: true },
  });
  if (!target) {
    console.log("⚠️ SellerProfile 가 없음. 스킵");
    process.exit(0);
  }

  console.log(`[setup] target=${target.id} (${target.shopName})`);
  await prisma.sellerProfile.update({
    where: { id: target.id },
    data: {
      tossSellerId: DUMMY_TOSS_SELLER_ID,
      tossSellerStatus: "KYC_WAITING",
    },
  });
  console.log(`[setup] tossSellerId=${DUMMY_TOSS_SELLER_ID}, status=KYC_WAITING`);

  console.log("\n[webhook] POST seller.changed → APPROVED");
  const res = await fetch("http://localhost:3010/api/payments/toss/webhook", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      eventType: "seller.changed",
      data: {
        id: DUMMY_TOSS_SELLER_ID,
        refSellerId: target.id,
        status: "APPROVED",
      },
    }),
  });
  console.log(`http=${res.status} body=${await res.text()}`);

  const after = await prisma.sellerProfile.findUnique({
    where: { id: target.id },
    select: { tossSellerId: true, tossSellerStatus: true },
  });
  console.log("\n[verify] DB state after webhook:");
  console.log(JSON.stringify(after, null, 2));

  if (after?.tossSellerStatus === "APPROVED") {
    console.log("\n✅ PASS: tossSellerStatus 가 APPROVED 로 정상 업데이트됨");
  } else {
    console.log("\n❌ FAIL: tossSellerStatus 업데이트 안 됨");
  }
} finally {
  console.log("\n[cleanup] 더미 데이터 롤백");
  await prisma.sellerProfile.updateMany({
    where: { tossSellerId: DUMMY_TOSS_SELLER_ID },
    data: { tossSellerId: null, tossSellerStatus: null },
  });
  await prisma.$disconnect();
}
