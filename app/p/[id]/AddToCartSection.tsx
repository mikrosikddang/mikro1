"use client";

import { useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { getLoginRedirectUrl } from "@/lib/authHelpers";
import { getColorByKey } from "@/lib/colors";
import type { UserRole } from "@prisma/client";

interface Variant {
  id: string;
  color: string;
  sizeLabel: string;
  stock: number;
}

const SIZE_ORDER = ["XS", "S", "M", "L", "XL", "XXL", "FREE"];

function sortBySizeOrder(a: string, b: string) {
  const ai = SIZE_ORDER.indexOf(a);
  const bi = SIZE_ORDER.indexOf(b);
  return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
}

interface Props {
  productId: string;
  variants: Variant[];
  isSoldOut: boolean;
  userRole: UserRole | null;
}

export default function AddToCartSection({
  productId,
  variants: rawVariants,
  isSoldOut,
  userRole,
}: Props) {
  const router = useRouter();
  const optionCardRef = useRef<HTMLDivElement>(null);

  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showFocusRing, setShowFocusRing] = useState(false);
  const [showCartPopup, setShowCartPopup] = useState(false);

  // Derive unique colors (preserving order by first appearance, sorted alphabetically)
  const uniqueColors = useMemo(() => {
    const seen = new Set<string>();
    const colors: string[] = [];
    for (const v of rawVariants) {
      const c = v.color || "FREE";
      if (!seen.has(c)) {
        seen.add(c);
        colors.push(c);
      }
    }
    return colors.sort((a, b) => a.localeCompare(b, "ko"));
  }, [rawVariants]);

  const isFreeColor = uniqueColors.length === 1 && uniqueColors[0] === "FREE";

  // Auto-select color if only 1
  const effectiveColor = useMemo(() => {
    if (uniqueColors.length === 1) return uniqueColors[0];
    return selectedColor;
  }, [uniqueColors, selectedColor]);

  // Sizes for the selected color, sorted by SIZE_ORDER
  const sizesForColor = useMemo(() => {
    if (!effectiveColor) return [];
    return rawVariants
      .filter((v) => (v.color || "FREE") === effectiveColor)
      .sort((a, b) => sortBySizeOrder(a.sizeLabel, b.sizeLabel));
  }, [rawVariants, effectiveColor]);

  // Auto-select size if only 1 for current color
  const effectiveSize = useMemo(() => {
    if (sizesForColor.length === 1) return sizesForColor[0].sizeLabel;
    return selectedSize;
  }, [sizesForColor, selectedSize]);

  // Resolve selected variant
  const selectedVariant = useMemo(() => {
    if (!effectiveColor || !effectiveSize) return null;
    return rawVariants.find(
      (v) => (v.color || "FREE") === effectiveColor && v.sizeLabel === effectiveSize
    ) ?? null;
  }, [rawVariants, effectiveColor, effectiveSize]);

  const selectedVariantId = selectedVariant?.id ?? null;

  // Check if entire color is sold out
  const isColorSoldOut = (color: string) => {
    return rawVariants
      .filter((v) => (v.color || "FREE") === color)
      .every((v) => v.stock <= 0);
  };

  // Handle color selection
  const handleColorSelect = (color: string) => {
    if (isColorSoldOut(color)) return;
    setSelectedColor(color);
    setSelectedSize(null);
    setQuantity(1);
  };

  // Handle size selection
  const handleSizeSelect = (sizeLabel: string, stock: number) => {
    if (stock <= 0) return;
    setSelectedSize(sizeLabel);
    setQuantity(1);
  };

  // Smart CTA focus guidance
  const handleCtaClickWithoutSelection = () => {
    optionCardRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
    setShowFocusRing(true);
    setTimeout(() => setShowFocusRing(false), 800);
    if (typeof window !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(50);
    }
  };

  const handleAddToCart = async () => {
    if (!selectedVariantId) {
      handleCtaClickWithoutSelection();
      return;
    }

    if (!selectedVariant) return;

    if (quantity > selectedVariant.stock) {
      setMessage(`재고가 부족합니다 (최대 ${selectedVariant.stock}개)`);
      setTimeout(() => setMessage(null), 2000);
      return;
    }

    if (!userRole) {
      setMessage("로그인이 필요합니다");
      setTimeout(() => {
        router.push(getLoginRedirectUrl());
      }, 1000);
      return;
    }

    try {
      setLoading(true);

      const res = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variantId: selectedVariantId, quantity }),
      });

      const data = await res.json();

      if (res.status === 401) {
        router.push(getLoginRedirectUrl());
        return;
      }

      if (!res.ok) {
        throw new Error(data.error || "장바구니 담기 실패");
      }

      setShowCartPopup(true);
      window.dispatchEvent(new Event("cart-change"));
    } catch (err: any) {
      setMessage(err.message || "오류가 발생했습니다");
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleDirectPurchase = async () => {
    if (!selectedVariantId) {
      handleCtaClickWithoutSelection();
      return;
    }

    if (!selectedVariant) return;

    if (quantity <= 0) {
      setMessage("수량을 선택해주세요");
      setTimeout(() => setMessage(null), 2000);
      return;
    }

    if (quantity > selectedVariant.stock) {
      setMessage(`재고가 부족합니다 (최대 ${selectedVariant.stock}개)`);
      setTimeout(() => setMessage(null), 2000);
      return;
    }

    if (!userRole) {
      setMessage("로그인이 필요합니다");
      setTimeout(() => {
        router.push(getLoginRedirectUrl());
      }, 1000);
      return;
    }

    try {
      setLoading(true);

      const res = await fetch("/api/orders/direct", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variantId: selectedVariantId, quantity }),
      });

      const data = await res.json();

      if (res.status === 401) {
        router.push(getLoginRedirectUrl());
        return;
      }

      if (!res.ok) {
        if (res.status === 409) {
          setMessage("재고가 부족합니다");
        } else {
          setMessage(data.error || "주문 생성 실패");
        }
        setTimeout(() => setMessage(null), 3000);
        return;
      }

      router.push(`/checkout?direct=${data.orderId}`);
    } catch (err: any) {
      setMessage(err.message || "오류가 발생했습니다");
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  const maxQuantity = selectedVariant ? selectedVariant.stock : 99;

  return (
    <div className="space-y-4">
      {/* Option selection area with focus guidance */}
      {rawVariants.length > 0 && (
        <div
          ref={optionCardRef}
          className={`space-y-4 transition-all duration-300 ${
            showFocusRing ? "ring-2 ring-black ring-offset-2 rounded-lg p-2 -m-2" : ""
          }`}
        >
          {/* [1] Color selection — square swatches */}
          {!isFreeColor && (
            <div>
              <label className="block text-[13px] font-medium text-gray-700 mb-2">
                컬러 <span className="text-red-500">*</span>
                {effectiveColor && (
                  <span className="ml-1.5 text-gray-500 font-normal">
                    — {getColorByKey(effectiveColor)?.labelKo ?? effectiveColor}
                  </span>
                )}
              </label>
              <div className="flex flex-wrap gap-2">
                {uniqueColors.map((color) => {
                  const colorInfo = getColorByKey(color);
                  const hex = colorInfo?.hex ?? "#CCCCCC";
                  const soldOut = isColorSoldOut(color);
                  const isSelected = effectiveColor === color;
                  const isWhitish = hex.toUpperCase() === "#FFFFFF" || hex.toUpperCase() === "#FFFFF0" || hex.toUpperCase() === "#FAF9F6" || hex.toUpperCase() === "#FFFDD0";

                  return (
                    <button
                      key={color}
                      type="button"
                      onClick={() => handleColorSelect(color)}
                      disabled={soldOut}
                      title={colorInfo?.labelKo ?? color}
                      className={`relative w-8 h-8 rounded-md transition-all ${
                        isSelected
                          ? "ring-2 ring-black ring-offset-2"
                          : isWhitish
                            ? "border border-gray-300"
                            : "border border-transparent"
                      } ${
                        soldOut ? "opacity-30 cursor-not-allowed" : "active:scale-95"
                      }`}
                      style={{ backgroundColor: hex }}
                    >
                      {/* Diagonal strikethrough for sold out */}
                      {soldOut && (
                        <svg
                          className="absolute inset-0 w-full h-full"
                          viewBox="0 0 32 32"
                          preserveAspectRatio="none"
                        >
                          <line
                            x1="0" y1="32" x2="32" y2="0"
                            stroke="#999"
                            strokeWidth="2"
                          />
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* [2] Size selection — button chips */}
          {effectiveColor && sizesForColor.length > 0 && (
            <div>
              <label className="block text-[13px] font-medium text-gray-700 mb-2">
                사이즈 <span className="text-red-500">*</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {sizesForColor.map((v) => {
                  const isSelected = effectiveSize === v.sizeLabel;
                  const soldOut = v.stock <= 0;

                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => handleSizeSelect(v.sizeLabel, v.stock)}
                      disabled={soldOut}
                      className={`px-4 py-2 rounded-lg border text-[14px] font-medium transition-all ${
                        isSelected
                          ? "bg-black text-white border-black"
                          : soldOut
                            ? "opacity-30 cursor-not-allowed line-through bg-white border-gray-200 text-gray-400"
                            : "bg-white border-gray-200 text-gray-700 active:bg-gray-50"
                      }`}
                    >
                      {v.sizeLabel}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Quantity selector */}
      {selectedVariantId && (
        <div>
          <label className="block text-[13px] font-medium text-gray-700 mb-1.5">
            수량
          </label>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              disabled={quantity <= 1}
              className="w-9 h-9 rounded-full bg-gray-100 text-gray-700 font-bold active:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              −
            </button>
            <span className="text-base font-bold text-black min-w-[3ch] text-center">
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.min(maxQuantity, q + 1))}
              disabled={quantity >= maxQuantity}
              className="w-9 h-9 rounded-full bg-gray-100 text-gray-700 font-bold active:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              +
            </button>
          </div>
        </div>
      )}

      {/* Message */}
      {message && (
        <div className="p-3 rounded-lg bg-black/90 text-white text-center text-sm font-medium">
          {message}
        </div>
      )}

      {/* CTA buttons - smart flow */}
      <div className="pt-2">
        {!selectedVariantId ? (
          <button
            type="button"
            onClick={handleCtaClickWithoutSelection}
            className="w-full h-[52px] bg-gray-100 text-gray-400 rounded-lg text-base font-medium cursor-not-allowed"
          >
            옵션을 선택하세요
          </button>
        ) : (
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleDirectPurchase}
              disabled={isSoldOut || loading}
              className="flex-1 h-[52px] bg-black text-white rounded-lg text-base font-bold active:bg-gray-800 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {loading ? "처리 중..." : isSoldOut ? "품절" : "바로구매"}
            </button>
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={isSoldOut || loading}
              className="flex-1 h-[52px] border-2 border-black text-black rounded-lg text-base font-bold active:bg-gray-50 transition-colors disabled:border-gray-300 disabled:text-gray-300 disabled:cursor-not-allowed"
            >
              {loading ? "처리 중..." : "장바구니"}
            </button>
          </div>
        )}
      </div>

      {/* Cart confirmation popup */}
      {showCartPopup && (
        <>
          <div
            className="fixed inset-0 z-[100] bg-black/40"
            onClick={() => setShowCartPopup(false)}
          />
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-[300px] w-full overflow-hidden">
              <div className="p-6 text-center">
                <svg className="w-10 h-10 text-green-500 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <h3 className="text-[17px] font-bold text-gray-900">
                  장바구니에 담았습니다
                </h3>
              </div>
              <div className="grid grid-cols-2 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowCartPopup(false)}
                  className="h-12 text-[15px] font-medium text-gray-600 active:bg-gray-50"
                >
                  쇼핑 계속하기
                </button>
                <button
                  type="button"
                  onClick={() => router.push("/cart")}
                  className="h-12 text-[15px] font-bold text-black active:bg-gray-50 border-l border-gray-200"
                >
                  장바구니 보기
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
