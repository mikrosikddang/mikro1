import "dotenv/config";
import { PrismaClient, UserRole, SellerApprovalStatus, ProductStatus } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = `${process.env.DATABASE_URL}`;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]) {
  return arr[randInt(0, arr.length - 1)];
}

function makeOrderNo() {
  // 표시용: YYYYMMDD-랜덤6자리
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const r = String(randInt(0, 999999)).padStart(6, "0");
  return `${y}${m}${day}-${r}`;
}

async function main() {
  // 깨끗하게 시작(개발용)
  await prisma.shipment.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.productImage.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.product.deleteMany();
  await prisma.sellerProfile.deleteMany();
  await prisma.user.deleteMany();

  // Admin 1명
  const admin = await prisma.user.create({
    data: {
      email: "admin@mikro.local",
      name: "Admin",
      role: UserRole.ADMIN,
    },
  });

  // Sellers 3명 (승인 완료)
  const sellers = await Promise.all(
    ["동대문A", "동대문B", "동대문C"].map((shopName, i) =>
      prisma.user.create({
        data: {
          email: `seller${i + 1}@mikro.local`,
          name: `Seller${i + 1}`,
          role: UserRole.SELLER_ACTIVE,
          sellerProfile: {
            create: {
              shopName,
              type: pick(["여성", "남성", "혼합"]),
              marketBuilding: pick(["APM", "누죤", "디자이너클럽", "밀리오레"]),
              floor: String(randInt(1, 6)),
              roomNo: `${randInt(100, 999)}호`,
              managerName: `담당자${i + 1}`,
              managerPhone: `010-12${randInt(10, 99)}-${randInt(1000, 9999)}`,
              bizRegImageUrl: "https://placehold.co/600x800?text=biz",
              status: SellerApprovalStatus.APPROVED,
            },
          },
        },
      })
    )
  );

  // Customers 5명
  const customers = await Promise.all(
    Array.from({ length: 5 }).map((_, i) =>
      prisma.user.create({
        data: {
          email: `customer${i + 1}@mikro.local`,
          name: `Customer${i + 1}`,
          role: UserRole.CUSTOMER,
        },
      })
    )
  );

  const categories = ["아우터", "반팔티", "긴팔티", "니트", "셔츠", "바지", "원피스", "스커트"];
  const titleA = ["미니멀", "데일리", "스탠다드", "오버핏", "슬림핏", "빈티지", "캐주얼", "포멀"];
  const titleB = ["자켓", "가디건", "티셔츠", "니트", "셔츠", "데님", "슬랙스", "원피스"];

  // Curated Unsplash fashion images – minimal, clean, feminine Korean-style
  const minimalFashionImages: string[] = [
    "https://images.unsplash.com/photo-1581044777550-4cfa60707998?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1485968579580-b6d095142e6e?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1558171813-4c088753af8f?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1551803091-e20673f15770?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1581338834647-b0fb40704e21?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1495385794356-15371f348c31?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1434389677669-e08b4cda3a44?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1487222477894-8943e31ef7b2?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1475180098004-ca77a66827be?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1469334031218-e382a71b716b?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=900&q=80",
  ];

  /** Pick N unique random images from the array */
  function pickImages(n: number): string[] {
    const shuffled = [...minimalFashionImages].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, n);
  }

  // Products 30개
  const products = [];
  for (let i = 0; i < 30; i++) {
    const seller = pick(sellers);
    const category = pick(categories);
    const title = `${pick(titleA)} ${pick(titleB)} ${randInt(1, 99)}`;
    const price = randInt(19000, 129000);
    const imgs = pickImages(2);

    const product = await prisma.product.create({
      data: {
        sellerId: seller.id,
        title,
        description: "MVP 목데이터 상품입니다. 실제 설명은 판매자가 입력합니다.",
        category,
        priceKrw: price,
        status: ProductStatus.ACTIVE,
        images: {
          create: [
            { url: imgs[0], sortOrder: 0 },
            { url: imgs[1], sortOrder: 1 },
          ],
        },
        variants: {
          create: [
            {
              color: "FREE",
              size: "FREE",
              stock: randInt(1, 50),
            },
          ],
        },
      },
      include: { variants: true },
    });

    products.push(product);
  }

  // Orders 3개(테스트용)
  for (let i = 0; i < 3; i++) {
    const buyer = pick(customers);
    const product = pick(products);
    const variant = product.variants[0];
    const qty = randInt(1, 2);

    const order = await prisma.order.create({
      data: {
        orderNo: makeOrderNo(),
        status: i === 0 ? "PAID" : "PENDING",
        buyerId: buyer.id,
        sellerId: product.sellerId,
        totalAmountKrw: product.priceKrw * qty,
        shippingFeeKrw: 3000,
        shipToName: buyer.name || "구매자",
        shipToPhone: `010-99${randInt(10, 99)}-${randInt(1000, 9999)}`,
        shipToAddr1: "서울시 중구 을지로 어딘가",
        shipToAddr2: "101동 1001호",
        items: {
          create: [
            {
              productId: product.id,
              variantId: variant?.id,
              quantity: qty,
              unitPriceKrw: product.priceKrw,
            },
          ],
        },
        payment: i === 0
          ? {
              create: {
                status: "CONFIRMED",
                amountKrw: product.priceKrw * qty + 3000,
                method: "CARD",
              },
            }
          : undefined,
      },
    });

    // 1개는 배송까지
    if (i === 0) {
      await prisma.shipment.create({
        data: {
          orderId: order.id,
          courier: "CJ",
          trackingNo: `12${randInt(1000, 9999)}${randInt(100000, 999999)}`,
          shippedAt: new Date(),
        },
      });
    }
  }

  console.log("✅ Seed complete");
  console.log({ adminEmail: admin.email, sellerEmails: sellers.map(s => s.email), customerEmails: customers.map(c => c.email) });
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
