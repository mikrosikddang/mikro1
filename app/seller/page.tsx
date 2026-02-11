import Link from "next/link";
import { prisma } from "@/lib/prisma";
import ProductCard from "@/components/ProductCard";

export default async function SellerDashboardPage() {
  const sellerId = process.env.MVP_SELLER_ID!;

  const seller = await prisma.user.findUnique({
    where: { id: sellerId },
    include: { sellerProfile: true },
  });

  const products = await prisma.product.findMany({
    where: { sellerId },
    orderBy: { createdAt: "desc" },
    include: {
      images: { orderBy: { sortOrder: "asc" }, take: 1 },
      seller: { include: { sellerProfile: true } },
    },
  });

  const shopName = seller?.sellerProfile?.shopName ?? "내 상점";
  const activeCount = products.filter((p) => p.isActive).length;

  return (
    <div className="py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-bold text-black">{shopName}</h1>
          <p className="text-[13px] text-gray-500 mt-0.5">
            전체 {products.length}개 · 판매중 {activeCount}개
          </p>
        </div>
        <Link
          href="/seller/products/new"
          className="h-10 px-5 bg-black text-white rounded-xl text-[14px] font-medium flex items-center active:bg-gray-800 transition-colors"
        >
          상품 올리기
        </Link>
      </div>

      {/* Product list */}
      <div className="flex flex-col">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            id={product.id}
            title={product.title}
            priceKrw={product.priceKrw}
            imageUrl={product.images[0]?.url ?? null}
            shopName={shopName}
            sellerId={sellerId}
            sellerMode
            isActive={product.isActive}
          />
        ))}

        {products.length === 0 && (
          <div className="py-20 text-center">
            <p className="text-[40px] mb-3">📦</p>
            <p className="text-[15px] text-gray-500 mb-6">
              아직 등록된 상품이 없어요
            </p>
            <Link
              href="/seller/products/new"
              className="inline-block px-6 py-3 bg-black text-white rounded-xl text-[14px] font-medium"
            >
              첫 상품 올리기
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
