"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { formatKrw } from "@/lib/format";
import { getProductBadge } from "@/lib/productState";

interface ProductData {
  id: string;
  title: string;
  priceKrw: number;
  salePriceKrw: number | null;
  postType: "SALE" | "ARCHIVE";
  isActive: boolean;
  isDeleted: boolean;
  totalStock: number;
  variantSummary: string;
  images: { url: string }[];
  variants: { id: string; color: string; sizeLabel: string; stock: number }[];
}

interface Props {
  shopName: string;
  sellerId: string;
}

type TabValue = "active" | "hidden" | "sold-out" | "archive";
type SortValue = "newest" | "price-asc" | "price-desc" | "stock-asc";

const TABS: { label: string; value: TabValue }[] = [
  { label: "판매중", value: "active" },
  { label: "아카이브", value: "archive" },
  { label: "숨김", value: "hidden" },
  { label: "품절", value: "sold-out" },
];

const SORT_OPTIONS: { label: string; value: SortValue }[] = [
  { label: "최신순", value: "newest" },
  { label: "가격 높은순", value: "price-desc" },
  { label: "가격 낮은순", value: "price-asc" },
  { label: "재고 적은순", value: "stock-asc" },
];

const BADGE_MAP: Record<string, { label: string; cls: string }> = {
  DELETED: { label: "삭제됨", cls: "bg-red-100 text-red-700" },
  HIDDEN: { label: "숨김", cls: "bg-gray-100 text-gray-700" },
  SOLD_OUT: { label: "품절", cls: "bg-orange-100 text-orange-700" },
  ACTIVE: { label: "판매중", cls: "bg-green-100 text-green-700" },
  ARCHIVE: { label: "아카이브", cls: "bg-blue-100 text-blue-700" },
};

