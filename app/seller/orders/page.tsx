"use client";

/**
 * Seller Orders List Page
 * Shows incoming orders for the seller with status filters
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { getStatusLabel, getStatusColor } from "@/lib/orderState";
import type { OrderClaim, OrderStatus } from "@prisma/client";

interface OrderItem {
  product: {
    id: string;
    title: string;
  };
  quantity: number;
}

interface Order {
  id: string;
  orderNo: string;
  status: OrderStatus;
  totalPayKrw: number;
  createdAt: string;
  items: OrderItem[];
  claims?: OrderClaim[];
  buyer: { name: string } | null;
}

const STATUS_FILTERS = [
  { label: "전체", value: null },
  { label: "결제완료", value: "PAID" },
  { label: "배송중", value: "SHIPPED" },
  { label: "환불요청", value: "REFUND_REQUESTED" },
  { label: "반품진행", value: "RETURN_STARTED" },
  { label: "완료", value: "COMPLETED" },
  { label: "취소", value: "CANCELLED" },
  { label: "환불완료", value: "REFUNDED" },
] as const;

export default function SellerOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return new URLSearchParams(window.location.search).get("status");
  });

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const url = selectedStatus
        ? `/api/seller/orders?status=${selectedStatus}&limit=50`
        : `/api/seller/orders?limit=50`;

      const res = await fetch(url);
      if (!res.ok) {
        console.error("Failed to load orders");
        setOrders([]);
        return;
      }

      const data = await res.json();
      setOrders(data.items);
    } catch (error) {
      console.error("Error loading orders:", error);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [selectedStatus]);

  useEffect(() => {
    // 필터 변경 시 서버 주문 목록을 다시 동기화하는 효과.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadOrders();
  }, [loadOrders]);

  return (
    <div className="pb-20">
      <h1 className="text-[20px] font-bold text-black mb-4">주문 관리</h1>

      {/* Status filter tabs */}
      <div className="flex gap-2 overflow-x-auto border-b border-gray-200 mb-4">
        {STATUS_FILTERS.map((filter) => (
          <button
            key={filter.label}
            onClick={() => setSelectedStatus(filter.value)}
            className={`pb-3 px-4 text-[14px] font-medium whitespace-nowrap border-b-2 transition-colors ${
              selectedStatus === filter.value
                ? "border-black text-black"
                : "border-transparent text-gray-500"
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Orders list */}
      {loading ? (
        <div className="py-20 text-center text-gray-400 text-sm">
          로딩 중...
        </div>
      ) : orders.length === 0 ? (
        <div className="py-20 text-center text-gray-400 text-sm">
          주문이 없습니다.
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {orders.map((order) => {
            const firstItem = order.items[0];
            const itemCount = order.items.length;
            const itemText =
              itemCount > 1
                ? `${firstItem.product.title} 외 ${itemCount - 1}건`
                : firstItem.product.title;
            const activeClaim = order.claims?.[0];

            return (
              <Link
                key={order.id}
                href={`/seller/orders/${order.id}`}
                className="block p-2.5 bg-white border border-gray-100 rounded-lg active:bg-gray-50 transition-colors"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-1.5">
                  <div className="flex-1">
                    <p className="text-[12px] text-gray-500 mb-0.5">
                      {order.orderNo}
                      {order.buyer?.name && <span className="ml-2 text-gray-400">· {order.buyer.name}</span>}
                    </p>
                    <p className="text-[14px] font-medium text-gray-900">
                      {itemText}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[11px] font-medium ${getStatusColor(
                      order.status
                    )}`}
                  >
                    {getStatusLabel(order.status)}
                  </span>
                </div>
                {activeClaim && (
                  <div className="mb-2 rounded-lg border border-orange-100 bg-orange-50 px-2.5 py-2">
                    <p className="text-[12px] font-medium text-orange-800">
                      {activeClaim.type === "REFUND" ? "환불" : "교환"} 요청 ·{" "}
                      {activeClaim.status === "APPROVED" ? "승인됨" : "검토 필요"}
                    </p>
                    {activeClaim.message ? (
                      <p className="mt-0.5 line-clamp-1 text-[12px] text-orange-700">
                        {activeClaim.message}
                      </p>
                    ) : null}
                  </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-50">
                  <p className="text-[12px] text-gray-400">
                    {new Date(order.createdAt).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" })}
                  </p>
                  <p className="text-[15px] font-bold text-black">
                    {order.totalPayKrw.toLocaleString("ko-KR")}원
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
