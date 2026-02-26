import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getTotalStock } from "@/lib/productState";
import SellerProductReorderList from "@/components/SellerProductReorderList";

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
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
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

  // Serialize products to plain objects for the client component
  const products = productsWithStock.map((p) => ({
    id: p.id,
    title: p.title,
    priceKrw: p.priceKrw,
    salePriceKrw: p.salePriceKrw,
    isActive: p.isActive,
    isDeleted: p.isDeleted,
    totalStock: p.totalStock,
    variantSummary: p.variantSummary,
    images: p.images.map((i) => ({ url: i.url })),
    variants: p.variants.map((v) => ({
      id: v.id,
      color: v.color,
      sizeLabel: v.sizeLabel,
      stock: v.stock,
    })),
  }));

  return (
    <div className="py-4">
      <SellerProductReorderList
        products={products}
        shopName={shopName}
        sellerId={sellerId}
        tabCounts={tabCounts}
        currentTab={tab}
      />
    </div>
  );
}
