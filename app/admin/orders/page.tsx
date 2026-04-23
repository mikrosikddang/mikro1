"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getStatusLabel, getStatusColor } from "@/lib/orderState";
import type { OrderStatus } from "@prisma/client";
import AdminOrderOverrideButton from "@/components/admin/AdminOrderOverrideButton";

interface Order {
  id: string;
  orderNo: string;
  status: OrderStatus;
  totalPayKrw: number;
  createdAt: string;
  buyer: {
    id: string;
    email: string | null;
    name: string | null;
  };
  seller: {
    id: string;
    sellerProfile: {
      shopName: string;
    } | null;
  };
  items: {
    product: {
      title: string;
    };
  }[];
}

export default function AdminOrdersPage() {
  const searchParams = useSearchParams();
  const sellerId = searchParams?.get("sellerId");
  const buyerId = searchParams?.get("buyerId");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus | "ALL">(
    (searchParams?.get("status") as OrderStatus) || "ALL"
  );

  useEffect(() => {
    loadOrders();
  }, [selectedStatus, sellerId, buyerId]);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedStatus !== "ALL") params.set("status", selectedStatus);
      if (sellerId) params.set("sellerId", sellerId);
      if (buyerId) params.set("buyerId", buyerId);
      const url = `/api/admin/orders${params.toString() ? `?${params.toString()}` : ""}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("주문 목록을 불러오는데 실패했습니다");
      const data = await res.json();
      setOrders(data.orders || []);
    } catch (error) {
      console.error("주문 로딩 오류:", error);
      alert("주문 목록을 불러오는데 실패했습니다");
    } finally {
      setLoading(false);
    }
  };

  const statusFilters: (OrderStatus | "ALL")[] = [
    "ALL",
    "PENDING",
    "PAID",
    "SHIPPED",
    "COMPLETED",
    "REFUND_REQUESTED",
    "RETURN_STARTED",
    "RETURN_REJECTED",
    "REFUNDED",
    "CANCELLED",
    "FAILED",
    "EXPIRED",
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          주문 모니터링
        </h1>
        <p className="text-sm text-gray-600 mb-4">
          플랫폼의 모든 주문을 모니터링합니다. 상태 변경은 분쟁 해결 시에만 사용하세요.
        </p>
        {(sellerId || buyerId) && (
          <p className="mb-4 text-sm text-gray-500">
            필터:
            {sellerId ? ` 판매자 ${sellerId}` : ""}
            {buyerId ? ` 구매자 ${buyerId}` : ""}
          </p>
        )}

        {/* Status filters */}
        <div className="flex flex-wrap gap-2">
          {statusFilters.map((status) => (
            <button
              key={status}
              onClick={() => setSelectedStatus(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                selectedStatus === status
                  ? "bg-red-900 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-100"
              }`}
            >
              {status === "ALL" ? "전체" : getStatusLabel(status as OrderStatus)}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">로딩 중...</div>
      ) : orders.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          {selectedStatus === "ALL" ? "전체" : getStatusLabel(selectedStatus as OrderStatus)} 상태의 주문이 없습니다
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <div
              key={order.id}
              className="bg-white p-4 rounded-lg shadow border border-gray-200"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-gray-500">
                      {order.orderNo}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-bold ${getStatusColor(
                        order.status
                      )}`}
                    >
                      {getStatusLabel(order.status)}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-gray-900">
                    {order.items[0]?.product.title}
                    {order.items.length > 1 && ` 외 ${order.items.length - 1}개`}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    구매자: {order.buyer.email || order.buyer.name || order.buyer.id} •
                    판매자: {order.seller.sellerProfile?.shopName || order.seller.id}
                  </p>
                  <p className="text-xs text-gray-400">
                    {new Date(order.createdAt).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-900">
                    {order.totalPayKrw.toLocaleString("ko-KR")}원
                  </p>
                </div>
              </div>

              {/* Override button - only for special cases */}
              <div className="flex gap-2">
                <AdminOrderOverrideButton
                  orderId={order.id}
                  currentStatus={order.status}
                  buttonLabel="🛡️ 상태 변경"
                  buttonClassName="rounded px-3 py-1.5 text-xs font-medium text-white transition-colors bg-red-600 hover:bg-red-700"
                  onSuccess={loadOrders}
                />
                <Link
                  href={`/admin/orders/${order.id}`}
                  className="px-3 py-1.5 bg-gray-100 text-gray-700 text-xs font-medium rounded hover:bg-gray-200 transition-colors"
                >
                  상세 보기 →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
