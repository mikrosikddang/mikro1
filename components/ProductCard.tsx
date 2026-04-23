"use client";

import Link from "next/link";
import { useState, useEffect, useCallback, useRef } from "react";
import ImageCarousel from "@/components/ImageCarousel";
import {
  isWishlisted,
  toggleWishlist,
  addWishlistDB,
  removeWishlistDB,
  checkWishlistDB,
} from "@/lib/wishlist";
import FeedActionSheet from "@/components/FeedActionSheet";
import FollowButton from "@/components/FollowButton";
import ProfileEditSheet from "@/components/ProfileEditSheet";
import { useSession } from "@/components/SessionProvider";
import { isArchivePost } from "@/lib/productPostType";
import { buildCanonicalUrl } from "@/lib/siteUrl";

type ProductCardProps = {
  id: string;
  title: string;
  priceKrw: number;
  /** Sale price (discount) - shown when lower than priceKrw */
  salePriceKrw?: number | null;
  postType?: "SALE" | "ARCHIVE";
  /** Multiple MAIN images for swipe carousel */
  images: { url: string }[];
  shopName: string;
  sellerId: string;
  /** Initial wishlist state from batch check (skips individual API call on mount) */
  initialWishlisted?: boolean;
  /** Seller avatar image URL */
  avatarUrl?: string | null;
};

