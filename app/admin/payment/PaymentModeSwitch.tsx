"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Mode = "live" | "test";

export default function PaymentModeSwitch({
  currentMode,
  liveReady,
  testReady,
}: {
  currentMode: Mode;
  liveReady: boolean;
  testReady: boolean;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleToggle = async (next: Mode) => {
    if (next === currentMode) return;
    if (next === "live" && !liveReady) {
      setError("라이브 키가 환경변수에 설정되어 있지 않습니다.");
      return;
    }
    if (next === "test" && !testReady) {
      setError("테스트 키가 환경변수에 설정되어 있지 않습니다.");
      return;
    }

    const warn =
      next === "live"
        ? "라이브 모드로 전환하면 이후 모든 결제가 실제 카드 결제로 처리됩니다.\n정말 전환하시겠습니까?"
        : "테스트 모드로 전환하면 실제 결제가 일어나지 않습니다.\n정말 전환하시겠습니까?";
    if (!window.confirm(warn)) return;

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/payment-mode", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || "모드 전환에 실패했습니다.");
        return;
      }
      router.refresh();
    } catch {
      setError("네트워크 오류로 모드 전환에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => handleToggle("test")}
          disabled={submitting || currentMode === "test"}
          className={`flex-1 px-4 py-3 rounded-lg font-medium text-sm border transition-colors ${
            currentMode === "test"
              ? "bg-amber-100 text-amber-900 border-amber-300 cursor-default"
              : "bg-white text-gray-900 border-gray-300 hover:bg-gray-50"
          } disabled:opacity-60`}
        >
          TEST 모드로 전환
          {!testReady && (
            <span className="block text-xs text-red-600 mt-0.5">
              키 미설정
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => handleToggle("live")}
          disabled={submitting || currentMode === "live"}
          className={`flex-1 px-4 py-3 rounded-lg font-medium text-sm border transition-colors ${
            currentMode === "live"
              ? "bg-gray-900 text-white border-gray-900 cursor-default"
              : "bg-white text-gray-900 border-gray-300 hover:bg-gray-50"
          } disabled:opacity-60`}
        >
          LIVE 모드로 전환
          {!liveReady && (
            <span className="block text-xs text-red-600 mt-0.5">
              키 미설정
            </span>
          )}
        </button>
      </div>

      {error && (
        <p className="mt-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
          {error}
        </p>
      )}
    </div>
  );
}
