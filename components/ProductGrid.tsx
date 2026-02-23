"use client";

/**
 * Product grid with two view modes: list (with details) and feed (images only)
 * Uses intersection observer to load more products when user scrolls
 * Syncs with global HomeFeedViewMode from burger menu
 */

import { useEffect, useRef, useState } from "react";
import ProductGridTile from "./ProductGridTile";
import { getHomeFeedViewMode } from "@/lib/uiPrefs";

interface Product {
  id: string;
  title: string;
  priceKrw: number;
  imageUrl: string | null;
}

interface ProductGridProps {
  sellerId: string;
  initialProducts: Product[];
  initialNextCursor: string | null;
}

type ViewMode = "list" | "feed";

export default function ProductGrid({
  sellerId,
  initialProducts,
  initialNextCursor,
}: ProductGridProps) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [nextCursor, setNextCursor] = useState<string | null>(initialNextCursor);
  const [loading, setLoading] = useState(false);

  // Map global HomeFeedViewMode to local ViewMode
  // "carrot" (default) → "list", "feed" → "feed"
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window === "undefined") return "list";
    const globalMode = getHomeFeedViewMode();
    return globalMode === "feed" ? "feed" : "list";
  });

  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Listen to global view mode changes from burger menu
  useEffect(() => {
    const handleViewModeChange = (event: CustomEvent<{ mode: "feed" | "carrot" }>) => {
      setViewMode(event.detail.mode === "feed" ? "feed" : "list");
    };

    window.addEventListener("homeFeedViewModeChange" as any, handleViewModeChange);

    return () => {
      window.removeEventListener("homeFeedViewModeChange" as any, handleViewModeChange);
    };
  }, []);

  // Load more products
  const loadMore = async () => {
    if (!nextCursor || loading) return;

    setLoading(true);

    try {
      const res = await fetch(
        `/api/sellers/${sellerId}/products?cursor=${nextCursor}&limit=30`
      );

      if (!res.ok) {
        console.error("Failed to load more products");
        setLoading(false);
        return;
      }

      const data = await res.json();
      setProducts((prev) => [...prev, ...data.items]);
      setNextCursor(data.nextCursor);
    } catch (error) {
      console.error("Error loading more products:", error);
    } finally {
      setLoading(false);
    }
  };

  // Intersection observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && nextCursor && !loading) {
          loadMore();
        }
      },
      { threshold: 0.5 }
    );

    const currentRef = loadMoreRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [nextCursor, loading]);

  return (
    <div className="pb-20">
      {/* Header: Product count only (toggle is in burger menu) */}
      <div className="py-4 mb-2 px-4">
        <p className="text-sm text-gray-600">
          상품 <span className="font-bold text-black">{products.length}</span>
        </p>
      </div>

      {/* Product grid */}
      {products.length > 0 ? (
        <div
          className={
            viewMode === "feed"
              ? "grid grid-cols-3 gap-[1px]" // Feed: tight grid, no padding
              : "grid grid-cols-3 gap-3 px-4" // List: breathing room + side padding
          }
        >
          {products.map((product) => (
            <ProductGridTile
              key={product.id}
              id={product.id}
              title={product.title}
              priceKrw={product.priceKrw}
              imageUrl={product.imageUrl || undefined}
              viewMode={viewMode}
            />
          ))}
        </div>
      ) : (
        <div className="py-20 text-center text-gray-400 text-sm">
          등록된 상품이 없습니다.
        </div>
      )}

      {/* Load more trigger */}
      {nextCursor && (
        <div ref={loadMoreRef} className="py-8 text-center">
          {loading && (
            <span className="text-sm text-gray-400">로딩 중...</span>
          )}
        </div>
      )}
    </div>
  );
}