export default function ProductCard({
  id,
  title,
  priceKrw,
  salePriceKrw,
  postType,
  images,
  shopName,
  sellerId,
  initialWishlisted,
  avatarUrl,
}: ProductCardProps) {
  const hasDiscount = salePriceKrw != null && salePriceKrw < priceKrw;
  const displayPrice = hasDiscount ? salePriceKrw : priceKrw;
  const discountRate = hasDiscount ? Math.round((1 - salePriceKrw / priceKrw) * 100) : 0;
  const archive = isArchivePost(postType);

  const session = useSession();
  // Wishlist state (customer mode only)
  const [wishlisted, setWishlisted] = useState(initialWishlisted ?? false);
  const [wishlistToggling, setWishlistToggling] = useState(false);
  // Action sheet state (customer mode only)
  const [actionSheetOpen, setActionSheetOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  // Profile edit sheet state (customer mode only, self only)
  const [profileEditOpen, setProfileEditOpen] = useState(false);
  // Hidden state (feed hide)
  const [hidden, setHidden] = useState(false);
  // Avatar image error fallback
  const [avatarImgError, setAvatarImgError] = useState(false);

  const syncWishlist = useCallback(async () => {
    if (session) {
      const result = await checkWishlistDB([id]);
      setWishlisted(result[id] ?? false);
    } else {
      setWishlisted(isWishlisted(id));
    }
  }, [id, session]);

  useEffect(() => {
    if (initialWishlisted === undefined) {
      syncWishlist();
      window.addEventListener("wishlist-change", syncWishlist);
      return () => window.removeEventListener("wishlist-change", syncWishlist);
    }
  }, [syncWishlist, initialWishlisted]);

  useEffect(() => {
    if (initialWishlisted !== undefined) {
      setWishlisted(initialWishlisted);
    }
  }, [initialWishlisted]);

  const handleWishlistToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (wishlistToggling) return;

    if (session) {
      setWishlistToggling(true);
      const newActive = !wishlisted;
      setWishlisted(newActive);
      const ok = newActive
        ? await addWishlistDB(id)
        : await removeWishlistDB(id);
      if (!ok) setWishlisted(!newActive);
      setWishlistToggling(false);
    } else {
      toggleWishlist(id);
    }
  };

  const handleWishlistToggleSimple = async () => {
    if (wishlistToggling) return;

    if (session) {
      setWishlistToggling(true);
      const newActive = !wishlisted;
      setWishlisted(newActive);
      const ok = newActive
        ? await addWishlistDB(id)
        : await removeWishlistDB(id);
      if (!ok) setWishlisted(!newActive);
      setWishlistToggling(false);
    } else {
      toggleWishlist(id);
    }
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const url = buildCanonicalUrl(`/p/${id}`);
    const shareData = {
      title: title,
      text: `${shopName} - ${title}`,
      url: url,
    };

    try {
      if (navigator.share && navigator.canShare?.(shareData)) {
        await navigator.share(shareData);
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(url);
        alert("링크가 복사되었습니다");
      }
    } catch (err) {
      // User cancelled or error
      console.log("Share cancelled or failed:", err);
    }
  };

  // Hidden by user
  if (hidden) return null;

  // Customer mode: Instagram feed style
  return (
    <article className="bg-white border-b border-gray-100">
      {/* Header Row (outside image) */}
      <div className="flex items-center justify-between px-3 py-2">
        {/* Left: seller avatar + shop name */}
        <Link
          href={`/s/${sellerId}`}
          className="flex items-center gap-2 hover:opacity-70 transition-opacity"
        >
          {/* Avatar */}
          <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">
            {avatarUrl && !avatarImgError ? (
              <img
                src={avatarUrl}
                alt={shopName}
                className="w-7 h-7 object-cover"
                onError={() => setAvatarImgError(true)}
              />
            ) : (
              <span className="text-[13px] font-semibold text-gray-700">
                {shopName.charAt(0)}
              </span>
            )}
          </div>
          {/* Shop name */}
          <span className="text-[13px] font-semibold text-black">
            {shopName}
          </span>
        </Link>

        {/* Right: Follow button + ... menu button */}
        <div className="flex items-center gap-2">
          <FollowButton sellerId={sellerId} size="sm" />

          <div className="relative">
            <button
              ref={triggerRef}
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setActionSheetOpen(!actionSheetOpen);
              }}
              aria-label="옵션"
              className="w-8 h-8 flex items-center justify-center text-gray-700 hover:text-black active:scale-90 transition-all"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 16 16">
                <circle cx="8" cy="3" r="1.5" />
                <circle cx="8" cy="8" r="1.5" />
                <circle cx="8" cy="13" r="1.5" />
              </svg>
            </button>

            {/* Popover menu */}
            {actionSheetOpen && (
              <FeedActionSheet
                triggerRef={triggerRef}
                productId={id}
                sellerId={sellerId}
                shopName={shopName}
                onClose={() => setActionSheetOpen(false)}
                wishlisted={wishlisted}
                onWishlistToggle={handleWishlistToggleSimple}
                onProfileEdit={() => setProfileEditOpen(true)}
                onHide={() => setHidden(true)}
              />
            )}
          </div>
        </div>
      </div>

      {/* Image carousel */}
      <Link href={`/p/${id}`} className="block">
        <ImageCarousel images={images} aspect="4/5" />
      </Link>

      {/* Product info below image */}
      <div className="px-3 py-2.5">
        <div className="flex items-start justify-between gap-3">
          {/* Left: title + price */}
          <Link href={`/p/${id}`} className="flex-1 min-w-0">
            {archive ? (
              <p className="text-[14px] leading-snug line-clamp-3">
                <span className="font-semibold text-black">{shopName}</span>{" "}
                <span className="font-normal text-gray-800">{title}</span>
              </p>
            ) : (
              <>
                <h3 className="text-[15px] font-medium text-black leading-snug line-clamp-2">
                  {title}
                </h3>
                <div className="mt-1">
                  {hasDiscount ? (
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-[14px] font-bold text-red-500">{discountRate}%</span>
                      <span className="text-[16px] font-semibold text-black tabular-nums">
                        {displayPrice.toLocaleString()}원
                      </span>
                      <span className="text-[13px] text-gray-400 line-through tabular-nums ml-1">
                        {priceKrw.toLocaleString()}원
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-baseline gap-0.5">
                      <span className="text-[16px] font-semibold text-black tabular-nums">
                        {priceKrw.toLocaleString()}원
                      </span>
                    </div>
                  )}
                </div>
              </>
            )}
          </Link>

          {/* Right: wishlist + share buttons */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {/* Wishlist button */}
            <button
              type="button"
              onClick={handleWishlistToggle}
              aria-label={wishlisted ? "관심목록에서 제거" : "관심목록에 추가"}
              className="w-9 h-9 flex items-center justify-center active:scale-90 transition-transform"
            >
              <svg
                className={`w-6 h-6 ${wishlisted ? "text-red-500" : "text-gray-400"}`}
                fill={wishlisted ? "currentColor" : "none"}
                stroke="currentColor"
                strokeWidth={wishlisted ? 0 : 1.5}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                />
              </svg>
            </button>

            {/* Share button */}
            <button
              type="button"
              onClick={handleShare}
              aria-label="공유"
              className="w-9 h-9 flex items-center justify-center active:scale-90 transition-transform"
            >
              <svg
                className="w-6 h-6 text-gray-400"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Profile Edit Sheet */}
      {profileEditOpen && (
        <ProfileEditSheet
          open={profileEditOpen}
          onClose={() => setProfileEditOpen(false)}
        />
      )}
    </article>
  );
}
