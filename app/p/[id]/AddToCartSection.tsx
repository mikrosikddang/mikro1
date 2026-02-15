"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getLoginRedirectUrl } from "@/lib/authHelpers";
import type { UserRole } from "@prisma/client";
import { isSeller } from "@/lib/roles";

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
}

export default function AddToCartSection({
  productId,
  variants,
  isSoldOut,
  userRole,
}: Props) {
  const router = useRouter();
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(
    null
  );
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const selectedVariant = variants.find((v) => v.id === selectedVariantId);

  const handleAddToCart = async () => {
    if (!selectedVariantId) {
      setMessage("사이즈를 선택해주세요");
      setTimeout(() => setMessage(null), 2000);
      return;
    }

    if (!selectedVariant) return;

    if (quantity > selectedVariant.stock) {
      setMessage(`재고가 부족합니다 (최대 ${selectedVariant.stock}개)`);
      setTimeout(() => setMessage(null), 2000);
      return;
    }

    // Check authentication before API call
    if (!userRole) {
      // Not logged in - show message and redirect
      setMessage("로그인이 필요합니다");
      setTimeout(() => {
        router.push(getLoginRedirectUrl());
      }, 1000);
      return;
    }

    // Phase 2: Sellers can now purchase (removed seller blocking logic)

    try {
      setLoading(true);

      const res = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variantId: selectedVariantId, quantity }),
      });

      const data = await res.json();

      if (res.status === 401) {
        // Not logged in - redirect to login with return URL
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
      setMessage("사이즈를 선택해주세요");
      setTimeout(() => setMessage(null), 2000);
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

    // Check authentication before API call
    if (!userRole) {
      // Not logged in - show message and redirect
      setMessage("로그인이 필요합니다");
      setTimeout(() => {
        router.push(getLoginRedirectUrl());
      }, 1000);
      return;
    }

    // Phase 2: Sellers can now purchase (removed seller blocking logic)

    try {
      setLoading(true);

      const res = await fetch("/api/orders/direct", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variantId: selectedVariantId, quantity }),
      });

      const data = await res.json();

      if (res.status === 401) {
        // Not logged in - redirect to login with return URL
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

      // Redirect to checkout with direct order
      router.push(`/checkout?direct=${data.orderId}`);
    } catch (err: any) {
      setMessage(err.message || "오류가 발생했습니다");
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleGoToCart = () => {
    router.push("/cart");
  };

  const maxQuantity = selectedVariant ? selectedVariant.stock : 99;

  return (
    <div className="space-y-4">
      {/* Variants selection */}
      {variants.length > 0 && (
        <div>
          <label className="block text-[14px] font-medium text-gray-700 mb-2">
            사이즈 선택
          </label>
          <div className="flex flex-wrap gap-2">
            {variants.map((v) => {
              const label = v.sizeLabel === "FREE" ? "FREE" : v.sizeLabel;
              const outOfStock = v.stock <= 0;
              const isSelected = v.id === selectedVariantId;

              return (
                <button
                  key={v.id}
                  type="button"
                  disabled={outOfStock}
                  onClick={() => {
                    setSelectedVariantId(v.id);
                    // Reset quantity if it exceeds new variant's stock
                    if (quantity > v.stock) {
                      setQuantity(Math.min(1, v.stock));
                    }
                  }}
                  className={`px-4 py-2 rounded-full text-[13px] font-medium transition-all ${
                    outOfStock
                      ? "bg-gray-100 text-gray-400 line-through cursor-not-allowed"
                      : isSelected
                        ? "bg-black text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300"
                  }`}
                >
                  {label} ({v.stock})
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Quantity selector */}
      {selectedVariantId && (
        <div>
          <label className="block text-[14px] font-medium text-gray-700 mb-2">
            수량
          </label>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              disabled={quantity <= 1}
              className="w-10 h-10 rounded-full bg-gray-100 text-gray-700 font-bold active:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              −
            </button>
            <span className="text-[18px] font-bold text-black min-w-[3ch] text-center">
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.min(maxQuantity, q + 1))}
              disabled={quantity >= maxQuantity}
              className="w-10 h-10 rounded-full bg-gray-100 text-gray-700 font-bold active:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              +
            </button>
          </div>
        </div>
      )}

      {/* Message */}
      {message && (
        <div className="p-3 rounded-lg bg-black/90 text-white text-center text-[14px] font-medium">
          {message}
        </div>
      )}

      {/* CTA buttons */}
      <div className="space-y-3">
        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleDirectPurchase}
            disabled={isSoldOut || !selectedVariantId || loading}
            className="flex-1 h-[52px] bg-black text-white rounded-xl text-[16px] font-bold active:bg-gray-800 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {loading ? "처리 중..." : isSoldOut ? "품절" : "바로구매"}
          </button>
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={isSoldOut || !selectedVariantId || loading}
            className="flex-1 h-[52px] bg-gray-700 text-white rounded-xl text-[16px] font-bold active:bg-gray-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {loading ? "처리 중..." : "장바구니"}
          </button>
        </div>
        <button
          type="button"
          onClick={handleGoToCart}
          className="w-full h-[44px] bg-gray-100 text-gray-700 rounded-xl text-[14px] font-medium active:bg-gray-200 transition-colors"
        >
          장바구니 보기
        </button>
      </div>
    </div>
  );
}
