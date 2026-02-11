import Link from "next/link";
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import ProductCard from "@/components/ProductCard";
import SellerProductFilter from "@/components/SellerProductFilter";

type Props = {
  searchParams: Promise<{ showHidden?: string; showDeleted?: string }>;
};

export default async function SellerDashboardPage({ searchParams }: Props) {
  const params = await searchParams;
  const showHidden = params.showHidden === "1";
  const showDeleted = params.showDeleted === "1";

  const session = await getSession();
  const sellerId = session!.userId; // layout guard guarantees SELLER

  const seller = await prisma.user.findUnique({
    where: { id: sellerId },
    include: { sellerProfile: true },
  });

  const allProducts = await prisma.product.findMany({
    where: { sellerId },
    orderBy: { createdAt: "desc" },
    include: {
      images: { orderBy: { sortOrder: "asc" }, take: 1 },
      seller: { include: { sellerProfile: true } },
      variants: true,
    },
  });

  const shopName = seller?.sellerProfile?.shopName ?? "내 상점";

  // Counts (always based on all products)
  const activeCount = allProducts.filter(
    (p) => p.isActive && !p.isDeleted && (p.variants[0]?.stock ?? 0) > 0,
  ).length;
  const hiddenCount = allProducts.filter((p) => !p.isActive && !p.isDeleted).length;
  const soldOutCount = allProducts.filter(
    (p) => !p.isDeleted && p.isActive && (p.variants[0]?.stock ?? 0) <= 0,
  ).length;
  const deletedCount = allProducts.filter((p) => p.isDeleted).length;

  // Filter based on toggles (default: active only)
  const products = allProducts.filter((p) => {
    if (p.isDeleted) return showDeleted;
    if (!p.isActive) return showHidden;
    return true; // active products always shown
  });

  return (
    <div className="py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-bold text-black">{shopName}</h1>
          <p className="text-[13px] text-gray-500 mt-0.5">
            전체 {allProducts.length}개
          </p>
        </div>
        <Link
          href="/seller/products/new"
          className="h-10 px-5 bg-black text-white rounded-xl text-[14px] font-medium flex items-center active:bg-gray-800 transition-colors"
        >
          상품 올리기
        </Link>
      </div>

      {/* Filter toggles */}
      <div className="mb-4">
        <Suspense fallback={null}>
          <SellerProductFilter
            totalCount={allProducts.length}
            activeCount={activeCount}
            hiddenCount={hiddenCount}
            soldOutCount={soldOutCount}
            deletedCount={deletedCount}
          />
        </Suspense>
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
            isDeleted={product.isDeleted}
            stock={product.variants[0]?.stock ?? 0}
          />
        ))}

        {products.length === 0 && (
          <div className="py-20 text-center">
            <p className="text-[40px] mb-3">📦</p>
            <p className="text-[15px] text-gray-500 mb-6">
              {allProducts.length === 0
                ? "아직 등록된 상품이 없어요"
                : "필터 조건에 맞는 상품이 없어요"}
            </p>
            {allProducts.length === 0 && (
              <Link
                href="/seller/products/new"
                className="inline-block px-6 py-3 bg-black text-white rounded-xl text-[14px] font-medium"
              >
                첫 상품 올리기
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
