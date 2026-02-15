"use client";

/**
 * Seller Orders List Page
 * Shows incoming orders for the seller with status filters
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { getStatusLabel, getStatusColor } from "@/lib/orderState";
import type { OrderStatus } from "@prisma/client";

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
}

const STATUS_FILTERS = [
  { label: "전체", value: null },
  { label: "결제대기", value: "PENDING" },
  { label: "결제완료", value: "PAID" },
  { label: "배송중", value: "SHIPPED" },
  { label: "환불요청", value: "REFUND_REQUESTED" },
  { label: "완료", value: "COMPLETED" },
  { label: "취소/실패", value: "CANCELLED" },
] as const;

export default function SellerOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);

  useEffect(() => {
    loadOrders();
  }, [selectedStatus]);

  const loadOrders = async () => {
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
  };

  return (
    <div className="pb-20">
      <h1 className="text-[22px] font-bold text-black mb-6">주문 관리</h1>

      {/* Status filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-4 mb-4 border-b border-gray-100">
        {STATUS_FILTERS.map((filter) => (
          <button
            key={filter.label}
            onClick={() => setSelectedStatus(filter.value)}
            className={`px-4 py-2 rounded-full text-[13px] font-medium whitespace-nowrap transition-colors ${
              selectedStatus === filter.value
                ? "bg-black text-white"
                : "bg-gray-100 text-gray-600 active:bg-gray-200"
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
        <div className="flex flex-col gap-3">
          {orders.map((order) => {
            const firstItem = order.items[0];
            const itemCount = order.items.length;
            const itemText =
              itemCount > 1
                ? `${firstItem.product.title} 외 ${itemCount - 1}건`
                : firstItem.product.title;

            return (
              <Link
                key={order.id}
                href={`/seller/orders/${order.id}`}
                className="block p-4 bg-white border border-gray-100 rounded-xl active:bg-gray-50 transition-colors"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <p className="text-[13px] text-gray-500 mb-1">
                      {order.orderNo}
                    </p>
                    <p className="text-[15px] font-medium text-gray-900">
                      {itemText}
                    </p>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${getStatusColor(
                      order.status
                    )}`}
                  >
                    {getStatusLabel(order.status)}
                  </span>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
                  <p className="text-[13px] text-gray-400">
                    {new Date(order.createdAt).toLocaleDateString("ko-KR")}
                  </p>
                  <p className="text-[16px] font-bold text-black">
                    ₩{order.totalPayKrw.toLocaleString("ko-KR")}
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
