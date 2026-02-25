import "dotenv/config";
import { PrismaClient, UserRole, SellerApprovalStatus } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

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
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const r = String(randInt(0, 999999)).padStart(6, "0");
  return `${y}${m}${day}-${r}`;
}

/** Pick N unique random items from array */
function pickN<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

async function main() {
  // ========================================
  // SEED 재실행 방지 — 이미 데이터가 있으면 중단
  // ========================================
  const existingUsers = await prisma.user.count();
  if (existingUsers > 0) {
    console.error("❌ SEED 중단: DB에 이미 사용자 " + existingUsers + "명이 존재합니다.");
    console.error("   시드를 다시 실행하면 모든 운영 데이터가 삭제됩니다.");
    console.error("   정말로 초기화하려면 --force 플래그를 사용하세요:");
    console.error("   npx prisma db seed -- --force");

    const forceFlag = process.argv.includes("--force");
    if (!forceFlag) {
      console.error("\n🛑 시드 실행이 취소되었습니다. 데이터는 안전합니다.");
      process.exit(1);
    }

    console.warn("\n⚠️  --force 플래그 감지. 모든 데이터를 삭제하고 재생성합니다...");
    console.warn("   5초 후 실행됩니다. 취소하려면 Ctrl+C");
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  // Clean start (--force이거나 빈 DB일 때만 실행)
  await prisma.shipment.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.productImage.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.product.deleteMany();
  await prisma.sellerProfile.deleteMany();
  await prisma.user.deleteMany();

  // ========================================
  // ADMIN BOOTSTRAP (환경변수 기반 - 초기 1회 운영자 생성)
  // ========================================
  // 환경변수 ADMIN_BOOTSTRAP_EMAIL + ADMIN_BOOTSTRAP_PASSWORD 설정 시에만 Admin 생성
  // 설정하지 않으면 SKIP (정상 동작)
  const bootstrapEmail = process.env.ADMIN_BOOTSTRAP_EMAIL?.trim();
  const bootstrapPassword = process.env.ADMIN_BOOTSTRAP_PASSWORD;

  let adminBootstrapResult = null;

  if (bootstrapEmail && bootstrapPassword) {
    const hashedPassword = await bcrypt.hash(bootstrapPassword, 10);
    const admin = await prisma.user.upsert({
      where: { email: bootstrapEmail },
      update: {
        password: hashedPassword,
        role: UserRole.ADMIN,
      },
      create: {
        email: bootstrapEmail,
        name: "Platform Admin",
        password: hashedPassword,
        role: UserRole.ADMIN,
      },
    });
    adminBootstrapResult = { email: admin.email, created: true };
    console.log(`✅ Admin bootstrap: ${admin.email} (role: ADMIN)`);
  } else {
    console.log("ℹ️  Admin bootstrap skipped (no ADMIN_BOOTSTRAP_EMAIL/PASSWORD)");
  }

  // ========================================
  // MVP TEST ACCOUNTS (Deterministic IDs)
  // ========================================

  // MVP CUSTOMER: Login with "1" / "1"
  const mvpCustomerPassword = await bcrypt.hash("1", 10);
  const mvpCustomer = await prisma.user.upsert({
    where: { id: "mvp-customer-1" },
    update: {
      email: "mvp1@mikro.local",
      name: "MVP Customer",
      password: mvpCustomerPassword,
      role: UserRole.CUSTOMER,
    },
    create: {
      id: "mvp-customer-1",
      email: "mvp1@mikro.local",
      name: "MVP Customer",
      password: mvpCustomerPassword,
      role: UserRole.CUSTOMER,
    },
  });

  // MVP SELLER: Login with "s" / "s"
  const mvpSellerPassword = await bcrypt.hash("s", 10);
  const mvpSeller = await prisma.user.upsert({
    where: { id: "mvp-seller-1" },
    update: {
      email: "seller1@mikro.local",
      name: "MVP Seller",
      password: mvpSellerPassword,
      role: UserRole.SELLER_ACTIVE,
    },
    create: {
      id: "mvp-seller-1",
      email: "seller1@mikro.local",
      name: "MVP Seller",
      password: mvpSellerPassword,
      role: UserRole.SELLER_ACTIVE,
    },
  });

  // MVP SELLER PROFILE
  await prisma.sellerProfile.upsert({
    where: { userId: "mvp-seller-1" },
    update: {
      shopName: "동대문A",
      type: "도매",
      marketBuilding: "동대문",
      floor: "A",
      roomNo: "101",
      managerName: "담당자1",
      managerPhone: "010-1234-5678",
      bizRegImageUrl: "https://placehold.co/600x800?text=biz",
      status: SellerApprovalStatus.APPROVED,
      shippingFeeKrw: 3000,
      freeShippingThreshold: 50000,
    },
    create: {
      userId: "mvp-seller-1",
      shopName: "동대문A",
      type: "도매",
      marketBuilding: "동대문",
      floor: "A",
      roomNo: "101",
      managerName: "담당자1",
      managerPhone: "010-1234-5678",
      bizRegImageUrl: "https://placehold.co/600x800?text=biz",
      status: SellerApprovalStatus.APPROVED,
      shippingFeeKrw: 3000,
      freeShippingThreshold: 50000,
    },
  });

  // Sellers — additional test sellers (not MVP login accounts)
  const mvpSellerId = "mvp-seller-1"; // Use deterministic ID

  // Additional sellers (MVP seller already created above)
  const additionalSellers = await Promise.all(
    ["동대문B", "동대문C"].map((shopName, i) =>
      prisma.user.upsert({
        where: { email: `seller${i + 2}@mikro.local` },
        update: {},
        create: {
          email: `seller${i + 2}@mikro.local`,
          name: `Seller${i + 2}`,
          role: UserRole.SELLER_ACTIVE,
          sellerProfile: {
            create: {
              shopName,
              type: pick(["여성", "남성", "혼합"]),
              marketBuilding: pick(["APM", "누죤", "디자이너클럽", "밀리오레"]),
              floor: String(randInt(1, 6)),
              roomNo: `${randInt(100, 999)}호`,
              managerName: `담당자${i + 2}`,
              managerPhone: `010-12${randInt(10, 99)}-${randInt(1000, 9999)}`,
              bizRegImageUrl: "https://placehold.co/600x800?text=biz",
              status: SellerApprovalStatus.APPROVED,
            },
          },
        },
      }),
    ),
  );

  const sellers = [mvpSeller, ...additionalSellers];

  // Additional customers (MVP customer already created above)
  const additionalCustomers = await Promise.all(
    Array.from({ length: 4 }).map((_, i) =>
      prisma.user.upsert({
        where: { email: `customer${i + 2}@mikro.local` },
        update: {},
        create: {
          email: `customer${i + 2}@mikro.local`,
          name: `Customer${i + 2}`,
          role: UserRole.CUSTOMER,
        },
      }),
    ),
  );

  const customers = [mvpCustomer, ...additionalCustomers];

  // 3-Depth category definitions aligned with lib/categories.ts
  const categoryDefs: { main: string; mid: string; sub: string; titleHint: string }[] = [
    { main: "여성의류", mid: "상의", sub: "티셔츠", titleHint: "티셔츠" },
    { main: "여성의류", mid: "상의", sub: "셔츠/블라우스", titleHint: "블라우스" },
    { main: "여성의류", mid: "상의", sub: "니트/스웨터", titleHint: "니트" },
    { main: "여성의류", mid: "상의", sub: "후드/맨투맨", titleHint: "맨투맨" },
    { main: "여성의류", mid: "아우터", sub: "자켓", titleHint: "자켓" },
    { main: "여성의류", mid: "아우터", sub: "가디건", titleHint: "가디건" },
    { main: "여성의류", mid: "아우터", sub: "코트", titleHint: "코트" },
    { main: "여성의류", mid: "하의", sub: "데님", titleHint: "데님" },
    { main: "여성의류", mid: "하의", sub: "슬랙스", titleHint: "슬랙스" },
    { main: "여성의류", mid: "스커트", sub: "미니", titleHint: "미니스커트" },
    { main: "여성의류", mid: "스커트", sub: "미디", titleHint: "미디스커트" },
    { main: "여성의류", mid: "원피스", sub: "미디", titleHint: "원피스" },
    { main: "여성의류", mid: "원피스", sub: "미니", titleHint: "미니원피스" },
    { main: "남성의류", mid: "상의", sub: "티셔츠", titleHint: "티셔츠" },
    { main: "남성의류", mid: "상의", sub: "셔츠", titleHint: "셔츠" },
    { main: "남성의류", mid: "상의", sub: "니트/스웨터", titleHint: "니트" },
    { main: "남성의류", mid: "상의", sub: "후드/맨투맨", titleHint: "맨투맨" },
    { main: "남성의류", mid: "아우터", sub: "자켓", titleHint: "자켓" },
    { main: "남성의류", mid: "아우터", sub: "점퍼/바람막이", titleHint: "점퍼" },
    { main: "남성의류", mid: "하의", sub: "데님", titleHint: "데님" },
    { main: "남성의류", mid: "하의", sub: "슬랙스", titleHint: "슬랙스" },
    { main: "남성의류", mid: "하의", sub: "숏팬츠", titleHint: "숏팬츠" },
  ];

  // Color sets for variants (from lib/colors.ts keys)
  const variantColors = [
    ["블랙", "화이트", "네이비"],
    ["베이지", "그레이", "카키"],
    ["아이보리", "블랙", "브라운"],
    ["화이트", "연핑크", "스카이블루"],
    ["차콜", "네이비", "베이지"],
    ["블랙", "아이보리", "그레이"],
    ["카멜", "블랙", "화이트"],
    ["네이비", "화이트", "올리브"],
  ];

  const titleA = ["미니멀", "데일리", "스탠다드", "오버핏", "슬림핏", "빈티지", "캐주얼", "포멀"];

  // Category-specific product images (Unsplash)
  // Keys: "${gender}_${titleHint}" for gender-aware lookups
  const IMG = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=900&q=80`;
  const categoryImages: Record<string, string[]> = {
    // ── 여성 상의 ──
    "여성_티셔츠": [
      IMG("photo-1521572163474-6864f9cf17ab"),
      IMG("photo-1576566588028-4147f3842f27"),
      IMG("photo-1618354691373-d851c5c3a990"),
      IMG("photo-1503342217505-b0a15ec3261c"),
    ],
    "여성_블라우스": [
      IMG("photo-1598554747436-c9293d6a588f"),
      IMG("photo-1564257631407-4deb1f99d992"),
      IMG("photo-1611312449408-fcece27cdbb7"),
      IMG("photo-1516762689617-e1cffcef479d"),
    ],
    "여성_니트": [
      IMG("photo-1576871337632-b9aef4c17ab9"),
      IMG("photo-1620799140408-edc6dcb6d633"),
      IMG("photo-1631541909061-71e349d1f203"),
      IMG("photo-1584273143981-41c073dfe8f8"),
    ],
    "여성_맨투맨": [
      IMG("photo-1556821840-3a63f95609a7"),
      IMG("photo-1578768079052-aa76e52ff62e"),
      IMG("photo-1572495532056-8583af1cbae0"),
      IMG("photo-1609505848912-b7c3b8b4beda"),
    ],
    // ── 여성 아우터 ──
    "여성_자켓": [
      IMG("photo-1551028719-00167b16eac5"),
      IMG("photo-1591047139829-d91aecb6caea"),
      IMG("photo-1548624313-0396c75e4b1a"),
      IMG("photo-1594938298603-c8148c4dae35"),
    ],
    "여성_가디건": [
      IMG("photo-1583744946564-b52ac1c389c8"),
      IMG("photo-1619603364904-c0498317e145"),
      IMG("photo-1598300042247-d088f8ab3a91"),
      IMG("photo-1620799140408-edc6dcb6d633"),
    ],
    "여성_코트": [
      IMG("photo-1539533113208-f6df8cc8b543"),
      IMG("photo-1591369822096-ffd140ec948f"),
      IMG("photo-1544022613-e87ca75a784a"),
      IMG("photo-1578587018452-892bacefd3f2"),
    ],
    // ── 여성 하의 ──
    "여성_데님": [
      IMG("photo-1541099649105-f69ad21f3246"),
      IMG("photo-1542272604-787c3835535d"),
      IMG("photo-1582418702059-97ebafb35d09"),
      IMG("photo-1604176354204-9268737828e4"),
    ],
    "여성_슬랙스": [
      IMG("photo-1506629082955-511b1aa562c8"),
      IMG("photo-1594633312681-425c7b97ccd1"),
      IMG("photo-1551854838-212c50b4c184"),
      IMG("photo-1560243563-062bfc001d68"),
    ],
    // ── 여성 스커트 ──
    "여성_미니스커트": [
      IMG("photo-1515734674582-29010bb37906"),
      IMG("photo-1585386959984-a4155224a1ad"),
      IMG("photo-1577900232427-18219b9166a0"),
      IMG("photo-1582142306909-195724d33ffc"),
    ],
    "여성_미디스커트": [
      IMG("photo-1515734674582-29010bb37906"),
      IMG("photo-1592301933927-35b597393c0a"),
      IMG("photo-1577900232427-18219b9166a0"),
      IMG("photo-1585386959984-a4155224a1ad"),
    ],
    // ── 여성 원피스 ──
    "여성_원피스": [
      IMG("photo-1572804013309-59a88b7e92f1"),
      IMG("photo-1595777457583-95e059d581b8"),
      IMG("photo-1612336307429-8a898d10e223"),
      IMG("photo-1568252542512-9fe8fe9c87bb"),
    ],
    "여성_미니원피스": [
      IMG("photo-1572804013309-59a88b7e92f1"),
      IMG("photo-1612336307429-8a898d10e223"),
      IMG("photo-1595777457583-95e059d581b8"),
      IMG("photo-1568252542512-9fe8fe9c87bb"),
    ],
    // ── 남성 상의 ──
    "남성_티셔츠": [
      IMG("photo-1562157873-818bc0726f68"),
      IMG("photo-1583743814966-8936f5b7be1a"),
      IMG("photo-1521572163474-6864f9cf17ab"),
      IMG("photo-1618354691373-d851c5c3a990"),
    ],
    "남성_셔츠": [
      IMG("photo-1596755094514-f87e34085b2c"),
      IMG("photo-1607345366928-199ea26cfe3e"),
      IMG("photo-1594938328870-9623159c8c99"),
      IMG("photo-1620012253295-c15cc3e65df4"),
    ],
    "남성_니트": [
      IMG("photo-1576871337632-b9aef4c17ab9"),
      IMG("photo-1620799140408-edc6dcb6d633"),
      IMG("photo-1523381210434-271e8be1f52b"),
      IMG("photo-1584273143981-41c073dfe8f8"),
    ],
    "남성_맨투맨": [
      IMG("photo-1565693413579-8ff3fdc1b03b"),
      IMG("photo-1556821840-3a63f95609a7"),
      IMG("photo-1578768079052-aa76e52ff62e"),
      IMG("photo-1609505848912-b7c3b8b4beda"),
    ],
    // ── 남성 아우터 ──
    "남성_자켓": [
      IMG("photo-1507679799987-c73779587ccf"),
      IMG("photo-1551028719-00167b16eac5"),
      IMG("photo-1591047139829-d91aecb6caea"),
      IMG("photo-1548624313-0396c75e4b1a"),
    ],
    "남성_점퍼": [
      IMG("photo-1544441893-675973e31985"),
      IMG("photo-1544022613-e87ca75a784a"),
      IMG("photo-1551028719-00167b16eac5"),
      IMG("photo-1591047139829-d91aecb6caea"),
    ],
    // ── 남성 하의 ──
    "남성_데님": [
      IMG("photo-1542272604-787c3835535d"),
      IMG("photo-1541099649105-f69ad21f3246"),
      IMG("photo-1604176354204-9268737828e4"),
      IMG("photo-1582418702059-97ebafb35d09"),
    ],
    "남성_슬랙스": [
      IMG("photo-1624378439575-d8705ad7ae80"),
      IMG("photo-1506629082955-511b1aa562c8"),
      IMG("photo-1594633312681-425c7b97ccd1"),
      IMG("photo-1473966968600-fa801b869a1a"),
    ],
    "남성_숏팬츠": [
      IMG("photo-1591195853828-11db59a44f6b"),
      IMG("photo-1565084888279-aca607ecce0c"),
      IMG("photo-1560243563-062bfc001d68"),
      IMG("photo-1542272604-787c3835535d"),
    ],
  };

  // Fallback images (generic clothing product shots)
  const fallbackImages: string[] = [
    IMG("photo-1489987707025-afc232f7ea0f"),
    IMG("photo-1558171813-4c088753af8f"),
    IMG("photo-1490481651871-ab68de25d43d"),
    IMG("photo-1445205170230-053b83016050"),
  ];

  // Content-style images (detail / look-book feel)
  const contentStyleImages: string[] = [
    "https://images.unsplash.com/photo-1617137968427-85924c800a22?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1603344797033-f0f4f587ab60?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1507680434567-5739c80be1ac?auto=format&fit=crop&w=900&q=80",
  ];

  const sizes = ["S", "M", "L"];

  // Products 30개
  const products = [];
  for (let i = 0; i < 30; i++) {
    const seller = pick(sellers);
    const catDef = pick(categoryDefs);
    const colors = pick(variantColors);
    const title = `${pick(titleA)} ${catDef.titleHint} ${randInt(1, 99)}`;
    const price = randInt(19000, 129000);

    // Pick 3 MAIN images from category-specific pool
    const gender = catDef.main === "남성의류" ? "남성" : "여성";
    const catKey = `${gender}_${catDef.titleHint}`;
    const mainImgs = pickN(categoryImages[catKey] || fallbackImages, 3);
    const contentImgs = pickN(contentStyleImages, 2);

    // Create variants: each color × each size
    const variantData = colors.flatMap((color) =>
      sizes.map((s) => ({
        color,
        sizeLabel: s,
        stock: randInt(3, 30),
      }))
    );

    const product = await prisma.product.create({
      data: {
        sellerId: seller.id,
        title,
        description: "MVP 목데이터 상품입니다. 실제 설명은 판매자가 입력합니다.",
        category: catDef.mid,
        categoryMain: catDef.main,
        categoryMid: catDef.mid,
        categorySub: catDef.sub,
        priceKrw: price,
        images: {
          create: [
            // MAIN images
            ...mainImgs.map((url, idx) => ({
              url,
              kind: "MAIN" as const,
              sortOrder: idx,
            })),
            // CONTENT images
            ...contentImgs.map((url, idx) => ({
              url,
              kind: "CONTENT" as const,
              sortOrder: idx,
            })),
          ],
        },
        variants: {
          create: variantData,
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
  console.log({
    adminBootstrap: adminBootstrapResult || "skipped (no env vars)",
    mvpCustomer: { id: mvpCustomer.id, email: mvpCustomer.email, login: "1/1" },
    mvpSeller: { id: mvpSeller.id, email: mvpSeller.email, login: "s/s" },
    sellerEmails: sellers.map((s) => s.email),
    customerEmails: customers.map((c) => c.email),
  });
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
