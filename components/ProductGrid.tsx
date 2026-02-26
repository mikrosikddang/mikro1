"use client";

/**
 * Product grid with two view modes: list (with details) and feed (images only)
 * Uses intersection observer to load more products when user scrolls
 * Syncs with global HomeFeedViewMode from burger menu
 * Supports drag-and-drop reorder for shop owner
 */

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
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
    const grid = gridRef.current;
    if (!grid) return;
    const el = grid.children[index] as HTMLElement | undefined;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const startX = e.clientX;
    const startY = e.clientY;

    // 1. Create clone and append to body (follows pointer)
    const clone = el.cloneNode(true) as HTMLElement;
    clone.style.position = "fixed";
    clone.style.left = `${rect.left}px`;
    clone.style.top = `${rect.top}px`;
    clone.style.width = `${rect.width}px`;
    clone.style.height = `${rect.height}px`;
    clone.style.zIndex = "50";
    clone.style.pointerEvents = "none";
    clone.style.opacity = "0.85";
    clone.style.boxShadow = "0 20px 25px -5px rgba(0,0,0,0.1)";
    clone.style.borderRadius = "12px";
    clone.style.overflow = "hidden";
    document.body.appendChild(clone);

    // 2. Dim original element as placeholder (no React re-render)
    el.style.opacity = "0.3";

    // 3. Cache all tile rects once at drag start
    const cachedRects = Array.from(grid.children).map(
      (child) => child.getBoundingClientRect()
    );

    dragIndexRef.current = index;

    const dropTargetLocal = { current: null as number | null };
    let prevDropEl: HTMLElement | null = null;
    let rafId: number | null = null;

    const handleMove = (ev: PointerEvent) => {
      if (dragIndexRef.current === null) return;
      if (rafId) return; // Skip if previous frame still pending

      rafId = requestAnimationFrame(() => {
        rafId = null;

        // Move clone with pointer
        clone.style.left = `${rect.left + (ev.clientX - startX)}px`;
        clone.style.top = `${rect.top + (ev.clientY - startY)}px`;

        // Clear previous drop target highlight
        if (prevDropEl) {
          prevDropEl.classList.remove("ring-2", "ring-black", "ring-inset", "ring-offset-1");
          prevDropEl = null;
        }

        // Find drop target using cached rects
        let found = false;
        for (let i = 0; i < cachedRects.length; i++) {
          if (i === dragIndexRef.current) continue;
          const r = cachedRects[i];
          if (
            ev.clientX >= r.left &&
            ev.clientX <= r.right &&
            ev.clientY >= r.top &&
            ev.clientY <= r.bottom
          ) {
            dropTargetLocal.current = i;
            const targetEl = grid.children[i] as HTMLElement;
            targetEl.classList.add("ring-2", "ring-black");
            prevDropEl = targetEl;
            found = true;
            break;
          }
        }
        if (!found) {
          dropTargetLocal.current = null;
        }
      });
    };

    const handleUp = () => {
      // Cancel pending rAF
      if (rafId) cancelAnimationFrame(rafId);

      // Remove clone
      clone.remove();
      // Restore original
      el.style.opacity = "";
      // Clear drop target highlight
      if (prevDropEl) {
        prevDropEl.classList.remove("ring-2", "ring-black", "ring-inset", "ring-offset-1");
      }

      const from = dragIndexRef.current;
      const to = dropTargetLocal.current;
      if (from !== null && to !== null && from !== to) {
        setOrderedProducts((prev) => {
          const next = [...prev];
          const [moved] = next.splice(from, 1);
          next.splice(to, 0, moved);
          return next;
        });
      }
      dragIndexRef.current = null;
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
  };

  const displayProducts = reorderMode ? orderedProducts : products;

  return (
    <div className="pb-20">
      {/* Header: reorder button (owner only) */}
      {isOwner && (
        <div className="py-3 px-4 flex items-center justify-end">
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
        </div>
      )}

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
            className={`select-none ${
              viewMode === "feed"
                ? "grid grid-cols-3 gap-[1px]"
                : "grid grid-cols-3 gap-3 px-4"
            }`}
          >
            {displayProducts.map((product, i) => {
              const imageUrl = product.imageUrl || "/placeholder.png";

              return (
                <div
                  key={product.id}
                  className="relative transition-all"
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
                      <img
                        src={imageUrl}
                        alt={product.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    /* List mode tile */
                    <>
                      <div className="relative aspect-[4/5] bg-gray-100 rounded-xl overflow-hidden">
                        <img
                          src={imageUrl}
                          alt={product.title}
                          className="w-full h-full object-cover"
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
