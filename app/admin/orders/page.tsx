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
      if (!res.ok) throw new Error("Failed to load orders");
      const data = await res.json();
      setOrders(data.orders || []);
    } catch (error) {
      console.error("Error loading orders:", error);
      alert("Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  const handleOverride = async (orderId: string, currentStatus: OrderStatus) => {
    const newStatus = prompt(
      `Override order ${orderId} to status (current: ${currentStatus}):\n\nValid statuses: PENDING, PAID, SHIPPED, COMPLETED, CANCELLED, REFUND_REQUESTED, REFUNDED, FAILED`
    );

    if (!newStatus) return;

    const reason = prompt("Enter override reason (min 10 characters, required):");
    if (!reason || reason.trim().length < 10) {
      alert("Override reason must be at least 10 characters");
      return;
    }

    if (
      !confirm(
        `⚠️ OVERRIDE ORDER STATUS\n\nOrder: ${orderId}\nFrom: ${currentStatus}\nTo: ${newStatus}\n\nThis is an emergency action that bypasses normal rules. Continue?`
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
        throw new Error(data.error || "Failed to override order");
      }

      alert("Order status overridden successfully. This action has been logged.");
      loadOrders();
    } catch (error: any) {
      console.error("Error overriding order:", error);
      alert(error.message || "Failed to override order");
    }
  };

  const statusFilters: (OrderStatus | "ALL")[] = [
    "ALL",
    "PENDING",
    "PAID",
    "SHIPPED",
    "COMPLETED",
    "REFUND_REQUESTED",
    "REFUNDED",
    "CANCELLED",
    "FAILED",
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Order Monitoring
        </h1>
        <p className="text-sm text-gray-600 mb-4">
          Monitor platform orders. Use override only for dispute resolution.
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
              {status === "ALL" ? "ALL" : getStatusLabel(status as OrderStatus)}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : orders.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          No orders found with status: {selectedStatus}
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
                    {order.items.length > 1 && ` +${order.items.length - 1} more`}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Buyer: {order.buyer.email || order.buyer.name || order.buyer.id} •
                    Seller: {order.seller.sellerProfile?.shopName || order.seller.id}
                  </p>
                  <p className="text-xs text-gray-400">
                    {new Date(order.createdAt).toLocaleString()}
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
                  🛡️ Override Status
                </button>
                <a
                  href={`/admin/orders/${order.id}`}
                  className="px-3 py-1.5 bg-gray-100 text-gray-700 text-xs font-medium rounded hover:bg-gray-200 transition-colors"
                >
                  View Details →
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
