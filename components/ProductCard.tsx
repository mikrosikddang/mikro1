import Link from "next/link";
import { formatKrw } from "@/lib/format";
import { getProductBadge } from "@/lib/productState";
import ToggleActiveButton from "@/components/ToggleActiveButton";
import StockAdjuster from "@/components/StockAdjuster";
import WishlistButton from "@/components/WishlistButton";
import ImageCarousel from "@/components/ImageCarousel";

type ProductCardProps = {
  id: string;
  title: string;
  priceKrw: number;
  /** Multiple MAIN images for swipe carousel */
  images: { url: string }[];
  shopName: string;
  sellerId: string;
  /** Seller dashboard mode – show badge + actions */
  sellerMode?: boolean;
  isActive?: boolean;
  isDeleted?: boolean;
  /** Total stock across all variants */
  totalStock?: number;
  /** e.g. "S:10 M:8 L:6" */
  variantSummary?: string;
  /** Variant data for stock adjusters (seller mode only) */
  variants?: { id: string; sizeLabel: string; stock: number }[];
};

export default function ProductCard({
  id,
  title,
  priceKrw,
  images,
  shopName,
  sellerId,
  sellerMode,
  isActive,
  isDeleted,
  totalStock,
  variantSummary,
  variants,
}: ProductCardProps) {
  const stock = totalStock ?? 0;
  const isSoldOut = stock <= 0;

  // Determine status badge for seller mode
  let badgeLabel = "";
  let badgeClass = "";
  if (sellerMode) {
    const badge = getProductBadge({
      isActive: isActive ?? true,
      isDeleted: isDeleted ?? false,
      totalStock: stock,
    });
    const badgeMap = {
      DELETED:  { label: "삭제됨", cls: "bg-red-500 text-white" },
      HIDDEN:   { label: "숨김",   cls: "bg-gray-500 text-white" },
      SOLD_OUT: { label: "품절",   cls: "bg-orange-500 text-white" },
      ACTIVE:   { label: "판매중", cls: "bg-green-500 text-white" },
    } as const;
    badgeLabel = badgeMap[badge].label;
    badgeClass = badgeMap[badge].cls;
  }

  const dimmed = sellerMode && (isDeleted || !isActive || isSoldOut);

  return (
    <article className={`bg-white ${dimmed ? "opacity-60" : ""}`}>
      {/* Product image carousel */}
      <div className="relative rounded-lg overflow-hidden">
        {sellerMode ? (
          // Seller mode: link wraps carousel
          <Link href={`/seller/products/${id}/edit`} className="block">
            <ImageCarousel images={images} aspect="3/4" dots={!sellerMode} />
          </Link>
        ) : (
          <>
            <Link href={`/p/${id}`} className="block">
              <ImageCarousel images={images} aspect="3/4" />
            </Link>
            {/* Wishlist heart – customer mode only */}
            <WishlistButton productId={id} variant="card" />
          </>
        )}

        {/* Status badge – seller mode only */}
        {sellerMode && badgeLabel && (
          <span className={`absolute top-2 left-2 z-10 px-2.5 py-1 rounded-lg text-[11px] font-bold ${badgeClass}`}>
            {badgeLabel}
          </span>
        )}
      </div>

      {/* Product info */}
      <div className="pt-3 pb-5">
        <Link href={sellerMode ? `/seller/products/${id}/edit` : `/p/${id}`}>
          <h3 className="text-[15px] font-medium text-gray-900 leading-snug line-clamp-2">
            {title}
          </h3>
        </Link>
        <p className="mt-1 text-[17px] font-bold text-black">
          {formatKrw(priceKrw)}
        </p>

        {!sellerMode && (
          <Link
            href={`/s/${sellerId}`}
            className="mt-1.5 inline-block text-[13px] text-gray-500 hover:text-gray-800 transition-colors"
          >
            {shopName}
          </Link>
        )}

        {/* Seller mode: stock adjusters + actions */}
        {sellerMode && (
          <>
            {variants && variants.length > 0 && !isDeleted ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {variants.map((v) => (
                  <StockAdjuster
                    key={v.id}
                    variantId={v.id}
                    sizeLabel={v.sizeLabel}
                    initialStock={v.stock}
                  />
                ))}
              </div>
            ) : (
              <div className="mt-1.5 text-[13px] text-gray-500">
                재고 {stock}
                {variantSummary && (
                  <span className="ml-1.5 text-gray-400">({variantSummary})</span>
                )}
              </div>
            )}
            <div className="mt-3 flex gap-2">
              {!isDeleted && <ToggleActiveButton productId={id} isActive={isActive ?? true} />}
              <Link
                href={`/seller/products/${id}/edit`}
                className="flex-1 h-9 flex items-center justify-center rounded-lg border border-gray-200 text-[13px] font-medium text-gray-700 active:bg-gray-50 transition-colors"
              >
                수정
              </Link>
            </div>
          </>
        )}
      </div>
    </article>
  );
}
