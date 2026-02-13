"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Container from "@/components/Container";
import { formatKrw } from "@/lib/format";

interface Address {
  id: string;
  name: string;
  phone: string;
  zipCode: string;
  addr1: string;
  addr2: string | null;
  isDefault: boolean;
}

interface CartItemData {
  id: string;
  variantId: string;
  quantity: number;
  variant: {
    id: string;
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
        sellerProfile: {
          shopName: string;
          shippingFeeKrw: number;
          freeShippingThreshold: number;
        } | null;
      };
    };
  };
}

interface SellerGroup {
  sellerId: string;
  shopName: string;
  items: CartItemData[];
  subtotal: number;
  shippingFee: number;
  freeShippingThreshold: number;
}

export default function CheckoutPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const directOrderId = searchParams.get("direct");

  const [loading, setLoading] = useState(true);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [items, setItems] = useState<CartItemData[]>([]);
  const [sellerGroups, setSellerGroups] = useState<SellerGroup[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [orderIds, setOrderIds] = useState<string[]>([]);
  const [isDirectMode, setIsDirectMode] = useState(false);

  useEffect(() => {
    if (directOrderId) {
      loadDirectOrder(directOrderId);
    } else {
      loadCheckoutData();
    }
  }, [directOrderId]);

  const loadDirectOrder = async (orderId: string) => {
    try {
      setLoading(true);
      setError(null);
      setIsDirectMode(true);

      // Fetch order
      const orderRes = await fetch(`/api/orders/${orderId}`);
      if (orderRes.status === 401) {
        router.push("/login");
        return;
      }

      if (!orderRes.ok) {
        throw new Error("주문을 불러오는데 실패했습니다");
      }

      const order = await orderRes.json();

      // Verify ownership
      // (API already checks this, but double-check client-side)
      // If we got this far, user is the buyer

      // Load addresses
      const addressRes = await fetch("/api/addresses");
      if (!addressRes.ok) {
        if (addressRes.status === 401) {
          router.push("/login");
          return;
        }
        throw new Error("Failed to load addresses");
      }

      const addressesData = await addressRes.json();
      setAddresses(addressesData);

      const defaultAddr = addressesData.find((a: Address) => a.isDefault);
      setSelectedAddress(defaultAddr || null);

      // Transform order items to cart-like structure
      const cartItems: CartItemData[] = order.items.map((item: any) => ({
        id: item.id,
        variantId: item.variantId,
        quantity: item.quantity,
        variant: {
          id: item.variant.id,
          sizeLabel: item.variant.sizeLabel,
          stock: item.variant.stock,
          product: item.product,
        },
      }));

      setItems(cartItems);

      // Create seller group (single seller in direct mode)
      const product = order.items[0].product;
      const shopName = product.seller?.sellerProfile?.shopName || "알수없음";

      const group: SellerGroup = {
        sellerId: order.sellerId,
        shopName,
        items: cartItems,
        subtotal: order.itemsSubtotalKrw || order.totalAmountKrw,
        shippingFee: order.shippingFeeKrw,
        freeShippingThreshold:
          product.seller?.sellerProfile?.freeShippingThreshold || 50000,
      };

      setSellerGroups([group]);
      setOrderIds([orderId]); // Already have order ID
      setShowPaymentModal(true); // Go directly to payment modal
    } catch (err: any) {
      setError(err.message || "주문 정보를 불러오는데 실패했습니다");
    } finally {
      setLoading(false);
    }
  };

  const loadCheckoutData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load cart from API
      const cartRes = await fetch("/api/cart");
      if (cartRes.status === 401) {
        router.push("/login");
        return;
      }

      if (!cartRes.ok) {
        throw new Error("장바구니를 불러오는데 실패했습니다");
      }

      const cart = await cartRes.json();

      if (cart.length === 0) {
        router.push("/cart");
        return;
      }

      // Load addresses
      const addressRes = await fetch("/api/addresses");
      if (!addressRes.ok) {
        if (addressRes.status === 401) {
          router.push("/login");
          return;
        }
        throw new Error("Failed to load addresses");
      }

      const addressesData = await addressRes.json();
      setAddresses(addressesData);

      const defaultAddr = addressesData.find((a: Address) => a.isDefault);
      setSelectedAddress(defaultAddr || null);

      // Validate products
      for (const item of cart) {
        const product = item.variant.product;
        const variant = item.variant;

        if (product.isDeleted || !product.isActive) {
          throw new Error(
            `${product.title}은(는) 현재 구매할 수 없습니다`
          );
        }

        if (item.quantity > variant.stock) {
          throw new Error(
            `${product.title} (${variant.sizeLabel})의 재고가 부족합니다 (요청: ${item.quantity}, 재고: ${variant.stock})`
          );
        }
      }

      setItems(cart);

      // Group by seller
      const groups = new Map<string, SellerGroup>();

      for (const item of cart) {
        const product = item.variant.product;
        const sellerId = product.sellerId;
        const shopName =
          product.seller?.sellerProfile?.shopName || "알수없음";
        const shippingFeeKrw =
          product.seller?.sellerProfile?.shippingFeeKrw || 3000;
        const freeShippingThreshold =
          product.seller?.sellerProfile?.freeShippingThreshold || 50000;

        if (!groups.has(sellerId)) {
          groups.set(sellerId, {
            sellerId,
            shopName,
            items: [],
            subtotal: 0,
            shippingFee: shippingFeeKrw,
            freeShippingThreshold,
          });
        }

        const group = groups.get(sellerId)!;
        group.items.push(item);
        group.subtotal += product.priceKrw * item.quantity;
      }

      // Calculate shipping fees
      const groupsArray = Array.from(groups.values());
      for (const group of groupsArray) {
        if (group.subtotal >= group.freeShippingThreshold) {
          group.shippingFee = 0;
        }
      }

      setSellerGroups(groupsArray);
    } catch (err: any) {
      setError(err.message || "결제 준비 중 오류가 발생했습니다");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrders = async () => {
    // In direct mode, order already exists
    if (isDirectMode) {
      setShowPaymentModal(true);
      return;
    }

    if (!selectedAddress) {
      alert("배송지를 선택해주세요");
      return;
    }

    try {
      setProcessingPayment(true);
      setError(null);

      const orderItems = items.map((i) => ({
        productId: i.variant.product.id,
        variantId: i.variantId,
        quantity: i.quantity,
      }));

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: orderItems,
          address: {
            name: selectedAddress.name,
            phone: selectedAddress.phone,
            zipCode: selectedAddress.zipCode,
            addr1: selectedAddress.addr1,
            addr2: selectedAddress.addr2 || undefined,
          },
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "주문 생성 실패");
      }

      const createdOrderIds = data.orderId
        ? [data.orderId]
        : data.orders?.map((o: any) => o.orderId) || [];

      if (createdOrderIds.length === 0) {
        throw new Error("주문 생성 실패");
      }

      setOrderIds(createdOrderIds);
      setShowPaymentModal(true);
    } catch (err: any) {
      setError(err.message || "주문 생성에 실패했습니다");
    } finally {
      setProcessingPayment(false);
    }
  };

  const handlePaymentSuccess = async () => {
    try {
      setProcessingPayment(true);

      const res = await fetch("/api/payments/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderIds }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 410) {
          throw new Error("주문 시간이 만료되었습니다. 다시 진행해 주세요.");
        }
        throw new Error(data.error || "결제 처리 실패");
      }

      // Clear cart via API (only in cart mode, not direct mode)
      if (!isDirectMode) {
        await fetch("/api/cart", { method: "DELETE" });
      }

      // Redirect to success page with all order IDs
      const idsParam = orderIds.join(",");
      router.push(`/orders/success?ids=${idsParam}`);
    } catch (err: any) {
      setError(err.message || "결제 처리에 실패했습니다");
      setShowPaymentModal(false);
    } finally {
      setProcessingPayment(false);
    }
  };

  const handlePaymentFail = async () => {
    try {
      setProcessingPayment(true);

      const res = await fetch("/api/payments/simulate-fail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderIds }),
      });

      if (!res.ok) {
        throw new Error("결제 실패 처리 중 오류 발생");
      }

      setError("결제가 실패했습니다. 다시 시도해주세요.");
      setShowPaymentModal(false);
    } catch (err: any) {
      setError(err.message || "결제 실패 처리 중 오류가 발생했습니다");
      setShowPaymentModal(false);
    } finally {
      setProcessingPayment(false);
    }
  };

  const totalAmount = sellerGroups.reduce((sum, g) => sum + g.subtotal, 0);
  const totalShipping = sellerGroups.reduce((sum, g) => sum + g.shippingFee, 0);
  const totalPay = totalAmount + totalShipping;

  if (loading) {
    return (
      <Container>
        <div className="py-8 text-center text-gray-500">결제 준비 중...</div>
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
            className="mt-6 inline-block px-6 py-3 bg-black text-white rounded-xl text-[16px] font-bold"
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
        <h1 className="text-[24px] font-bold text-black mb-6">주문/결제</h1>

        {/* SECTION 1: Address */}
        <div className="mb-6">
          <h2 className="text-[18px] font-bold text-black mb-3">배송지</h2>
          {selectedAddress ? (
            <div className="p-4 bg-white rounded-xl border border-gray-200">
              <p className="text-[16px] font-bold text-black">
                {selectedAddress.name}
              </p>
              <p className="text-[14px] text-gray-600 mt-1">
                {selectedAddress.phone}
              </p>
              <p className="text-[14px] text-gray-600">
                ({selectedAddress.zipCode}) {selectedAddress.addr1}{" "}
                {selectedAddress.addr2}
              </p>
              <button
                type="button"
                className="mt-3 text-[14px] text-blue-600 font-medium"
                onClick={() => alert("배송지 변경 기능은 준비 중입니다")}
              >
                배송지 변경
              </button>
            </div>
          ) : (
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 text-center">
              <p className="text-[14px] text-gray-600 mb-3">
                등록된 배송지가 없습니다
              </p>
              <button
                type="button"
                className="px-4 py-2 bg-black text-white rounded-lg text-[14px] font-bold"
                onClick={() => alert("배송지 추가 기능은 준비 중입니다")}
              >
                배송지 추가
              </button>
            </div>
          )}
        </div>

        {/* SECTION 2: Items grouped by seller */}
        <div className="mb-6">
          <h2 className="text-[18px] font-bold text-black mb-3">주문 상품</h2>
          <div className="space-y-4">
            {sellerGroups.map((group) => (
              <div
                key={group.sellerId}
                className="p-4 bg-white rounded-xl border border-gray-100"
              >
                <h3 className="text-[16px] font-bold text-black mb-3">
                  {group.shopName}
                </h3>

                <div className="space-y-3 mb-3">
                  {group.items.map((item) => {
                    const product = item.variant.product;
                    const variant = item.variant;
                    const imageUrl = product.images[0]?.url || "/placeholder.png";
                    const sizeLabel =
                      variant.sizeLabel === "FREE" ? "FREE" : variant.sizeLabel;
                    const subtotal = product.priceKrw * item.quantity;

                    return (
                      <div
                        key={item.id}
                        className="flex gap-3"
                      >
                        <img
                          src={imageUrl}
                          alt={product.title}
                          className="w-16 h-16 rounded-lg object-cover"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="text-[14px] font-medium text-black truncate">
                            {product.title}
                          </h4>
                          <p className="text-[13px] text-gray-500">
                            사이즈: {sizeLabel} / 수량: {item.quantity}개
                          </p>
                          <p className="text-[14px] font-bold text-black mt-1">
                            {formatKrw(subtotal)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-3 border-t border-gray-100 space-y-1 text-[14px]">
                  <div className="flex justify-between">
                    <span className="text-gray-600">상품 금액</span>
                    <span className="font-medium text-black">
                      {formatKrw(group.subtotal)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">배송비</span>
                    <span className="font-medium text-black">
                      {group.shippingFee === 0 ? (
                        <span className="text-green-600">무료</span>
                      ) : (
                        formatKrw(group.shippingFee)
                      )}
                    </span>
                  </div>
                  {group.shippingFee > 0 && (
                    <p className="text-[12px] text-gray-500">
                      {formatKrw(group.freeShippingThreshold)} 이상 구매 시 무료배송
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SECTION 3: Total */}
        <div className="mb-6 p-4 bg-gray-50 rounded-xl space-y-2">
          <div className="flex justify-between text-[14px]">
            <span className="text-gray-600">상품 합계</span>
            <span className="font-medium text-black">
              {formatKrw(totalAmount)}
            </span>
          </div>
          <div className="flex justify-between text-[14px]">
            <span className="text-gray-600">배송비 합계</span>
            <span className="font-medium text-black">
              {formatKrw(totalShipping)}
            </span>
          </div>
          <p className="text-[12px] text-gray-500">
            배송비는 판매자별 정책이 적용됩니다.{" "}
            <Link href="/policy/returns" className="text-blue-600 underline">
              자세히 보기
            </Link>
          </p>
          <div className="pt-2 border-t border-gray-200 flex justify-between items-center">
            <span className="text-[16px] font-bold text-black">총 결제 금액</span>
            <span className="text-[24px] font-bold text-black">
              {formatKrw(totalPay)}
            </span>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 text-red-600 rounded-xl text-[14px]">
            {error}
          </div>
        )}

        {/* Policy Notice */}
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-[12px] text-gray-600 leading-relaxed">
            결제 진행 시{" "}
            <Link href="/policy/terms" className="text-blue-600 underline">
              이용약관
            </Link>
            ,{" "}
            <Link href="/policy/privacy" className="text-blue-600 underline">
              개인정보처리방침
            </Link>
            ,{" "}
            <Link href="/policy/returns" className="text-blue-600 underline">
              환불·교환·반품 정책
            </Link>
            에 동의한 것으로 간주됩니다.
          </p>
        </div>

        {/* Payment button */}
        {!isDirectMode && (
          <button
            type="button"
            onClick={handleCreateOrders}
            disabled={processingPayment || !selectedAddress}
            className="w-full h-[56px] bg-black text-white rounded-xl text-[18px] font-bold disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {processingPayment ? "처리 중..." : "결제하기 (테스트)"}
          </button>
        )}

        {/* Payment Modal */}
        {showPaymentModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
              <h2 className="text-[20px] font-bold text-black mb-4">
                결제 테스트
              </h2>
              <p className="text-[14px] text-gray-600 mb-6">
                테스트 환경입니다. 성공 또는 실패를 선택하세요.
              </p>

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handlePaymentSuccess}
                  disabled={processingPayment}
                  className="w-full h-[48px] bg-green-600 text-white rounded-xl text-[16px] font-bold disabled:bg-gray-300"
                >
                  {processingPayment ? "처리 중..." : "결제 성공"}
                </button>
                <button
                  type="button"
                  onClick={handlePaymentFail}
                  disabled={processingPayment}
                  className="w-full h-[48px] bg-red-600 text-white rounded-xl text-[16px] font-bold disabled:bg-gray-300"
                >
                  {processingPayment ? "처리 중..." : "결제 실패"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  disabled={processingPayment}
                  className="w-full h-[48px] bg-gray-200 text-gray-700 rounded-xl text-[16px] font-bold disabled:bg-gray-100"
                >
                  취소
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Container>
  );
}
