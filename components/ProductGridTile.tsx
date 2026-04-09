/**
 * Seller shop grid tile with two view modes:
 * - list: 4:5 images with title and price (brand commerce style)
 * - feed: square images only (Instagram feed style)
 */

import Link from "next/link";
import Image from "next/image";
import { isArchivePost } from "@/lib/productPostType";

export interface ProductGridTileProps {
  id: string;
  title: string;
  priceKrw: number;
  salePriceKrw?: number | null;
  postType?: "SALE" | "ARCHIVE";
  imageUrl?: string;
  viewMode?: "list" | "feed";
}

export default function ProductGridTile({
  id,
  title,
  priceKrw,
  salePriceKrw,
  postType,
  imageUrl,
  viewMode = "list",
}: ProductGridTileProps) {
  const hasDiscount = salePriceKrw != null && salePriceKrw < priceKrw;
  const displayPrice = hasDiscount ? salePriceKrw : priceKrw;
  const discountRate = hasDiscount ? Math.round((1 - salePriceKrw / priceKrw) * 100) : 0;
  const archive = isArchivePost(postType);
  // Feed mode: Instagram-style, image only, square
  if (viewMode === "feed") {
    return (
      <Link href={`/p/${id}`} className="block">
        <div className="relative aspect-square bg-gray-100 overflow-hidden">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={title}
              fill
              sizes="(max-width: 420px) 50vw, 210px"
              className="object-cover"
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
          <Image
            src={imageUrl}
            alt={title}
            fill
            sizes="(max-width: 420px) 50vw, 210px"
            className="object-cover"
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
      {!archive && (hasDiscount ? (
        <div className="mt-1">
          <div className="flex items-baseline gap-1">
            <span className="text-[14px] font-bold text-red-500">{discountRate}%</span>
            <span className="text-base font-semibold text-black">
              {displayPrice.toLocaleString()}원
            </span>
          </div>
          <p className="text-[13px] text-gray-400 line-through">
            {priceKrw.toLocaleString()}원
          </p>
        </div>
      ) : (
        <p className="mt-1 text-base font-semibold text-black">
          {priceKrw.toLocaleString()}원
        </p>
      ))}
    </Link>
  );
}
