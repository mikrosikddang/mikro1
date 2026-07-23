/**
 * Seller shop grid tile — Instagram-style square image only.
 * Tapping a tile opens the seller's intermediate feed anchored on this post
 * (falls back to the product detail page when the seller has no storeSlug).
 */

import Link from "next/link";
import Image from "next/image";

export interface ProductGridTileProps {
  id: string;
  title: string;
  imageUrl?: string;
  /** Seller storeSlug — when present, tile links to the feed; otherwise to /p/[id]. */
  storeSlug?: string | null;
  detailEnabled?: boolean;
}

export default function ProductGridTile({
  id,
  title,
  imageUrl,
  storeSlug,
  detailEnabled = true,
}: ProductGridTileProps) {
  const content = (
    <div className="relative aspect-square bg-gray-100 overflow-hidden">
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt={title}
          fill
          sizes="(max-width: 420px) 33vw, 140px"
          className="object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-gray-300 text-sm">
          No Image
        </div>
      )}
    </div>
  );

  if (!detailEnabled) {
    return <div className="block">{content}</div>;
  }

  const href = storeSlug ? `/${storeSlug}/feed?post=${id}` : `/p/${id}`;
  return (
    <Link href={href} className="block">
      {content}
    </Link>
  );
}
