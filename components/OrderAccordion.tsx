"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { formatKrw } from "@/lib/format";
import { getStatusLabel, getStatusColor } from "@/lib/orderState";
import type { OrderStatus } from "@prisma/client";

type OrderSummary = {
  id: string;
  orderNo: string;
  status: OrderStatus;
  totalPayKrw: number;
  createdAt: string;
  firstItemTitle: string;
  itemCount: number;
};

type OrderAccordionProps = {
  roomId: string;
};

export default function OrderAccordion({ roomId }: OrderAccordionProps) {
  const [open, setOpen] = useState(false);
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!open || loaded) return;

    fetch(`/api/chat/rooms/${roomId}/orders`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        setOrders(data.orders ?? []);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, [open, loaded, roomId]);

  return (
    <div className="border-b border-gray-100">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-[13px] font-medium text-gray-600 hover:bg-gray-50 transition-colors"
      >
        <span>주문 내역</span>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="px-4 pb-3 space-y-2">
          {orders.length === 0 ? (
            <p className="text-[13px] text-gray-400 py-2">주문 내역이 없습니다</p>
          ) : (
            orders.map((order) => {
              const statusLabel = getStatusLabel(order.status);
              const statusColor = getStatusColor(order.status);
              const displayTitle =
                order.itemCount > 1
                  ? `${order.firstItemTitle} 외 ${order.itemCount - 1}건`
                  : order.firstItemTitle;

              return (
                <Link
                  key={order.id}
                  href={`/orders/${order.id}`}
                  className="block p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[12px] text-gray-500">{order.orderNo}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${statusColor}`}>
                      {statusLabel}
                    </span>
                  </div>
                  <p className="text-[13px] font-medium text-black truncate">
                    {displayTitle}
                  </p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[13px] font-bold text-black">
                      {formatKrw(order.totalPayKrw)}
                    </span>
                    <span className="text-[11px] text-gray-400">
                      {new Date(order.createdAt).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" })}
                    </span>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
