"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getStatusLabel, getStatusColor } from "@/lib/orderState";
import type { OrderStatus } from "@prisma/client";

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
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus | "ALL">(
    (searchParams?.get("status") as OrderStatus) || "ALL"
  );

  useEffect(() => {
    loadOrders();
  }, [selectedStatus]);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const url =
        selectedStatus === "ALL"
          ? "/api/admin/orders"
          : `/api/admin/orders?status=${selectedStatus}`;
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

  const handleOverride = async (orderId: string, currentStatus: OrderStatus) => {
    const newStatus = prompt(
      `주문 ${orderId}의 상태를 변경합니다 (현재: ${getStatusLabel(currentStatus)}):\n\n가능한 상태: PENDING, PAID, SHIPPED, COMPLETED, CANCELLED, REFUND_REQUESTED, RETURN_STARTED, RETURN_REJECTED, REFUNDED, FAILED, EXPIRED`
    );

    if (!newStatus) return;

    const reason = prompt("변경 사유를 입력하세요 (최소 10자 이상, 필수):");
    if (!reason || reason.trim().length < 10) {
      alert("변경 사유는 최소 10자 이상이어야 합니다");
      return;
    }

    if (
      !confirm(
        `⚠️ 주문 상태 강제 변경\n\n주문: ${orderId}\n현재: ${getStatusLabel(currentStatus)}\n변경: ${newStatus}\n\n이 작업은 긴급 상황에서만 사용해야 합니다. 계속하시겠습니까?`
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/orders/${orderId}/override`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: newStatus.toUpperCase(), reason }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "주문 상태 변경에 실패했습니다");
      }

      alert("주문 상태가 성공적으로 변경되었습니다. 이 작업은 로그에 기록됩니다.");
      loadOrders();
    } catch (error: any) {
      console.error("주문 상태 변경 오류:", error);
      alert(error.message || "주문 상태 변경에 실패했습니다");
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
                    {new Date(order.createdAt).toLocaleString("ko-KR")}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-900">
                    ₩{order.totalPayKrw.toLocaleString("ko-KR")}
                  </p>
                </div>
              </div>

              {/* Override button - only for special cases */}
              <div className="flex gap-2">
                <button
                  onClick={() => handleOverride(order.id, order.status)}
                  className="px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded hover:bg-red-700 transition-colors"
                >
                  🛡️ 상태 변경
                </button>
                <a
                  href={`/admin/orders/${order.id}`}
                  className="px-3 py-1.5 bg-gray-100 text-gray-700 text-xs font-medium rounded hover:bg-gray-200 transition-colors"
                >
                  상세 보기 →
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
