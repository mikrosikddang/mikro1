import Link from "next/link";
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getTotalStock, getProductBadge } from "@/lib/productState";
import ProductCard from "@/components/ProductCard";
import SellerProductFilter from "@/components/SellerProductFilter";

type Props = {
  searchParams: Promise<{ showHidden?: string; showDeleted?: string }>;
};

/** Build variant summary string like "S:10 M:8 L:6" */
function buildVariantSummary(variants: { sizeLabel: string; stock: number }[]): string {
  if (variants.length <= 1 && variants[0]?.sizeLabel === "FREE") return "";
  return variants.map((v) => `${v.sizeLabel}:${v.stock}`).join(" ");
}

export default async function SellerProductsPage({ searchParams }: Props) {
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
      images: { where: { kind: "MAIN" }, orderBy: { sortOrder: "asc" } },
      seller: { include: { sellerProfile: true } },
      variants: { orderBy: { createdAt: "asc" } },
    },
  });

  const shopName = seller?.sellerProfile?.shopName ?? "내 상점";

  // Compute total stock per product
  const productsWithStock = allProducts.map((p) => {
    const stock = getTotalStock(p.variants);
    const variantSummary = buildVariantSummary(p.variants);
    return { ...p, totalStock: stock, variantSummary };
  });

  // Counts via single-source badge
  const counts = { ACTIVE: 0, HIDDEN: 0, SOLD_OUT: 0, DELETED: 0 };
  for (const p of productsWithStock) {
    counts[getProductBadge({ isActive: p.isActive, isDeleted: p.isDeleted, totalStock: p.totalStock })]++;
  }
  const { ACTIVE: activeCount, HIDDEN: hiddenCount, SOLD_OUT: soldOutCount, DELETED: deletedCount } = counts;

  // Filter based on toggles
  const products = productsWithStock.filter((p) => {
    if (p.isDeleted) return showDeleted;
    if (!p.isActive) return showHidden;
    return true;
  });

  return (
    <div className="py-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-[22px] font-bold text-black">상품 관리</h1>
            <p className="text-[13px] text-gray-500 mt-0.5">
              {shopName} · 전체 {allProducts.length}개
            </p>
          </div>
          <Link
            href="/seller/products/new"
            className="h-10 px-5 bg-black text-white rounded-xl text-[14px] font-medium flex items-center active:bg-gray-800 transition-colors"
          >
            + 상품 올리기
          </Link>
        </div>
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
            images={product.images.map((i) => ({ url: i.url }))}
            shopName={shopName}
            sellerId={sellerId}
            sellerMode
            isActive={product.isActive}
            isDeleted={product.isDeleted}
            totalStock={product.totalStock}
            variantSummary={product.variantSummary}
            variants={product.variants.map((v) => ({
              id: v.id,
              sizeLabel: v.sizeLabel,
              stock: v.stock,
            }))}
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
