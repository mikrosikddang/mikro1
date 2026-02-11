import Link from "next/link";
import { formatKrw } from "@/lib/format";
import ToggleActiveButton from "@/components/ToggleActiveButton";

type ProductCardProps = {
  id: string;
  title: string;
  priceKrw: number;
  imageUrl: string | null;
  shopName: string;
  sellerId: string;
  /** Seller dashboard mode – show badge + actions */
  sellerMode?: boolean;
  isActive?: boolean;
};

export default function ProductCard({
  id,
  title,
  priceKrw,
  imageUrl,
  shopName,
  sellerId,
  sellerMode,
  isActive,
}: ProductCardProps) {
  return (
    <article className={`bg-white ${sellerMode && !isActive ? "opacity-60" : ""}`}>
      {/* Product image - big like 무신사 */}
      <Link href={`/p/${id}`} className="block">
        <div className="relative w-full aspect-[3/4] bg-gray-100 overflow-hidden rounded-lg">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-300 text-sm">
              이미지 없음
            </div>
          )}

          {/* Status badge – seller mode only */}
          {sellerMode && (
            <span
              className={`absolute top-2 left-2 px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                isActive
                  ? "bg-green-500 text-white"
                  : "bg-gray-500 text-white"
              }`}
            >
              {isActive ? "판매중" : "숨김"}
            </span>
          )}
        </div>
      </Link>

      {/* Product info - simple like 당근 */}
      <div className="pt-3 pb-5">
        <Link href={`/p/${id}`}>
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

        {/* Seller actions */}
        {sellerMode && (
          <div className="mt-3 flex gap-2">
            <ToggleActiveButton productId={id} isActive={isActive ?? true} />
            <Link
              href={`/seller/products/${id}/edit`}
              className="flex-1 h-9 flex items-center justify-center rounded-lg border border-gray-200 text-[13px] font-medium text-gray-700 active:bg-gray-50 transition-colors"
            >
              수정
            </Link>
          </div>
        )}
      </div>
    </article>
  );
}
