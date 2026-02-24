import Link from "next/link";
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getTotalStock, getProductBadge } from "@/lib/productState";
import ProductCard from "@/components/ProductCard";
import SellerProductTabs from "@/components/SellerProductTabs";

type Props = {
  searchParams: Promise<{ tab?: string }>;
};

/** Build variant summary string like "블랙/S:10 블랙/M:8" */
function buildVariantSummary(variants: { color: string; sizeLabel: string; stock: number }[]): string {
  if (variants.length <= 1 && variants[0]?.sizeLabel === "FREE") return "";
  return variants.map((v) => {
    const prefix = v.color && v.color !== "FREE" ? `${v.color}/` : "";
    return `${prefix}${v.sizeLabel}:${v.stock}`;
  }).join(" ");
}

export default async function SellerProductsPage({ searchParams }: Props) {
  const params = await searchParams;
  const tab = params.tab || 'active';

  const session = await getSession();
  const sellerId = session!.userId; // layout guard guarantees SELLER

  const seller = await prisma.user.findUnique({
    where: { id: sellerId },
    include: { sellerProfile: true },
  });

  const allProducts = await prisma.product.findMany({
    where: { sellerId, isDeleted: false },
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

  // Calculate counts for each tab
  const tabCounts = productsWithStock.reduce((acc, p) => {
    const stock = p.totalStock;
    if (!p.isActive) {
      acc.hidden++;
    } else if (stock === 0) {
      acc.soldOut++;
    } else {
      acc.active++;
    }
    return acc;
  }, { active: 0, hidden: 0, soldOut: 0 });

  // Filter based on active tab
  const products = productsWithStock.filter((p) => {
    if (tab === 'hidden') return !p.isActive;
    if (tab === 'sold-out') return p.isActive && p.totalStock === 0;
    // 'active' tab (default)
    return p.isActive && p.totalStock > 0;
  });

  return (
    <div className="py-4">
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-[20px] font-bold text-black">상품 관리</h1>
            <p className="text-[13px] text-gray-500 mt-0.5">
              {shopName} · 전체 {allProducts.length}개
            </p>
          </div>
          <Link
            href="/seller/products/new"
            className="h-10 px-5 bg-black text-white rounded-lg text-[14px] font-medium flex items-center active:bg-gray-800 transition-colors"
          >
            + 상품 올리기
          </Link>
        </div>
      </div>

      {/* Status Tabs */}
      <Suspense fallback={null}>
        <SellerProductTabs counts={tabCounts} />
      </Suspense>

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
              color: v.color,
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