export default function SellerProductReorderList({ shopName }: Props) {
  // Data state
  const [products, setProducts] = useState<ProductData[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [counts, setCounts] = useState({ active: 0, hidden: 0, soldOut: 0, archive: 0 });

  // Filter/search state
  const [tab, setTab] = useState<TabValue>("active");
  const [sort, setSort] = useState<SortValue>("newest");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);

  // Popover menu state
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Reorder state
  const [reorderMode, setReorderMode] = useState(false);
  const [reorderProducts, setReorderProducts] = useState<ProductData[]>([]);
  const [saving, setSaving] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const dragIndexRef = useRef<number | null>(null);

  // Infinite scroll sentinel
  const sentinelRef = useRef<HTMLDivElement>(null);

  const [error, setError] = useState<string | null>(null);
  const selectedProducts = products.filter((product) => selectedIds.has(product.id));
  const canHideSelected = selectedProducts.some(
    (product) => product.isActive && !product.isDeleted,
  );
  const canShowSelected = selectedProducts.some(
    (product) => !product.isActive && !product.isDeleted,
  );
  const canDeleteSelected = selectedProducts.some((product) => !product.isDeleted);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Close popover on outside click
  useEffect(() => {
    if (!openMenuId) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [openMenuId]);

  // Fetch products
  const fetchProducts = useCallback(async (cursor?: string) => {
    const isAppend = !!cursor;
    if (isAppend) setLoadingMore(true);
    else setLoading(true);

    try {
      const params = new URLSearchParams({ tab, sort, limit: "20" });
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (cursor) params.set("cursor", cursor);

      const res = await fetch(`/api/seller/products?${params}`);
      if (!res.ok) throw new Error("상품을 불러오는데 실패했습니다");

      const data = await res.json();
      if (isAppend) {
        setProducts((prev) => [...prev, ...data.products]);
      } else {
        setProducts(data.products);
      }
      setNextCursor(data.nextCursor ?? null);
      if (data.counts) {
        setCounts(data.counts);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "상품을 불러오는데 실패했습니다");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [tab, sort, debouncedSearch]);

  // Reload on filter change
  useEffect(() => {
    if (reorderMode) return;
    setSelectedIds(new Set());
    fetchProducts();
  }, [fetchProducts, reorderMode]);

  // Infinite scroll observer
  useEffect(() => {
    if (reorderMode || !sentinelRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && nextCursor && !loadingMore && !loading) {
          fetchProducts(nextCursor);
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [nextCursor, loadingMore, loading, reorderMode, fetchProducts]);

  // Tab change
  const handleTabChange = (value: TabValue) => {
    setTab(value);
    setSelectedIds(new Set());
  };

  // Selection
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === products.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(products.map((p) => p.id)));
    }
  };

  // Bulk action
  const handleBulkAction = async (action: "hide" | "show" | "delete") => {
    if (selectedIds.size === 0) return;
    const confirmMsg =
      action === "delete"
        ? `${selectedIds.size}개 상품을 삭제하시겠습니까?`
        : action === "hide"
          ? `${selectedIds.size}개 상품을 숨기시겠습니까?`
          : `${selectedIds.size}개 상품을 노출하시겠습니까?`;

    if (!confirm(confirmMsg)) return;

    setBulkLoading(true);
    try {
      const res = await fetch("/api/seller/products/bulk", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productIds: [...selectedIds], action }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "처리에 실패했습니다");
      }
      setSelectedIds(new Set());
      fetchProducts();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "처리에 실패했습니다");
    } finally {
      setBulkLoading(false);
    }
  };

  // Toggle active (single product, from popover)
  const handleToggleActive = async (productId: string, currentActive: boolean) => {
    setOpenMenuId(null);
    try {
      const res = await fetch(`/api/seller/products/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentActive }),
      });
      if (!res.ok) throw new Error("상태 변경에 실패했습니다");
      fetchProducts();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "상태 변경에 실패했습니다");
    }
  };

  // Reorder mode
  const handleStartReorder = async () => {
    try {
      const res = await fetch("/api/seller/products?limit=500");
      if (!res.ok) throw new Error("상품을 불러오는데 실패했습니다");
      const data = await res.json();
      setReorderProducts(data.products);
      setReorderMode(true);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "상품을 불러오는데 실패했습니다");
    }
  };

  const handleReorderComplete = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/seller/products/reorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productIds: reorderProducts.map((p) => p.id) }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "순서 변경에 실패했습니다");
      }
      setReorderMode(false);
      fetchProducts();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "순서 변경에 실패했습니다");
    } finally {
      setSaving(false);
    }
  };

  const handleCancelReorder = () => {
    setReorderMode(false);
    setReorderProducts([]);
    setError(null);
  };

  const handlePointerDown = (e: React.PointerEvent, index: number) => {
    e.preventDefault();
    dragIndexRef.current = index;
    setDragIndex(index);

    const handleMove = (ev: PointerEvent) => {
      if (dragIndexRef.current === null || !listRef.current) return;
      const currentIdx = dragIndexRef.current;
      const children = Array.from(listRef.current.children);

      for (let i = 0; i < children.length; i++) {
        if (i === currentIdx) continue;
        const rect = children[i].getBoundingClientRect();
        const midY = rect.top + rect.height / 2;

        if (
          (currentIdx < i && ev.clientY > midY) ||
          (currentIdx > i && ev.clientY < midY)
        ) {
          setReorderProducts((prev) => {
            const next = [...prev];
            const [moved] = next.splice(currentIdx, 1);
            next.splice(i, 0, moved);
            return next;
          });
          dragIndexRef.current = i;
          setDragIndex(i);
          break;
        }
      }
    };

    const handleUp = () => {
      dragIndexRef.current = null;
      setDragIndex(null);
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
  };

  const getCount = (value: TabValue): number => {
    if (value === "active") return counts.active;
    if (value === "archive") return counts.archive;
    if (value === "hidden") return counts.hidden;
    if (value === "sold-out") return counts.soldOut;
    return 0;
  };

  const totalCount = counts.active + counts.hidden + counts.soldOut + counts.archive;

  // Render a product row (shared between normal + reorder)
  const renderProductRow = (product: ProductData, options?: {
    checkbox?: boolean;
    dragHandle?: boolean;
    dragHandleIndex?: number;
    isDragging?: boolean;
  }) => {
    const badge = getProductBadge({
      postType: product.postType,
      isActive: product.isActive,
      isDeleted: product.isDeleted,
      totalStock: product.totalStock,
    });
    const { label: badgeLabel, cls: badgeClass } = BADGE_MAP[badge];
    const imageUrl = product.images[0]?.url || "/placeholder.png";
    const isArchive = product.postType === "ARCHIVE";
    const dimmed = product.isDeleted || !product.isActive || (!isArchive && product.totalStock <= 0);
    const hasDiscount = !isArchive && product.salePriceKrw != null && product.salePriceKrw < product.priceKrw;
    const displayPrice = hasDiscount ? product.salePriceKrw! : product.priceKrw;
    const stockText = isArchive
      ? "가격/옵션 없음"
      : product.totalStock > 0
        ? `재고 ${product.totalStock}`
        : "품절";

    return (
      <div
        key={product.id}
        className={`flex items-center gap-2.5 px-3 py-3 border-b border-gray-100 transition-all ${
          options?.isDragging
            ? "opacity-90 shadow-lg scale-[1.02] z-50 bg-white rounded-xl"
            : "bg-white"
        }`}
      >
        {/* Drag handle */}
        {options?.dragHandle && (
          <div
            className="w-8 flex items-center justify-center cursor-grab shrink-0"
            style={{ touchAction: "none" }}
            onPointerDown={(e) => handlePointerDown(e, options.dragHandleIndex!)}
          >
            <svg className="w-5 h-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
              <circle cx="7" cy="5" r="1.5" />
              <circle cx="13" cy="5" r="1.5" />
              <circle cx="7" cy="10" r="1.5" />
              <circle cx="13" cy="10" r="1.5" />
              <circle cx="7" cy="15" r="1.5" />
              <circle cx="13" cy="15" r="1.5" />
            </svg>
          </div>
        )}

        {/* Checkbox */}
        {options?.checkbox && (
          <button
            type="button"
            onClick={() => toggleSelect(product.id)}
            className="shrink-0"
          >
            <span className={`w-5 h-5 rounded border flex items-center justify-center ${
              selectedIds.has(product.id)
                ? "bg-black border-black text-white"
                : "border-gray-300"
            }`}>
              {selectedIds.has(product.id) && (
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </span>
          </button>
        )}

        {/* Thumbnail 52px with overlay */}
        <Link href={`/seller/products/${product.id}/edit`} className="relative shrink-0 w-[52px] h-[52px] rounded-lg overflow-hidden bg-gray-100">
          <Image
            src={imageUrl}
            alt={product.title}
            fill
            sizes="52px"
            className="object-cover"
          />
          {dimmed && (
            <div className="absolute inset-0 bg-white/50" />
          )}
        </Link>

        {/* Info */}
        <Link href={`/seller/products/${product.id}/edit`} className="flex-1 min-w-0">
          <h3 className="text-[14px] font-medium text-black truncate">{product.title}</h3>
          <div className="flex items-baseline gap-2 mt-0.5">
            {isArchive ? (
              <span className="text-[13px] font-medium text-gray-500">아카이브 게시물</span>
            ) : (
              <span className="text-[14px] font-bold text-black">{formatKrw(displayPrice)}</span>
            )}
            {hasDiscount && (
              <span className="text-[12px] text-gray-400 line-through">{formatKrw(product.priceKrw)}</span>
            )}
          </div>
          <p className={`text-[12px] mt-0.5 ${!isArchive && product.totalStock <= 0 ? "text-orange-600 font-medium" : "text-gray-500"}`}>
            {stockText}
          </p>
        </Link>

        {/* Badge */}
        <span className={`shrink-0 px-2 py-0.5 rounded text-[11px] font-medium ${badgeClass}`}>
          {badgeLabel}
        </span>

        {/* More menu (···) — only in normal mode */}
        {!options?.dragHandle && !product.isDeleted && (
          <div className="relative shrink-0" ref={openMenuId === product.id ? menuRef : undefined}>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setOpenMenuId(openMenuId === product.id ? null : product.id);
              }}
              className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-700 transition-colors"
              aria-label="더보기"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 16 16">
                <circle cx="8" cy="3" r="1.5" />
                <circle cx="8" cy="8" r="1.5" />
                <circle cx="8" cy="13" r="1.5" />
              </svg>
            </button>

            {openMenuId === product.id && (
              <div className="absolute right-0 top-full mt-1 w-32 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                <button
                  type="button"
                  onClick={() => handleToggleActive(product.id, product.isActive)}
                  className="w-full text-left px-4 py-2 text-[13px] text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  {product.isActive ? "숨기기" : "노출하기"}
                </button>
                <Link
                  href={`/seller/products/${product.id}/edit`}
                  onClick={() => setOpenMenuId(null)}
                  className="block px-4 py-2 text-[13px] text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  수정
                </Link>
                <Link
                  href={`/seller/products/new?cloneFrom=${product.id}`}
                  onClick={() => setOpenMenuId(null)}
                  className="block px-4 py-2 text-[13px] text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  복제
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Header */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-[20px] font-bold text-black">상품 관리</h1>
          {!reorderMode && (
            <Link
              href="/seller/products/new"
              className="h-10 px-5 bg-black text-white rounded-lg text-[14px] font-medium flex items-center active:bg-gray-800 transition-colors"
            >
              + 상품 올리기
            </Link>
          )}
        </div>
        <div className="flex items-center justify-between">
          <p className="text-[13px] text-gray-500 mt-0.5">
            {shopName} · 전체 {totalCount}개
          </p>
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
              onClick={reorderMode ? handleReorderComplete : handleStartReorder}
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
      </div>

      {/* Error */}
      {error && (
        <p className="text-[13px] text-red-500 mb-3">{error}</p>
      )}

      {!reorderMode && (
        <>
          {/* Search bar */}
          <div className="relative mb-4">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="상품명 검색"
              className="w-full h-10 px-4 pl-10 rounded-lg border border-gray-200 bg-gray-50 text-[14px] placeholder:text-gray-400 focus:outline-none focus:border-black focus:bg-white transition-colors"
            />
          </div>

          {/* Tabs + Sort */}
          <div className="flex items-center justify-between border-b border-gray-200 mb-4">
            <div className="flex gap-2">
              {TABS.map((t) => (
                <button
                  key={t.value}
                  onClick={() => handleTabChange(t.value)}
                  className={`pb-3 px-4 text-[14px] font-medium border-b-2 transition-colors ${
                    tab === t.value
                      ? "border-black text-black"
                      : "border-transparent text-gray-500"
                  }`}
                >
                  {t.label}
                  <span className="ml-1.5 text-[13px]">({getCount(t.value)})</span>
                </button>
              ))}
            </div>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortValue)}
              className="h-8 px-3 rounded-lg border border-gray-200 text-[13px] text-gray-700 bg-white focus:outline-none focus:border-black transition-colors mb-0.5"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Select all */}
          {products.length > 0 && (
            <div className="flex items-center gap-2 mb-3 px-3">
              <button
                type="button"
                onClick={toggleSelectAll}
                className="flex items-center gap-1.5 text-[13px] text-gray-600"
              >
                <span className={`w-5 h-5 rounded border flex items-center justify-center ${
                  selectedIds.size === products.length && products.length > 0
                    ? "bg-black border-black text-white"
                    : "border-gray-300"
                }`}>
                  {selectedIds.size === products.length && products.length > 0 && (
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </span>
                전체 선택
              </button>
              {selectedIds.size > 0 && (
                <span className="text-[13px] text-gray-400">{selectedIds.size}개 선택됨</span>
              )}
            </div>
          )}
        </>
      )}

      {/* Reorder mode banner */}
      {reorderMode && (
        <div className="bg-gray-50 px-4 py-3 text-[13px] text-gray-500 border-b border-gray-200 -mx-4 mb-4">
          드래그하여 상품 순서를 변경하세요
        </div>
      )}

      {/* Product list */}
      {reorderMode ? (
        <div ref={listRef} className="flex flex-col">
          {reorderProducts.map((product, i) =>
            renderProductRow(product, {
              dragHandle: true,
              dragHandleIndex: i,
              isDragging: dragIndex === i,
            })
          )}
        </div>
      ) : loading ? (
        <div className="py-20 text-center text-gray-400 text-[14px]">
          불러오는 중...
        </div>
      ) : products.length === 0 ? (
        <div className="py-20 text-center">
          <p className="text-[15px] text-gray-500">
            {debouncedSearch
              ? "검색 결과가 없습니다"
              : totalCount === 0
                ? "아직 등록된 상품이 없어요"
                : "필터 조건에 맞는 상품이 없어요"}
          </p>
          {debouncedSearch && (
            <p className="text-[13px] text-gray-400 mt-1">다른 키워드로 검색해보세요</p>
          )}
          {!debouncedSearch && totalCount === 0 && (
            <Link
              href="/seller/products/new"
              className="inline-block mt-6 px-6 py-3 bg-black text-white rounded-xl text-[14px] font-medium"
            >
              첫 상품 올리기
            </Link>
          )}
        </div>
      ) : (
        <div className="flex flex-col">
          {products.map((product) =>
            renderProductRow(product, { checkbox: true })
          )}

          {/* Infinite scroll sentinel */}
          <div ref={sentinelRef} className="h-1" />
          {loadingMore && (
            <div className="py-4 text-center text-gray-400 text-[13px]">
              불러오는 중...
            </div>
          )}
        </div>
      )}

      {/* Bulk action bar */}
      {selectedIds.size > 0 && !reorderMode && (
        <>
          <div className="fixed bottom-[calc(env(safe-area-inset-bottom)+52px)] left-0 right-0 z-[60] border-t border-gray-200 bg-white px-4 py-3 shadow-[0_-8px_24px_rgba(0,0,0,0.08)]">
            <div className="mx-auto flex w-full max-w-[420px] items-center justify-between gap-3">
              <span className="text-[14px] font-medium text-black">
                {selectedIds.size}개 선택됨
              </span>
              <div className="flex flex-wrap justify-end gap-2">
                {canHideSelected && (
                  <button
                    type="button"
                    onClick={() => handleBulkAction("hide")}
                    disabled={bulkLoading}
                    className="h-9 rounded-lg border border-gray-200 px-4 text-[13px] font-medium text-gray-700 active:bg-gray-50 disabled:opacity-50"
                  >
                    숨김
                  </button>
                )}
                {canShowSelected && (
                  <button
                    type="button"
                    onClick={() => handleBulkAction("show")}
                    disabled={bulkLoading}
                    className="h-9 rounded-lg border border-gray-200 px-4 text-[13px] font-medium text-gray-700 active:bg-gray-50 disabled:opacity-50"
                  >
                    노출
                  </button>
                )}
                {canDeleteSelected && (
                  <button
                    type="button"
                    onClick={() => handleBulkAction("delete")}
                    disabled={bulkLoading}
                    className="h-9 rounded-lg bg-red-500 px-4 text-[13px] font-medium text-white active:bg-red-600 disabled:opacity-50"
                  >
                    삭제
                  </button>
                )}
              </div>
            </div>
          </div>
          <div className="h-[116px]" aria-hidden="true" />
        </>
      )}
    </>
  );
}
