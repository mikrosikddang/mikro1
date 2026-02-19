/**
 * Brand commerce product grid tile
 * 4:5 aspect ratio, clean layout, price below image
 */

import Link from "next/link";

export interface ProductGridTileProps {
  id: string;
  title: string;
  priceKrw: number;
  imageUrl?: string;
}

export default function ProductGridTile({
  id,
  title,
  priceKrw,
  imageUrl,
}: ProductGridTileProps) {
  return (
    <Link href={`/p/${id}`} className="block">
      {/* Image only - no overlays */}
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
