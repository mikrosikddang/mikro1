"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import Container from "@/components/Container";
import { formatKrw } from "@/lib/format";

interface CartItemData {
  id: string;
  variantId: string;
  quantity: number;
  variant: {
    id: string;
    color: string;
    sizeLabel: string;
    stock: number;
    product: {
      id: string;
      title: string;
      priceKrw: number;
      sellerId: string;
      isActive: boolean;
      isDeleted: boolean;
      images: { url: string }[];
      seller: {
        sellerProfile: { shopName: string } | null;
      };
    };
  };
}

export default function CartPage() {
  const router = useRouter();
  const [items, setItems] = useState<CartItemData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCart();
  }, []);

  const loadCart = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch("/api/cart");

      if (res.status === 401) {
        router.push("/login");
        return;
      }

      if (!res.ok) {
        throw new Error("장바구니를 불러오는데 실패했습니다");
      }

      const data = await res.json();
      setItems(data);
    } catch (err: any) {
      console.error("Failed to load cart:", err);
      setError(err.message || "장바구니를 불러오는데 실패했습니다");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateQuantity = async (
    cartItemId: string,
    newQuantity: number,
    maxStock: number
  ) => {
    if (newQuantity <= 0) {
      handleRemove(cartItemId);
      return;
    }

    if (newQuantity > maxStock) {
      alert(`최대 ${maxStock}개까지 구매 가능합니다`);
      return;
    }

    // Optimistic update
    const prevItems = [...items];
    setItems((prev) =>
      prev.map((i) =>
        i.id === cartItemId ? { ...i, quantity: newQuantity } : i
      )
    );

    try {
      const res = await fetch(`/api/cart/${cartItemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: newQuantity }),
      });

      if (res.status === 401) {
        router.push("/login");
        return;
      }

      if (res.status === 409) {
        const data = await res.json();
        // Rollback on stock conflict
        setItems(prevItems);
        alert(data.error || "재고가 부족합니다");
        // Reload to get fresh stock data
        await loadCart();
        return;
      }

      if (!res.ok) {
        throw new Error("수량 변경에 실패했습니다");
      }

      const data = await res.json();
      // Update with server response
      setItems((prev) =>
        prev.map((i) => (i.id === cartItemId ? data.item : i))
      );
    } catch (err: any) {
      // Rollback on error
      setItems(prevItems);
      setError(err.message || "수량 변경에 실패했습니다");
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleRemove = async (cartItemId: string) => {
    if (!confirm("이 상품을 장바구니에서 삭제하시겠습니까?")) return;

    // Optimistic update
    const prevItems = [...items];
    setItems((prev) => prev.filter((i) => i.id !== cartItemId));

    try {
      const res = await fetch(`/api/cart/${cartItemId}`, {
        method: "DELETE",
      });

      if (res.status === 401) {
        router.push("/login");
        return;
      }

      if (!res.ok) {
        throw new Error("상품 삭제에 실패했습니다");
      }
    } catch (err: any) {
      // Rollback on error
      setItems(prevItems);
      setError(err.message || "상품 삭제에 실패했습니다");
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleGoToCheckout = () => {
    if (items.length === 0) return;
    router.push("/checkout");
  };

  const totalAmount = items.reduce((sum, item) => {
    const price = item.variant.product.priceKrw;
    return sum + price * item.quantity;
  }, 0);

  if (loading) {
    return (
      <Container>
        <div className="py-8 text-center text-gray-500">
          장바구니를 불러오는 중...
        </div>
      </Container>
    );
  }

  if (items.length === 0) {
    return (
      <Container>
        <div className="py-16 text-center">
          <p className="text-[18px] font-medium text-gray-500">
            장바구니가 비어 있습니다
          </p>
          <Link
            href="/"
            className="mt-6 inline-block px-6 py-3 bg-black text-white rounded-xl text-[16px] font-bold active:bg-gray-800 transition-colors"
          >
            쇼핑 계속하기
          </Link>
        </div>
      </Container>
    );
  }

  return (
    <Container>
      <div className="py-6">
        <h1 className="text-[24px] font-bold text-black mb-6">장바구니</h1>

        {/* Cart items */}
        <div className="space-y-4">
          {items.map((item) => {
            const product = item.variant.product;
            const variant = item.variant;

            const shopName =
              product.seller.sellerProfile?.shopName ?? "알수없음";
            const imageUrl = product.images[0]?.url || "/placeholder.png";
            const optionLabel =
              variant.color && variant.color !== "FREE"
                ? `${variant.color} / ${variant.sizeLabel}`
                : variant.sizeLabel === "FREE" ? "FREE" : variant.sizeLabel;
            const subtotal = product.priceKrw * item.quantity;

            // Check if product is unavailable
            const isUnavailable = product.isDeleted || !product.isActive;

            return (
              <div
                key={item.id}
                className={`flex gap-4 p-4 bg-white rounded-xl border ${
                  isUnavailable
                    ? "border-red-200 bg-red-50"
                    : "border-gray-100"
                }`}
              >
                {/* Image */}
                <Link href={`/p/${product.id}`} className="relative flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden">
                  <Image
                    src={imageUrl}
                    alt={product.title}
                    fill
                    sizes="80px"
                    className={`object-cover ${
                      isUnavailable ? "opacity-50" : ""
                    }`}
                  />
                </Link>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <Link href={`/p/${product.id}`}>
                    <h3
                      className={`text-[16px] font-bold truncate ${
                        isUnavailable
                          ? "text-gray-400 line-through"
                          : "text-black"
                      }`}
                    >
                      {product.title}
                    </h3>
                  </Link>
                  <p className="text-[13px] text-gray-500 mt-1">{shopName}</p>
                  <p className="text-[13px] text-gray-600 mt-1">
                    옵션: {optionLabel}
                  </p>

                  {isUnavailable && (
                    <p className="text-[13px] text-red-600 font-medium mt-1">
                      현재 구매할 수 없는 상품입니다
                    </p>
                  )}

                  <p
                    className={`text-[16px] font-bold mt-2 ${
                      isUnavailable ? "text-gray-400" : "text-black"
                    }`}
                  >
                    {formatKrw(subtotal)}
                  </p>

                  {/* Quantity controls */}
                  {!isUnavailable && (
                    <div className="mt-3 flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() =>
                          handleUpdateQuantity(
                            item.id,
                            item.quantity - 1,
                            variant.stock
                          )
                        }
                        className="w-8 h-8 rounded-full bg-gray-100 text-gray-700 font-bold text-[14px] active:bg-gray-200 transition-colors"
                      >
                        −
                      </button>
                      <span className="text-[14px] font-medium text-black min-w-[2ch] text-center">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          handleUpdateQuantity(
                            item.id,
                            item.quantity + 1,
                            variant.stock
                          )
                        }
                        className="w-8 h-8 rounded-full bg-gray-100 text-gray-700 font-bold text-[14px] active:bg-gray-200 transition-colors"
                      >
                        +
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemove(item.id)}
                        className="ml-auto text-[13px] text-gray-500 hover:text-red-500 transition-colors"
                      >
                        삭제
                      </button>
                    </div>
                  )}

                  {isUnavailable && (
                    <div className="mt-3">
                      <button
                        type="button"
                        onClick={() => handleRemove(item.id)}
                        className="text-[13px] text-red-600 font-medium hover:text-red-700 transition-colors"
                      >
                        장바구니에서 삭제
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Total */}
        <div className="mt-6 p-4 bg-gray-50 rounded-xl">
          <div className="flex justify-between items-center">
            <span className="text-[16px] font-medium text-gray-700">
              총 금액
            </span>
            <span className="text-[24px] font-bold text-black">
              {formatKrw(totalAmount)}
            </span>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="mt-4 p-4 bg-red-50 text-red-600 rounded-xl text-[14px]">
            {error}
          </div>
        )}

        {/* Checkout button */}
        <button
          type="button"
          onClick={handleGoToCheckout}
          disabled={items.some(
            (i) => i.variant.product.isDeleted || !i.variant.product.isActive
          )}
          className="mt-6 w-full h-[56px] bg-black text-white rounded-xl text-[18px] font-bold active:bg-gray-800 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          결제하기
        </button>
      </div>
    </Container>
  );
}
