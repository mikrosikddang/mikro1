"use client";

/**
 * Product grid with two view modes: list (with details) and feed (images only)
 * Uses intersection observer to load more products when user scrolls
 * Syncs with global HomeFeedViewMode from burger menu
 * Supports drag-and-drop reorder for shop owner
 */

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
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
  isOwner?: boolean;
}

type ViewMode = "list" | "feed";

export default function ProductGrid({
  sellerId,
  initialProducts,
  initialNextCursor,
  isOwner,
}: ProductGridProps) {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [nextCursor, setNextCursor] = useState<string | null>(initialNextCursor);
  const [loading, setLoading] = useState(false);
  const [reorderMode, setReorderMode] = useState(false);
  const [orderedProducts, setOrderedProducts] = useState<Product[]>(initialProducts);
  const [saving, setSaving] = useState(false);
  const [reorderError, setReorderError] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropTarget, setDropTarget] = useState<number | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const dragIndexRef = useRef<number | null>(null);

  // Map global HomeFeedViewMode to local ViewMode
  // "carrot" (default) → "list", "feed" → "feed"
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window === "undefined") return "list";
    const globalMode = getHomeFeedViewMode();
    return globalMode === "feed" ? "feed" : "list";
  });

  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Listen to global view mode changes from burger menu (disabled in reorder mode)
  useEffect(() => {
    if (reorderMode) return;

    const handleViewModeChange = (event: CustomEvent<{ mode: "feed" | "carrot" }>) => {
      setViewMode(event.detail.mode === "feed" ? "feed" : "list");
    };

    window.addEventListener("homeFeedViewModeChange" as any, handleViewModeChange);

    return () => {
      window.removeEventListener("homeFeedViewModeChange" as any, handleViewModeChange);
    };
  }, [reorderMode]);

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

  // Reorder mode handlers
  const handleStartReorder = () => {
    // Sync current loaded products into orderedProducts
    setOrderedProducts(products);
    setReorderMode(true);
    setReorderError(null);
  };

  const handleCancelReorder = () => {
    setReorderMode(false);
    setOrderedProducts(initialProducts);
    setReorderError(null);
  };

  const handleCompleteReorder = async () => {
    setSaving(true);
    setReorderError(null);
    try {
      const res = await fetch("/api/seller/products/reorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productIds: orderedProducts.map((p) => p.id) }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "순서 변경에 실패했습니다");
      }
      setReorderMode(false);
      setProducts(orderedProducts);
      router.refresh();
    } catch (err) {
      setReorderError(err instanceof Error ? err.message : "순서 변경에 실패했습니다");
    } finally {
      setSaving(false);
    }
  };

  const handlePointerDown = (e: React.PointerEvent, index: number) => {
    e.preventDefault();
    dragIndexRef.current = index;
    setDragIndex(index);
    setDropTarget(null);

    const handleMove = (ev: PointerEvent) => {
      if (dragIndexRef.current === null || !gridRef.current) return;
      const children = Array.from(gridRef.current.children);

      for (let i = 0; i < children.length; i++) {
        if (i === dragIndexRef.current) continue;
        const rect = children[i].getBoundingClientRect();
        const inBounds =
          ev.clientX >= rect.left &&
          ev.clientX <= rect.right &&
          ev.clientY >= rect.top &&
          ev.clientY <= rect.bottom;

        if (inBounds) {
          setDropTarget(i);
          return;
        }
      }
      setDropTarget(null);
    };

    const handleUp = () => {
      const from = dragIndexRef.current;
      const to = dropTarget;
      if (from !== null && to !== null && from !== to) {
        setOrderedProducts((prev) => {
          const next = [...prev];
          const [moved] = next.splice(from, 1);
          next.splice(to, 0, moved);
          return next;
        });
      }
      dragIndexRef.current = null;
      setDragIndex(null);
      setDropTarget(null);
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
  };

  const displayProducts = reorderMode ? orderedProducts : products;

  return (
    <div className="pb-20">
      {/* Header: Product count + reorder button */}
      <div className="py-4 mb-2 px-4 flex items-center justify-between">
        <p className="text-sm text-gray-600">
          상품 <span className="font-bold text-black">{products.length}</span>
        </p>
        {isOwner && (
          <div className="flex items-center gap-2">
            {reorderMode && (
              <button
                type="button"
                onClick={handleCancelReorder}
                disabled={saving}
                className="h-8 px-3 border border-gray-200 rounded-lg text-[13px] font-medium text-gray-600 disabled:opacity-50"
              >
                취소
              </button>
            )}
            <button
              type="button"
              onClick={reorderMode ? handleCompleteReorder : handleStartReorder}
              disabled={saving}
              className={
                reorderMode
                  ? "h-8 px-3 bg-black text-white rounded-lg text-[13px] font-semibold disabled:opacity-50"
                  : "h-8 px-3 border border-gray-200 rounded-lg text-[13px] font-medium text-gray-600"
              }
            >
              {reorderMode ? (saving ? "저장 중..." : "완료") : "순서 변경"}
            </button>
          </div>
        )}
      </div>

      {/* Reorder error */}
      {reorderError && (
        <p className="text-[13px] text-red-500 px-4 mb-3">{reorderError}</p>
      )}

      {/* Product grid */}
      {displayProducts.length > 0 ? (
        reorderMode ? (
          /* Reorder mode: current view with drag handles, links disabled */
          <div
            ref={gridRef}
            className={
              viewMode === "feed"
                ? "grid grid-cols-3 gap-[1px]"
                : "grid grid-cols-3 gap-3 px-4"
            }
          >
            {displayProducts.map((product, i) => {
              const isDragging = dragIndex === i;
              const isDropTarget = dropTarget === i;
              const imageUrl = product.imageUrl || "/placeholder.png";

              return (
                <div
                  key={product.id}
                  className={`relative transition-all ${
                    isDragging
                      ? "opacity-[0.85] shadow-xl scale-105 z-50 rounded-xl"
                      : ""
                  } ${
                    isDropTarget
                      ? viewMode === "feed"
                        ? "ring-2 ring-black ring-inset"
                        : "ring-2 ring-black ring-offset-1 rounded-xl"
                      : ""
                  }`}
                >
                  {/* Drag handle overlay */}
                  <div
                    className="absolute top-1.5 left-1.5 z-10 w-7 h-7 rounded-lg bg-black/50 backdrop-blur-sm flex items-center justify-center cursor-grab"
                    style={{ touchAction: "none" }}
                    onPointerDown={(e) => handlePointerDown(e, i)}
                  >
                    <svg className="w-4 h-4 text-white" viewBox="0 0 20 20" fill="currentColor">
                      <circle cx="7" cy="5" r="1.5" />
                      <circle cx="13" cy="5" r="1.5" />
                      <circle cx="7" cy="10" r="1.5" />
                      <circle cx="13" cy="10" r="1.5" />
                      <circle cx="7" cy="15" r="1.5" />
                      <circle cx="13" cy="15" r="1.5" />
                    </svg>
                  </div>

                  {viewMode === "feed" ? (
                    /* Feed mode tile */
                    <div className="relative aspect-square bg-gray-100 overflow-hidden">
                      <Image
                        src={imageUrl}
                        alt={product.title}
                        fill
                        sizes="(max-width: 420px) 33vw, 140px"
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    /* List mode tile */
                    <>
                      <div className="relative aspect-[4/5] bg-gray-100 rounded-xl overflow-hidden">
                        <Image
                          src={imageUrl}
                          alt={product.title}
                          fill
                          sizes="(max-width: 420px) 33vw, 140px"
                          className="object-cover"
                        />
                      </div>
                      <h3 className="mt-2 text-sm font-medium text-black line-clamp-1 leading-snug">
                        {product.title}
                      </h3>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          /* Normal mode */
          <div
            className={
              viewMode === "feed"
                ? "grid grid-cols-3 gap-[1px]" // Feed: tight grid, no padding
                : "grid grid-cols-3 gap-3 px-4" // List: breathing room + side padding
            }
          >
            {displayProducts.map((product) => (
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
        )
      ) : (
        <div className="py-20 text-center text-gray-400 text-sm">
          등록된 상품이 없습니다.
        </div>
      )}

      {/* Load more trigger (hidden in reorder mode) */}
      {!reorderMode && nextCursor && (
        <div ref={loadMoreRef} className="py-8 text-center">
          {loading && (
            <span className="text-sm text-gray-400">로딩 중...</span>
          )}
        </div>
      )}
    </div>
  );
}
