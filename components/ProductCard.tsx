"use client";

import Link from "next/link";
import { useState, useEffect, useCallback, useRef } from "react";
import { formatKrw } from "@/lib/format";
import { getProductBadge } from "@/lib/productState";
import ToggleActiveButton from "@/components/ToggleActiveButton";
import StockAdjuster from "@/components/StockAdjuster";
import WishlistButton from "@/components/WishlistButton";
import { getColorByKey, isLightColor } from "@/lib/colors";
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

const SIZE_ORDER = ["XS", "S", "M", "L", "XL", "XXL", "FREE"];

type VariantItem = { id: string; color: string; sizeLabel: string; stock: number };

function groupVariantsByColor(variants: VariantItem[]): [string, VariantItem[]][] {
  const groups = new Map<string, VariantItem[]>();
  for (const v of variants) {
    const key = v.color || "FREE";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(v);
  }
  // Sort sizes within each group
  for (const [, items] of groups) {
    items.sort((a, b) => {
      const ai = SIZE_ORDER.indexOf(a.sizeLabel);
      const bi = SIZE_ORDER.indexOf(b.sizeLabel);
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    });
  }
  // Sort groups alphabetically by color
  return [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0], "ko"));
}

type ProductCardProps = {
  id: string;
  title: string;
  priceKrw: number;
  /** Sale price (discount) - shown when lower than priceKrw */
  salePriceKrw?: number | null;
  /** Multiple MAIN images for swipe carousel */
  images: { url: string }[];
  shopName: string;
  sellerId: string;
  /** Seller dashboard mode – show badge + actions */
  sellerMode?: boolean;
  isActive?: boolean;
  isDeleted?: boolean;
  /** Total stock across all variants */
  totalStock?: number;
  /** e.g. "S:10 M:8 L:6" */
  variantSummary?: string;
  /** Variant data for stock adjusters (seller mode only) */
  variants?: { id: string; color: string; sizeLabel: string; stock: number }[];
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
  images,
  shopName,
  sellerId,
  sellerMode,
  isActive,
  isDeleted,
  totalStock,
  variantSummary,
  variants,
  initialWishlisted,
  avatarUrl,
}: ProductCardProps) {
  const hasDiscount = salePriceKrw != null && salePriceKrw < priceKrw;
  const displayPrice = hasDiscount ? salePriceKrw : priceKrw;
  const discountRate = hasDiscount ? Math.round((1 - salePriceKrw / priceKrw) * 100) : 0;
  const stock = totalStock ?? 0;
  const isSoldOut = stock <= 0;

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
    if (sellerMode) return;
    if (session) {
      const result = await checkWishlistDB([id]);
      setWishlisted(result[id] ?? false);
    } else {
      setWishlisted(isWishlisted(id));
    }
  }, [id, sellerMode, session]);

  useEffect(() => {
    if (!sellerMode) {
      if (initialWishlisted === undefined) {
        syncWishlist();
        window.addEventListener("wishlist-change", syncWishlist);
        return () => window.removeEventListener("wishlist-change", syncWishlist);
      }
    }
  }, [syncWishlist, sellerMode, initialWishlisted]);

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

    const url = `${window.location.origin}/p/${id}`;
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

  // Determine status badge for seller mode
  let badgeLabel = "";
  let badgeClass = "";
  if (sellerMode) {
    const badge = getProductBadge({
      isActive: isActive ?? true,
      isDeleted: isDeleted ?? false,
      totalStock: stock,
    });
    const badgeMap = {
      DELETED:  { label: "삭제됨", cls: "bg-red-500 text-white" },
      HIDDEN:   { label: "숨김",   cls: "bg-gray-500 text-white" },
      SOLD_OUT: { label: "품절",   cls: "bg-orange-500 text-white" },
      ACTIVE:   { label: "판매중", cls: "bg-green-500 text-white" },
    } as const;
    badgeLabel = badgeMap[badge].label;
    badgeClass = badgeMap[badge].cls;
  }

  const dimmed = sellerMode && (isDeleted || !isActive || isSoldOut);

  // Seller mode: keep original layout
  if (sellerMode) {
    return (
      <article className={`bg-white ${dimmed ? "opacity-60" : ""}`}>
        {/* Product image carousel */}
        <div className="relative rounded-lg overflow-hidden">
          <Link href={`/seller/products/${id}/edit`} className="block">
            <ImageCarousel images={images} aspect="3/4" dots={false} />
          </Link>

          {/* Status badge */}
          {badgeLabel && (
            <span className={`absolute top-2 left-2 z-10 px-2.5 py-1 rounded-lg text-[11px] font-bold ${badgeClass}`}>
              {badgeLabel}
            </span>
          )}
        </div>

        {/* Product info */}
        <div className="px-4 py-3">
          {/* Product title + Price */}
          <Link href={`/seller/products/${id}/edit`}>
            <div className="mt-1 flex items-baseline justify-between gap-4">
              <h3 className="flex-1 min-w-0 text-[16px] font-semibold text-black leading-snug line-clamp-2">
                {title}
              </h3>
              <div className="shrink-0 text-right">
                {hasDiscount && (
                  <span className="block text-[13px] text-gray-400 line-through tabular-nums">
                    {formatKrw(priceKrw)}
                  </span>
                )}
                <span className="text-[16px] font-bold text-black">
                  {formatKrw(displayPrice)}
                </span>
              </div>
            </div>
          </Link>

          {/* Stock adjusters + actions */}
          {variants && variants.length > 0 && !isDeleted ? (
            <div className="mt-2 space-y-2">
              {groupVariantsByColor(variants).map(([color, colorVariants]) => (
                <div key={color}>
                  {color !== "FREE" && (
                    <div className="flex items-center gap-1 mb-1">
                      {(() => {
                        const ci = getColorByKey(color);
                        return ci ? (
                          <span
                            className={`w-3 h-3 rounded-full shrink-0 ${isLightColor(ci.hex) ? "border border-gray-300" : ""}`}
                            style={{ backgroundColor: ci.hex }}
                          />
                        ) : null;
                      })()}
                      <span className="text-[11px] font-medium text-gray-600">
                        {getColorByKey(color)?.labelKo ?? color}
                      </span>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-1.5">
                    {colorVariants.map((v) => (
                      <StockAdjuster
                        key={v.id}
                        variantId={v.id}
                        sizeLabel={v.sizeLabel}
                        initialStock={v.stock}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-1.5 text-[13px] text-gray-500">
              재고 {stock}
              {variantSummary && (
                <span className="ml-1.5 text-gray-400">({variantSummary})</span>
              )}
            </div>
          )}
          <div className="mt-3 flex gap-2">
            {!isDeleted && <ToggleActiveButton productId={id} isActive={isActive ?? true} />}
            <Link
              href={`/seller/products/${id}/edit`}
              className="flex-1 h-9 flex items-center justify-center rounded-lg border border-gray-200 text-[13px] font-medium text-gray-700 active:bg-gray-50 transition-colors"
            >
              수정
            </Link>
            <Link
              href={`/seller/products/new?cloneFrom=${id}`}
              className="flex-1 h-9 flex items-center justify-center rounded-lg border border-gray-200 text-[13px] font-medium text-gray-700 active:bg-gray-50 transition-colors"
            >
              복제
            </Link>
          </div>
        </div>
      </article>
    );
  }

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
            <h3 className="text-[15px] font-medium text-black leading-snug line-clamp-2">
              {title}
            </h3>
            <div className="mt-1">
              {hasDiscount ? (
                <div className="flex items-baseline gap-1.5">
                  <span className="text-[14px] font-bold text-red-500">{discountRate}%</span>
                  <span className="text-[13px] text-black align-baseline">₩</span>
                  <span className="text-[16px] font-semibold text-black tabular-nums">
                    {displayPrice.toLocaleString()}
                  </span>
                  <span className="text-[13px] text-gray-400 line-through tabular-nums ml-1">
                    ₩{priceKrw.toLocaleString()}
                  </span>
                </div>
              ) : (
                <div className="flex items-baseline gap-0.5">
                  <span className="text-[13px] text-black align-baseline">₩</span>
                  <span className="text-[16px] font-semibold text-black tabular-nums">
                    {priceKrw.toLocaleString()}
                  </span>
                </div>
              )}
            </div>
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
