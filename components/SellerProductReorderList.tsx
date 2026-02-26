"use client";

import { useState, useRef, Suspense } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { formatKrw } from "@/lib/format";
import { getProductBadge } from "@/lib/productState";
import ProductCard from "@/components/ProductCard";
import SellerProductTabs from "@/components/SellerProductTabs";

interface ProductData {
  id: string;
  title: string;
  priceKrw: number;
  salePriceKrw: number | null;
  isActive: boolean;
  isDeleted: boolean;
  totalStock: number;
  variantSummary: string;
  images: { url: string }[];
  variants: { id: string; color: string; sizeLabel: string; stock: number }[];
}

interface Props {
  products: ProductData[];
  shopName: string;
  sellerId: string;
  tabCounts: { active: number; hidden: number; soldOut: number };
  currentTab: string;
}

const BADGE_MAP: Record<string, { label: string; cls: string }> = {
  DELETED: { label: "삭제됨", cls: "bg-red-500 text-white" },
  HIDDEN: { label: "숨김", cls: "bg-gray-500 text-white" },
  SOLD_OUT: { label: "품절", cls: "bg-orange-500 text-white" },
  ACTIVE: { label: "판매중", cls: "bg-green-500 text-white" },
};

export default function SellerProductReorderList({
  products: initialProducts,
  shopName,
  sellerId,
  tabCounts,
  currentTab,
}: Props) {
  const router = useRouter();
  const [reorderMode, setReorderMode] = useState(false);
  const [orderedProducts, setOrderedProducts] = useState(initialProducts);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const dragIndexRef = useRef<number | null>(null);

  // Filter products based on tab (non-reorder mode)
  const filteredProducts = orderedProducts.filter((p) => {
    if (currentTab === "hidden") return !p.isActive;
    if (currentTab === "sold-out") return p.isActive && p.totalStock === 0;
    return p.isActive && p.totalStock > 0;
  });

  const displayProducts = reorderMode ? orderedProducts : filteredProducts;

  const handleStartReorder = () => {
    setReorderMode(true);
    setError(null);
  };

  const handleComplete = async () => {
    setSaving(true);
    setError(null);
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
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "순서 변경에 실패했습니다");
    } finally {
      setSaving(false);
    }
  };

  const handleCancelReorder = () => {
    setReorderMode(false);
    setOrderedProducts(initialProducts);
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
          setOrderedProducts((prev) => {
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

  return (
    <>
      {/* Header */}
      <div className="mb-4">
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
            {shopName} · 전체 {initialProducts.length}개
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
              onClick={reorderMode ? handleComplete : handleStartReorder}
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

      {/* Tabs (hidden in reorder mode) */}
      {!reorderMode && (
        <Suspense fallback={null}>
          <SellerProductTabs counts={tabCounts} />
        </Suspense>
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
          {displayProducts.map((product, i) => {
            const isDragging = dragIndex === i;
            const badge = getProductBadge({
              isActive: product.isActive,
              isDeleted: product.isDeleted,
              totalStock: product.totalStock,
            });
            const { label: badgeLabel, cls: badgeClass } = BADGE_MAP[badge];
            const imageUrl = product.images[0]?.url || "/placeholder.png";

            return (
              <div
                key={product.id}
                className={`flex items-center gap-3 px-3 py-3 border-b border-gray-100 transition-all ${
                  isDragging
                    ? "opacity-90 shadow-lg scale-[1.02] z-50 bg-white rounded-xl"
                    : "bg-white"
                }`}
              >
                {/* Drag handle */}
                <div
                  className="w-10 flex items-center justify-center cursor-grab shrink-0"
                  style={{ touchAction: "none" }}
                  onPointerDown={(e) => handlePointerDown(e, i)}
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

                {/* Thumbnail */}
                <div className="relative w-[60px] h-[60px] rounded-lg overflow-hidden bg-gray-100 shrink-0">
                  <Image
                    src={imageUrl}
                    alt={product.title}
                    fill
                    sizes="60px"
                    className="object-cover"
                  />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-[14px] font-medium text-black truncate">
                    {product.title}
                  </h3>
                  <p className="text-[14px] font-bold text-black mt-0.5">
                    {formatKrw(product.priceKrw)}
                  </p>
                </div>

                {/* Badge */}
                <span className={`shrink-0 px-2 py-1 rounded text-[11px] font-bold ${badgeClass}`}>
                  {badgeLabel}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col">
          {displayProducts.map((product) => (
            <ProductCard
              key={product.id}
              id={product.id}
              title={product.title}
              priceKrw={product.priceKrw}
              salePriceKrw={product.salePriceKrw}
              images={product.images}
              shopName={shopName}
              sellerId={sellerId}
              sellerMode
              isActive={product.isActive}
              isDeleted={product.isDeleted}
              totalStock={product.totalStock}
              variantSummary={product.variantSummary}
              variants={product.variants}
            />
          ))}

          {displayProducts.length === 0 && (
            <div className="py-20 text-center">
              <p className="text-[40px] mb-3">📦</p>
              <p className="text-[15px] text-gray-500 mb-6">
                {initialProducts.length === 0
                  ? "아직 등록된 상품이 없어요"
                  : "필터 조건에 맞는 상품이 없어요"}
              </p>
              {initialProducts.length === 0 && (
                <Link
                  href="/seller/products/new"
                  className="inline-block px-6 py-3 bg-black text-white rounded-xl text-[14px] font-medium"
                >
                  첫 상품 올리기
                </Link>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
}
