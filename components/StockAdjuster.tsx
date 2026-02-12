"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function StockAdjuster({
  variantId,
  sizeLabel,
  initialStock,
}: {
  variantId: string;
  sizeLabel: string;
  initialStock: number;
}) {
  const router = useRouter();
  const [stock, setStock] = useState(initialStock);
  const [isPending, setIsPending] = useState(false);

  async function adjust(delta: number) {
    const prev = stock;
    setStock((s) => s + delta);
    setIsPending(true);

    try {
      const res = await fetch(`/api/seller/variants/${variantId}/stock`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ delta }),
      });

      if (!res.ok) {
        setStock(prev);
        const data = await res.json().catch(() => null);
        const msg = data?.message;
        if (msg === "OUT_OF_STOCK") {
          alert("재고가 더 이상 없습니다");
        } else {
          alert("재고 업데이트 실패");
        }
        return;
      }

      const data = await res.json();
      setStock(data.variant.stock);
      router.refresh();
    } catch {
      setStock(prev);
      alert("재고 업데이트 실패");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="flex items-center gap-1">
      <span className="text-[11px] text-gray-500 w-6 text-center shrink-0">
        {sizeLabel}
      </span>
      <button
        onClick={() => adjust(-1)}
        disabled={isPending || stock <= 0}
        className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-[14px] font-medium text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed active:bg-gray-100 transition-colors"
      >
        -
      </button>
      <span className="w-8 text-center text-[13px] font-bold tabular-nums">
        {stock}
      </span>
      <button
        onClick={() => adjust(+1)}
        disabled={isPending}
        className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-[14px] font-medium text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed active:bg-gray-100 transition-colors"
      >
        +
      </button>
    </div>
  );
}
