"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useSession } from "@/components/SessionProvider";
import { checkWishlistDB } from "@/lib/wishlist";
import ProductCard from "@/components/ProductCard";
import type { SellerFeedItem } from "@/lib/sellerFeed";

type Props = {
  sellerId: string;
  shopName: string;
  avatarUrl?: string | null;
  anchorId?: string | null;
  initialItems: SellerFeedItem[];
  initialPrevCursor: string | null;
  initialNextCursor: string | null;
};

export default function SellerFeedList({
  sellerId,
  shopName,
  avatarUrl,
  anchorId,
  initialItems,
  initialPrevCursor,
  initialNextCursor,
}: Props) {
  const session = useSession();
  const [items, setItems] = useState<SellerFeedItem[]>(initialItems);
  const [prevCursor, setPrevCursor] = useState<string | null>(initialPrevCursor);
  const [nextCursor, setNextCursor] = useState<string | null>(initialNextCursor);
  const [wishlistMap, setWishlistMap] = useState<Record<string, boolean>>({});

  const topSentinelRef = useRef<HTMLDivElement>(null);
  const bottomSentinelRef = useRef<HTMLDivElement>(null);
  const anchoredRef = useRef(false);

  // Loading flags to prevent duplicate/overlapping fetches.
  const loadingUpRef = useRef(false);
  const loadingDownRef = useRef(false);
  // Latest cursors for use inside observer callbacks.
  const prevCursorRef = useRef(prevCursor);
  const nextCursorRef = useRef(nextCursor);
  prevCursorRef.current = prevCursor;
  nextCursorRef.current = nextCursor;

  // Instant-scroll to the tapped post on mount (before paint).
  useLayoutEffect(() => {
    if (anchoredRef.current) return;
    anchoredRef.current = true;
    if (!anchorId) return;
    const el = document.getElementById(`post-${anchorId}`);
    if (el) {
      el.scrollIntoView({ behavior: "instant" as ScrollBehavior, block: "start" });
    }
  }, [anchorId]);

  const loadAfter = useCallback(async () => {
    const cursor = nextCursorRef.current;
    if (!cursor || loadingDownRef.current) return;
    loadingDownRef.current = true;
    try {
      const res = await fetch(
        `/api/sellers/${sellerId}/feed?cursor=${encodeURIComponent(cursor)}&direction=after`,
      );
      if (!res.ok) return;
      const data = await res.json();
      setItems((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        const fresh = (data.items as SellerFeedItem[]).filter((p) => !seen.has(p.id));
        return [...prev, ...fresh];
      });
      setNextCursor(data.nextCursor);
    } catch {
      /* network error — retry on next scroll */
    } finally {
      loadingDownRef.current = false;
    }
  }, [sellerId]);

  const loadBefore = useCallback(async () => {
    const cursor = prevCursorRef.current;
    if (!cursor || loadingUpRef.current) return;
    loadingUpRef.current = true;
    // Record scroll anchor BEFORE prepending so we can keep the viewport steady.
    const prevScrollHeight = document.documentElement.scrollHeight;
    const prevScrollTop = window.scrollY;
    try {
      const res = await fetch(
        `/api/sellers/${sellerId}/feed?cursor=${encodeURIComponent(cursor)}&direction=before`,
      );
      if (!res.ok) return;
      const data = await res.json();
      const incoming = data.items as SellerFeedItem[];
      if (incoming.length > 0) {
        setItems((prev) => {
          const seen = new Set(prev.map((p) => p.id));
          const fresh = incoming.filter((p) => !seen.has(p.id));
          return [...fresh, ...prev];
        });
        setPrevCursor(data.prevCursor);
        // After the DOM grows, offset scroll by the height delta so content doesn't jump.
        requestAnimationFrame(() => {
          const newScrollHeight = document.documentElement.scrollHeight;
          window.scrollTo(0, prevScrollTop + (newScrollHeight - prevScrollHeight));
        });
      } else {
        setPrevCursor(data.prevCursor);
      }
    } catch {
      /* network error — retry on next scroll */
    } finally {
      loadingUpRef.current = false;
    }
  }, [sellerId]);

  // Downward infinite scroll.
  useEffect(() => {
    const el = bottomSentinelRef.current;
    if (!el || !nextCursor) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadAfter();
      },
      { rootMargin: "600px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [nextCursor, loadAfter]);

  // Upward infinite scroll — only active once anchored and a prevCursor exists.
  useEffect(() => {
    const el = topSentinelRef.current;
    if (!el || !prevCursor) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadBefore();
      },
      { rootMargin: "600px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [prevCursor, loadBefore]);

  // Wishlist batch state (logged-in only).
  useEffect(() => {
    if (!session || items.length === 0) return;
    const ids = items.map((p) => p.id);
    const load = () => {
      checkWishlistDB(ids).then(setWishlistMap);
    };
    load();
    window.addEventListener("wishlist-change", load);
    return () => window.removeEventListener("wishlist-change", load);
  }, [session, items]);

  if (items.length === 0) {
    return (
      <div className="py-20 text-center text-[14px] text-gray-400">
        등록된 게시물이 없습니다.
      </div>
    );
  }

  return (
    <div className="flex flex-col pb-8">
      {/* Top sentinel for upward paging */}
      {prevCursor && <div ref={topSentinelRef} className="h-1" />}

      {items.map((product) => (
        <div key={product.id} id={`post-${product.id}`}>
          <ProductCard
            id={product.id}
            title={product.title}
            priceKrw={product.priceKrw}
            salePriceKrw={product.salePriceKrw}
            postType={product.postType}
            captionBody={product.captionBody}
            images={product.images}
            shopName={shopName}
            sellerId={sellerId}
            avatarUrl={avatarUrl}
            initialWishlisted={session ? (wishlistMap[product.id] ?? false) : undefined}
          />
        </div>
      ))}

      {/* Bottom sentinel for downward paging */}
      {nextCursor && <div ref={bottomSentinelRef} className="h-1" />}
    </div>
  );
}
