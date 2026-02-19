"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { getLoginRedirectUrl } from "@/lib/authHelpers";
import type { UserRole } from "@prisma/client";
import PriceText from "@/components/typography/PriceText";

interface Variant {
  id: string;
  color: string;
  sizeLabel: string;
  stock: number;
}

interface Props {
  productId: string;
  variants: Variant[];
  isSoldOut: boolean;
  userRole: UserRole | null;
  priceKrw: number;
}

export default function AddToCartSection({
  productId,
  variants,
  isSoldOut,
  userRole,
  priceKrw,
}: Props) {
  const router = useRouter();
  const selectRef = useRef<HTMLSelectElement>(null);
  const optionCardRef = useRef<HTMLDivElement>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showFocusRing, setShowFocusRing] = useState(false);

  const selectedVariant = variants.find((v) => v.id === selectedVariantId);

  // Smart CTA focus guidance
  const handleCtaClickWithoutSelection = () => {
    // Focus the select
    selectRef.current?.focus();

    // Scroll into view if needed
    optionCardRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });

    // Add ring highlight with pulse animation
    setShowFocusRing(true);
    setTimeout(() => setShowFocusRing(false), 800);

    // Optional: vibration on mobile (if supported)
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

      setMessage("장바구니에 담았습니다");
      setTimeout(() => setMessage(null), 2000);
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
    <div className="border border-gray-200 rounded-2xl p-4 space-y-4">
      {/* Price at top */}
      <div className="pb-3 border-b border-gray-100">
        <PriceText amount={priceKrw} />
      </div>

      {/* Size selection with focus guidance */}
      {variants.length > 0 && (
        <div
          ref={optionCardRef}
          className={`transition-all duration-300 ${
            showFocusRing ? "ring-2 ring-black ring-offset-2 rounded-lg" : ""
          }`}
        >
          <label className="block text-[13px] font-medium text-gray-700 mb-1.5">
            사이즈 <span className="text-red-500">*</span>
          </label>
          <select
            ref={selectRef}
            value={selectedVariantId || ""}
            onChange={(e) => {
              const variantId = e.target.value;
              setSelectedVariantId(variantId || null);

              const variant = variants.find((v) => v.id === variantId);
              if (variant && quantity > variant.stock) {
                setQuantity(Math.min(1, variant.stock));
              }
            }}
            className="w-full h-10 px-3 py-2 text-[15px] rounded-lg border border-gray-300 focus:ring-2 focus:ring-black focus:border-black transition-colors"
          >
            <option value="">선택하세요</option>
            {variants.map((v) => {
              const label = v.sizeLabel === "FREE" ? "FREE" : v.sizeLabel;
              const outOfStock = v.stock <= 0;
              return (
                <option
                  key={v.id}
                  value={v.id}
                  disabled={outOfStock}
                  className={outOfStock ? "text-gray-400" : ""}
                >
                  {label} {outOfStock ? "(품절)" : ""}
                </option>
              );
            })}
          </select>
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
            className="w-full h-12 bg-gray-100 text-gray-400 rounded-lg text-[15px] font-medium transition-all active:scale-[0.98]"
          >
            옵션을 선택하세요
          </button>
        ) : (
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleDirectPurchase}
              disabled={isSoldOut || loading}
              className="flex-1 h-12 bg-black text-white rounded-lg text-[15px] font-bold active:bg-gray-800 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {loading ? "처리 중..." : isSoldOut ? "품절" : "바로구매"}
            </button>
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={isSoldOut || loading}
              className="flex-1 h-12 border-2 border-black text-black rounded-lg text-[15px] font-bold active:bg-gray-50 transition-colors disabled:border-gray-300 disabled:text-gray-300 disabled:cursor-not-allowed"
            >
              {loading ? "처리 중..." : "장바구니"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
