"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

export default function SellerProductFilter({
  totalCount,
  activeCount,
  hiddenCount,
  soldOutCount,
  deletedCount,
}: {
  totalCount: number;
  activeCount: number;
  hiddenCount: number;
  soldOutCount: number;
  deletedCount: number;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const showHidden = searchParams.get("showHidden") === "1";
  const showDeleted = searchParams.get("showDeleted") === "1";

  const toggle = useCallback(
    (key: string, current: boolean) => {
      const params = new URLSearchParams(searchParams.toString());
      if (current) {
        params.delete(key);
      } else {
        params.set(key, "1");
      }
      const qs = params.toString();
      router.replace(`/seller${qs ? `?${qs}` : ""}`, { scroll: false });
    },
    [router, searchParams],
  );

  return (
    <div className="flex gap-2 flex-wrap">
      {/* 판매중 — always shown, just informational */}
      <span className="h-8 px-3 flex items-center rounded-full bg-black text-white text-[12px] font-medium">
        판매중 {activeCount}
      </span>

      {soldOutCount > 0 && (
        <span className="h-8 px-3 flex items-center rounded-full bg-amber-100 text-amber-700 text-[12px] font-medium">
          품절 {soldOutCount}
        </span>
      )}

      {/* 숨김 toggle */}
      <button
        onClick={() => toggle("showHidden", showHidden)}
        className={`h-8 px-3 flex items-center rounded-full text-[12px] font-medium transition-colors ${
          showHidden
            ? "bg-gray-700 text-white"
            : "bg-gray-100 text-gray-500"
        }`}
      >
        숨김 {hiddenCount}
      </button>

      {/* 삭제 toggle */}
      <button
        onClick={() => toggle("showDeleted", showDeleted)}
        className={`h-8 px-3 flex items-center rounded-full text-[12px] font-medium transition-colors ${
          showDeleted
            ? "bg-gray-900 text-white"
            : "bg-gray-100 text-gray-500"
        }`}
      >
        삭제 {deletedCount}
      </button>
    </div>
  );
}
