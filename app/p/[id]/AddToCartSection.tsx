"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getLoginRedirectUrl } from "@/lib/authHelpers";
import type { UserRole } from "@prisma/client";

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

      // Redirect to checkout with direct order
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
    <div className="space-y-6">
      {/* Size selection dropdown */}
      {variants.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            사이즈 선택
          </label>
          <select
            value={selectedVariantId || ""}
            onChange={(e) => {
              const variantId = e.target.value;
              setSelectedVariantId(variantId || null);

              // Reset quantity if it exceeds new variant's stock
              const variant = variants.find((v) => v.id === variantId);
              if (variant && quantity > variant.stock) {
                setQuantity(Math.min(1, variant.stock));
              }
            }}
            className="w-full py-3 px-4 text-base rounded-lg border border-gray-300 focus:ring-2 focus:ring-black focus:border-black transition-colors"
          >
            <option value="">선택하세요</option>
            {variants.map((v) => {
              const label = v.sizeLabel === "FREE" ? "FREE" : v.sizeLabel;
              const outOfStock = v.stock <= 0;
              return (
                <option key={v.id} value={v.id} disabled={outOfStock}>
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
          <label className="block text-sm font-medium text-gray-700 mb-2">
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
            <span className="text-lg font-bold text-black min-w-[3ch] text-center">
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
        <div className="p-3 rounded-lg bg-black/90 text-white text-center text-sm font-medium">
          {message}
        </div>
      )}

      {/* Divider */}
      <div className="border-t border-gray-100" />

      {/* CTA buttons */}
      {!selectedVariantId ? (
        <button
          disabled
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
  );
}
