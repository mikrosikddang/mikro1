/**
 * Brand commerce product grid tile
 * Premium layout: Image → Brand → Product Name → Price
 * Exact typography specs for high-end feel
 */

import Link from "next/link";
import WishlistButton from "./WishlistButton";

export interface ProductGridTileProps {
  id: string;
  title: string;
  priceKrw: number;
  imageUrl?: string;
  shopName?: string;
  sellerId?: string;
}

export default function ProductGridTile({
  id,
  title,
  priceKrw,
  imageUrl,
  shopName,
  sellerId,
}: ProductGridTileProps) {
  return (
    <div>
      {/* Image with wishlist button */}
      <div className="relative aspect-[4/5] bg-gray-100 rounded-xl overflow-hidden">
        {/* Subtle gradient for favorite button contrast */}
        <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/20 to-transparent z-[1] pointer-events-none" />

        <Link href={`/p/${id}`} className="block w-full h-full">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-300 text-sm">
              No Image
            </div>
          )}
        </Link>

        {/* Flat wishlist button overlaid on image */}
        <WishlistButton productId={id} variant="card" />
      </div>

      {/* Brand name */}
      {shopName && sellerId ? (
        <div className="mt-3">
          <Link
            href={`/s/${sellerId}`}
            className="text-[12px] text-gray-500 font-medium tracking-wide hover:text-gray-700 transition-colors"
          >
            {shopName}
          </Link>
        </div>
      ) : (
        <div className="mt-3" />
      )}

      {/* Product name */}
      <Link href={`/p/${id}`}>
        <h3 className="mt-1 text-[15px] font-medium text-black line-clamp-2 leading-snug">
          {title}
        </h3>
      </Link>

      {/* Price */}
      <Link href={`/p/${id}`}>
        <div className="mt-2 flex items-baseline gap-0.5">
          <span className="text-[13px] text-black">₩</span>
          <span className="text-[16px] font-semibold text-black tabular-nums">
            {priceKrw.toLocaleString()}
          </span>
        </div>
      </Link>
    </div>
  );
}
