/**
 * Seller shop grid tile with two view modes:
 * - list: 4:5 images with title and price (brand commerce style)
 * - feed: square images only (Instagram feed style)
 */

import Link from "next/link";

export interface ProductGridTileProps {
  id: string;
  title: string;
  priceKrw: number;
  imageUrl?: string;
  shopName?: string;
  sellerId?: string;
  viewMode?: "list" | "feed";
}

export default function ProductGridTile({
  id,
  title,
  priceKrw,
  imageUrl,
  shopName,
  sellerId,
  viewMode = "list",
}: ProductGridTileProps) {
  // Feed mode: Instagram-style, image only, square
  if (viewMode === "feed") {
    return (
      <Link href={`/p/${id}`} className="block">
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

  // List mode: Brand commerce style with details
  return (
    <Link href={`/p/${id}`} className="block">
      {/* Image - 4:5 aspect ratio */}
      <div className="relative aspect-[4/5] bg-gray-100 rounded-xl overflow-hidden">
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

      {/* Title */}
      <h3 className="mt-2 text-sm font-medium text-black line-clamp-2 leading-snug">
        {title}
      </h3>

      {/* Price */}
      <p className="mt-1 text-base font-semibold text-black">
        ₩{priceKrw.toLocaleString()}
      </p>
    </Link>
  );
}
