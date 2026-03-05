"use client";

/**
 * Seller Order Detail Page
 * Shows order details, buyer shipping info, and status actions
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getStatusLabel, getStatusColor, canTransition } from "@/lib/orderState";
import type { OrderStatus } from "@prisma/client";

interface OrderBuyer {
  id: string;
  name: string;
}

interface OrderItem {
  id: string;
  product: {
    id: string;
    title: string;
  };
  variant: {
    id: string;
    color: string;
    sizeLabel: string;
  } | null;
  quantity: number;
  unitPriceKrw: number;
}

interface Order {
  id: string;
  orderNo: string;
  status: OrderStatus;
  itemsSubtotalKrw: number;
  shippingFeeKrw: number;
  totalPayKrw: number;
  shipToName: string | null;
  shipToPhone: string | null;
  shipToZip: string | null;
  shipToAddr1: string | null;
  shipToAddr2: string | null;
  shipToMemo: string | null;
  buyerId: string;
  buyer: OrderBuyer | null;
  createdAt: string;
  items: OrderItem[];
}

export default function SellerOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const router = useRouter();

  // Unwrap params
  const [orderId, setOrderId] = useState<string | null>(null);

  useEffect(() => {
    Promise.resolve(params).then((p) => setOrderId(p.id));
  }, [params]);

  useEffect(() => {
    if (orderId) {
      loadOrder();
    }
  }, [orderId]);

  const loadOrder = async () => {
    if (!orderId) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/seller/orders/${orderId}`);
      if (!res.ok) {
        alert("주문을 불러올 수 없습니다.");
        router.push("/seller/orders");
        return;
      }

      const data = await res.json();
      setOrder(data);
    } catch (error) {
      console.error("Error loading order:", error);
      alert("주문을 불러올 수 없습니다.");
      router.push("/seller/orders");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: OrderStatus) => {
    if (!order) return;

    if (!canTransition(order.status, newStatus)) {
      alert("허용되지 않은 상태 변경입니다.");
      return;
    }

    // Special confirmations
    if (newStatus === "REFUNDED") {
      const confirmed = confirm(
        "검수 완료 후 환불 처리 시 재고가 자동 복구되며 결제 취소 절차가 진행됩니다.\n\n계속하시겠습니까?"
      );
      if (!confirmed) return;
    } else if (newStatus === "RETURN_REJECTED") {
      const confirmed = confirm(
        "반품을 거절하시겠습니까? 거절 후에는 되돌릴 수 없습니다."
      );
      if (!confirmed) return;
    } else {
      if (!confirm(`주문 상태를 "${getStatusLabel(newStatus)}"로 변경하시겠습니까?`)) {
        return;
      }
    }

    setActionLoading(true);
    try {
      const res = await fetch(`/api/orders/${order.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: newStatus }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "상태 변경에 실패했습니다.");
        return;
      }

      // Reload order
      await loadOrder();
      const successMessages: Record<string, string> = {
        RETURN_STARTED: "반품이 접수되었습니다.",
        REFUNDED: "환불이 처리되었습니다.",
        RETURN_REJECTED: "반품이 거절되었습니다.",
      };
      alert(successMessages[newStatus] || "상태가 변경되었습니다.");
    } catch (error) {
      console.error("Error changing status:", error);
      alert("상태 변경 중 오류가 발생했습니다.");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading || !order) {
    return (
      <div className="py-20 text-center text-gray-400 text-sm">
        로딩 중...
      </div>
    );
  }

  const canShip = canTransition(order.status, "SHIPPED");
  const canComplete = canTransition(order.status, "COMPLETED");
  const canAcceptReturn = canTransition(order.status, "RETURN_STARTED");
  const canApproveRefund = canTransition(order.status, "REFUNDED");
  const canRejectReturn = canTransition(order.status, "RETURN_REJECTED");

  return (
    <div className="pb-20">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="mb-4 text-[14px] text-gray-500 active:text-gray-700"
        >
          ← 뒤로
        </button>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-[22px] font-bold text-black mb-1">
              주문 상세
            </h1>
            <p className="text-[13px] text-gray-500">{order.orderNo}</p>
          </div>
          <span
            className={`px-3 py-1.5 rounded-full text-[12px] font-bold ${getStatusColor(
              order.status
            )}`}
          >
            {getStatusLabel(order.status)}
          </span>
        </div>
      </div>

      {/* Chat with buyer */}
      {order.buyerId && (
        <div className="mb-6">
          <button
            type="button"
            onClick={async () => {
              try {
                const res = await fetch("/api/chat/rooms", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ buyerId: order.buyerId, orderId: order.id }),
                });
                if (!res.ok) {
                  const data = await res.json().catch(() => ({}));
                  throw new Error(data.error || "채팅방을 열 수 없습니다");
                }
                const data = await res.json();
                router.push(`/chat/${data.roomId}`);
              } catch (err) {
                alert(err instanceof Error ? err.message : "채팅방을 열 수 없습니다");
              }
            }}
            className="w-full h-11 bg-gray-100 text-black rounded-xl text-[14px] font-medium active:bg-gray-200 transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            구매자에게 메시지
          </button>
        </div>
      )}

      {/* Buyer shipping info */}
      <div className="mb-6 p-4 bg-gray-50 rounded-xl">
        <h2 className="text-[15px] font-bold text-black mb-3">배송지 정보</h2>
        {!order.shipToName ? (
          <div className="text-[14px] text-gray-500">
            {order.status === "PENDING" ? "배송지 미입력" : "정보 없음"}
          </div>
        ) : (
          <div className="space-y-2 text-[14px]">
            <div className="flex">
              <span className="w-20 text-gray-500">받는분</span>
              <span className="text-gray-900">{order.shipToName}</span>
            </div>
            <div className="flex">
              <span className="w-20 text-gray-500">연락처</span>
              <span className="text-gray-900">{order.shipToPhone || "-"}</span>
            </div>
            <div className="flex">
              <span className="w-20 text-gray-500">우편번호</span>
              <span className="text-gray-900">{order.shipToZip || "-"}</span>
            </div>
            <div className="flex">
              <span className="w-20 text-gray-500">주소</span>
              <span className="text-gray-900">
                {order.shipToAddr1 || "-"}
                {order.shipToAddr2 && `, ${order.shipToAddr2}`}
              </span>
            </div>
            {order.shipToMemo && (
              <div className="flex">
                <span className="w-20 text-gray-500">배송 메모</span>
                <span className="text-gray-900">{order.shipToMemo}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Order items */}
      <div className="mb-6">
        <h2 className="text-[15px] font-bold text-black mb-3">주문 상품</h2>
        <div className="space-y-3">
          {order.items.map((item) => {
            const variantText = item.variant
              ? `${item.variant.color} / ${item.variant.sizeLabel}`
              : "FREE";

            return (
              <div
                key={item.id}
                className="p-3 bg-white border border-gray-100 rounded-lg"
              >
                <p className="text-[14px] font-medium text-gray-900 mb-1">
                  {item.product.title}
                </p>
                <p className="text-[12px] text-gray-500 mb-2">
                  {variantText} · 수량 {item.quantity}개
                </p>
                <p className="text-[14px] font-bold text-black">
                  {(item.unitPriceKrw * item.quantity).toLocaleString("ko-KR")}원
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Price breakdown */}
      <div className="mb-6 p-4 bg-gray-50 rounded-xl">
        <div className="space-y-2 text-[14px]">
          <div className="flex justify-between">
            <span className="text-gray-600">상품 금액</span>
            <span className="text-gray-900">
              {order.itemsSubtotalKrw.toLocaleString("ko-KR")}원
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">배송비</span>
            <span className="text-gray-900">
              {order.shippingFeeKrw.toLocaleString("ko-KR")}원
            </span>
          </div>
          <div className="pt-2 border-t border-gray-200 flex justify-between">
            <span className="font-bold text-black">총 결제금액</span>
            <span className="font-bold text-black text-[16px]">
              {order.totalPayKrw.toLocaleString("ko-KR")}원
            </span>
          </div>
        </div>
      </div>

      {/* Status actions */}
      <div className="space-y-2">
        {canShip && (
          <button
            onClick={() => handleStatusChange("SHIPPED")}
            disabled={actionLoading}
            className="w-full h-12 bg-black text-white rounded-xl text-[15px] font-bold active:bg-gray-800 transition-colors disabled:opacity-50"
          >
            {actionLoading ? "처리 중..." : "발송 처리"}
          </button>
        )}
        {canComplete && (
          <button
            onClick={() => handleStatusChange("COMPLETED")}
            disabled={actionLoading}
            className="w-full h-12 bg-gray-800 text-white rounded-xl text-[15px] font-bold active:bg-gray-700 transition-colors disabled:opacity-50"
          >
            {actionLoading ? "처리 중..." : "배송 완료 처리"}
          </button>
        )}
        {canAcceptReturn && (
          <>
            <div className="p-4 bg-orange-50 rounded-xl">
              <p className="text-[13px] text-orange-800 mb-1 font-medium">
                고객이 환불을 요청했습니다
              </p>
              <p className="text-[12px] text-orange-700">
                반품 접수 후 상품 검수를 진행해주세요.
              </p>
            </div>
            <button
              onClick={() => handleStatusChange("RETURN_STARTED")}
              disabled={actionLoading}
              className="w-full h-12 bg-orange-600 text-white rounded-xl text-[15px] font-bold active:bg-orange-700 transition-colors disabled:opacity-50"
            >
              {actionLoading ? "처리 중..." : "반품 접수"}
            </button>
          </>
        )}
        {canApproveRefund && (
          <>
            <div className="p-4 bg-amber-50 rounded-xl">
              <p className="text-[13px] text-amber-800 mb-1 font-medium">
                반품 검수를 완료해주세요
              </p>
              <p className="text-[12px] text-amber-700">
                검수 완료 후 환불 처리 시 재고가 자동 복구되며 결제 취소 절차가 진행됩니다.
              </p>
            </div>
            <button
              onClick={() => handleStatusChange("REFUNDED")}
              disabled={actionLoading}
              className="w-full h-12 bg-black text-white rounded-xl text-[15px] font-bold active:bg-gray-800 transition-colors disabled:opacity-50"
            >
              {actionLoading ? "처리 중..." : "검수 완료 · 환불 처리"}
            </button>
          </>
        )}
        {canRejectReturn && (
          <button
            onClick={() => handleStatusChange("RETURN_REJECTED")}
            disabled={actionLoading}
            className="w-full h-12 bg-white text-red-600 border border-red-300 rounded-xl text-[15px] font-bold active:bg-red-50 transition-colors disabled:opacity-50"
          >
            {actionLoading ? "처리 중..." : "반품 거절"}
          </button>
        )}
      </div>
    </div>
  );
}
