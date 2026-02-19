"use client";

import { useState, useEffect, useCallback } from "react";
import { isWishlisted, toggleWishlist } from "@/lib/wishlist";

type Props = {
  productId: string;
  /** "card" = small overlay on ProductCard, "detail" = larger button on detail page */
  variant?: "card" | "detail";
};

export default function WishlistButton({ productId, variant = "card" }: Props) {
  const [active, setActive] = useState(false);

  const sync = useCallback(() => {
    setActive(isWishlisted(productId));
  }, [productId]);

  useEffect(() => {
    sync();
    window.addEventListener("wishlist-change", sync);
    return () => window.removeEventListener("wishlist-change", sync);
  }, [sync]);

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist(productId);
  }

  const isCard = variant === "card";

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={active ? "관심목록에서 제거" : "관심목록에 추가"}
      className={
        isCard
          ? "absolute top-2 right-2 z-10 w-9 h-9 flex items-center justify-center group active:scale-90 transition-transform"
          : "w-[52px] h-[52px] border border-gray-200 rounded-xl flex items-center justify-center active:bg-gray-50 transition-colors"
      }
    >
      <svg
        className={
          isCard
            ? `w-5 h-5 transition-colors ${
                active ? "text-red-500" : "text-white/70 group-hover:text-white"
              }`
            : `w-6 h-6 transition-colors ${active ? "text-red-500" : "text-gray-400"}`
        }
        fill={active ? "currentColor" : "none"}
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={active ? 0 : 1.5}
          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
        />
      </svg>
    </button>
  );
}
