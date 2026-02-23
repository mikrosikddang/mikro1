"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type LogoutButtonProps = {
  variant?: "default" | "drawer";
};

export default function LogoutButton({ variant = "default" }: LogoutButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  async function handleLogout() {
    setLoading(true);
    setShowConfirm(false);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/");
      router.refresh();
    } catch {
      setLoading(false);
    }
  }

  function openConfirm() {
    setShowConfirm(true);
  }

  function closeConfirm() {
    setShowConfirm(false);
  }

  if (variant === "drawer") {
    return (
      <>
        <button
          onClick={openConfirm}
          disabled={loading}
          className="w-full h-12 rounded-2xl bg-gray-100 text-gray-700 text-[16px] font-semibold active:bg-gray-200 transition-colors disabled:opacity-50"
        >
          {loading ? "로그아웃 중..." : "로그아웃"}
        </button>

        {/* Confirm Modal */}
        {showConfirm && (
          <>
            {/* Overlay */}
            <div
              className="fixed inset-0 z-[100] bg-black/40"
              onClick={closeConfirm}
            />

            {/* Modal */}
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl max-w-[280px] w-full overflow-hidden">
                <div className="p-6 text-center">
                  <h3 className="text-[17px] font-bold text-gray-900 mb-2">
                    로그아웃 하시겠어요?
                  </h3>
                </div>

                <div className="grid grid-cols-2 border-t border-gray-200">
                  <button
                    onClick={closeConfirm}
                    className="h-12 text-[16px] font-medium text-gray-600 active:bg-gray-50"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleLogout}
                    disabled={loading}
                    className="h-12 text-[16px] font-bold text-red-600 active:bg-gray-50 border-l border-gray-200 disabled:opacity-50"
                  >
                    {loading ? "로그아웃 중..." : "로그아웃"}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </>
    );
  }

  return (
    <button
      onClick={openConfirm}
      disabled={loading}
      className="px-3 py-1.5 rounded-lg border border-gray-200 text-[12px] text-gray-500 active:bg-gray-100 transition-colors disabled:opacity-50"
    >
      {loading ? "..." : "로그아웃"}
    </button>
  );
}
