"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { getHomeFeedViewMode, type HomeFeedViewMode } from "@/lib/uiPrefs";
import { useSession } from "@/components/SessionProvider";
import { checkWishlistDB } from "@/lib/wishlist";
import ProductCard from "@/components/ProductCard";
import HomeCarrotList from "@/components/HomeCarrotList";

type Product = {
  id: string;
  title: string;
  priceKrw: number;
  salePriceKrw?: number | null;
  postType?: "SALE" | "ARCHIVE";
  sellerId: string;
  createdAt: Date;
  images: { url: string }[];
  seller: {
    sellerProfile: {
      shopName: string;
      avatarUrl: string | null;
    } | null;
  };
};

type HomeClientViewProps = {
  products: Product[];
};

function buildFeedUrl(cursor: string) {
  const params = new URLSearchParams(window.location.search);
  params.set("cursor", cursor);
  return `/api/feed?${params.toString()}`;
}

export default function HomeClientView({ products }: HomeClientViewProps) {
  const session = useSession();
  const [viewMode, setViewMode] = useState<HomeFeedViewMode>("feed");
  const [mounted, setMounted] = useState(false);
  const [wishlistMap, setWishlistMap] = useState<Record<string, boolean>>({});

  const [allProducts, setAllProducts] = useState<Product[]>(products);
  const [nextCursor, setNextCursor] = useState<string | null>(
    products.length >= 20 ? products[products.length - 1].id : null,
  );
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setAllProducts(products);
    setNextCursor(products.length >= 20 ? products[products.length - 1].id : null);
  }, [products]);

  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await fetch(buildFeedUrl(nextCursor));
      if (!res.ok) return;
      const data = await res.json();
      setAllProducts((prev) => {
        const existingIds = new Set(prev.map((p) => p.id));
        const newItems = (data.items as Product[]).filter((p) => !existingIds.has(p.id));
        return [...prev, ...newItems];
      });
      setNextCursor(data.nextCursor);
    } catch {
      /* network error — 다음 스크롤 시 재시도 */
    } finally {
      setLoadingMore(false);
    }
  }, [nextCursor, loadingMore]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !nextCursor) return;

    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { rootMargin: "400px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [nextCursor, loadMore]);

  useEffect(() => {
    setViewMode(getHomeFeedViewMode());
    setMounted(true);

    const handleModeChange = (e: CustomEvent<{ mode: HomeFeedViewMode }>) => {
      setViewMode(e.detail.mode);
    };

    window.addEventListener("homeFeedViewModeChange", handleModeChange as EventListener);
    return () => {
      window.removeEventListener("homeFeedViewModeChange", handleModeChange as EventListener);
    };
  }, []);

  useEffect(() => {
    if (!session || allProducts.length === 0) return;
    const productIds = allProducts.map((p) => p.id);
    const loadWishlist = () => {
      checkWishlistDB(productIds).then(setWishlistMap);
    };
    loadWishlist();
    window.addEventListener("wishlist-change", loadWishlist);
    return () => window.removeEventListener("wishlist-change", loadWishlist);
  }, [session, allProducts]);

  if (!mounted) {
    return (
      <div className="flex flex-col pb-8">
        {products.slice(0, 3).map((product) => (
          <div key={product.id} className="h-96 bg-gray-100 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (viewMode === "carrot") {
    return (
      <>
        <HomeCarrotList products={allProducts} />
        {nextCursor && <div ref={sentinelRef} className="h-1" />}
        {loadingMore && (
          <div className="flex justify-center py-6">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-black" />
          </div>
        )}
      </>
    );
  }

  return (
    <div className="flex flex-col pb-8">
      {allProducts.map((product) => (
        <ProductCard
          key={product.id}
          id={product.id}
          title={product.title}
          priceKrw={product.priceKrw}
          salePriceKrw={product.salePriceKrw}
          postType={product.postType}
          images={product.images.map((i) => ({ url: i.url }))}
          shopName={product.seller.sellerProfile?.shopName ?? "알수없음"}
          sellerId={product.sellerId}
          avatarUrl={product.seller.sellerProfile?.avatarUrl}
          initialWishlisted={session ? (wishlistMap[product.id] ?? false) : undefined}
        />
      ))}
      {nextCursor && <div ref={sentinelRef} className="h-1" />}
      {loadingMore && (
        <div className="flex justify-center py-6">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-black" />
        </div>
      )}
    </div>
  );
}
