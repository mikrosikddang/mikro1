/**
 * Seller shop grid tile - Instagram profile style
 * Square images only, no text overlay
 * Tight grid for visual impact
 */

import Link from "next/link";

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
    <Link href={`/p/${id}`} className="block">
      {/* Square Instagram-style thumbnail - image only */}
      <div className="relative aspect-square bg-gray-100 overflow-hidden">
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
      </div>
    </Link>
  );
}
