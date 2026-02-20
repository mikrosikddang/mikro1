"use client";

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { isWishlisted, toggleWishlist } from "@/lib/wishlist";

type Product = {
  id: string;
  title: string;
  priceKrw: number;
  sellerId: string;
  images: { url: string }[];
  seller: {
    sellerProfile: {
      shopName: string;
    } | null;
  };
  createdAt: Date;
};

type HomeCarrotListProps = {
  products: Product[];
};

function CarrotListItem({ product }: { product: Product }) {
  const [wishlisted, setWishlisted] = useState(false);

  const sync = useCallback(() => {
    setWishlisted(isWishlisted(product.id));
  }, [product.id]);

  useEffect(() => {
    sync();
    window.addEventListener("wishlist-change", sync);
    return () => window.removeEventListener("wishlist-change", sync);
  }, [sync]);

  const handleWishlistClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist(product.id);
  };

  const handleOptionsClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // TODO: Options menu (not implemented yet)
  };

  const imageUrl = product.images[0]?.url || "/placeholder.png";
  const shopName = product.seller.sellerProfile?.shopName || "알수없음";

  return (
    <Link href={`/p/${product.id}`} className="block">
      <div className="flex gap-3 py-4 px-4 border-b border-gray-100 active:bg-gray-50 transition-colors">
        {/* Thumbnail */}
        <div className="flex-shrink-0 w-24 h-24 rounded-xl overflow-hidden bg-gray-100">
          <img
            src={imageUrl}
            alt={product.title}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 flex flex-col">
          {/* Top row: title + options button */}
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="flex-1 text-[16px] font-medium text-gray-900 leading-snug line-clamp-2">
              {product.title}
            </h3>
            <button
              type="button"
              onClick={handleOptionsClick}
              className="flex-shrink-0 w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600"
              aria-label="옵션"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
                <circle cx="8" cy="3" r="1.5" />
                <circle cx="8" cy="8" r="1.5" />
                <circle cx="8" cy="13" r="1.5" />
              </svg>
            </button>
          </div>

          {/* Meta info */}
          <p className="text-[13px] text-gray-500 mt-0.5">
            {shopName}
          </p>

          {/* Bottom row: price + wishlist */}
          <div className="flex items-end justify-between mt-auto pt-1">
            <p className="text-[20px] font-bold text-black tracking-tight tabular-nums">
              ₩{product.priceKrw.toLocaleString("ko-KR")}
            </p>
            <button
              type="button"
              onClick={handleWishlistClick}
              className="flex items-center gap-1 text-gray-400 hover:text-red-500 transition-colors"
              aria-label={wishlisted ? "관심목록에서 제거" : "관심목록에 추가"}
            >
              <svg
                className={`w-5 h-5 transition-colors ${wishlisted ? "text-red-500 fill-current" : ""}`}
                fill={wishlisted ? "currentColor" : "none"}
                stroke="currentColor"
                strokeWidth={wishlisted ? 0 : 2}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function HomeCarrotList({ products }: HomeCarrotListProps) {
  return (
    <div className="pb-4">
      {products.map((product) => (
        <CarrotListItem key={product.id} product={product} />
      ))}
    </div>
  );
}
