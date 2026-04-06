"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/components/SessionProvider";
import { isAdmin } from "@/lib/roles";
import {
  getAdminViewMode,
  setAdminViewMode,
  type AdminViewMode,
} from "@/lib/uiPrefs";

type AdminModeToggleProps = {
  onToggle?: () => void;
};

export default function AdminModeToggle({ onToggle }: AdminModeToggleProps) {
  const session = useSession();
  const router = useRouter();
  const [mode, setMode] = useState<AdminViewMode>("user");
  const [mounted, setMounted] = useState(false);

  const isAdminUser = session ? isAdmin(session.role) : false;

  useEffect(() => {
    setMode(getAdminViewMode());
    setMounted(true);
  }, []);

  if (!isAdminUser) return null;

  if (!mounted) {
    return (
      <div className="mx-4 mt-3 mb-4">
        <div className="h-[76px] rounded-2xl border border-gray-100 bg-gray-50 px-3" />
      </div>
    );
  }

  const handleSelect = (nextMode: AdminViewMode) => {
    if (mode === nextMode) return;

    setMode(nextMode);
    setAdminViewMode(nextMode);

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("adminModeChange", {
          detail: { mode: nextMode === "admin" ? "admin" : "user" },
        }),
      );
      window.dispatchEvent(
        new CustomEvent("sellerModeChange", {
          detail: { mode: nextMode === "seller" ? "seller" : "buyer" },
        }),
      );
    }

    router.push(nextMode === "admin" ? "/admin" : nextMode === "seller" ? "/seller" : "/");
    onToggle?.();
  };

  const modes: { id: AdminViewMode; label: string }[] = [
    { id: "user", label: "일반 유저" },
    { id: "seller", label: "셀러" },
    { id: "admin", label: "관리자" },
  ];

  return (
    <div className="mx-4 mt-3 mb-4">
      <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
        <p className="mb-2 text-[13px] font-medium text-gray-700">관리자 보기 모드</p>
        <div className="grid grid-cols-3 gap-2">
          {modes.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => handleSelect(option.id)}
              className={`h-10 rounded-xl border text-[13px] font-medium transition-colors ${
                mode === option.id
                  ? option.id === "admin"
                    ? "border-red-600 bg-red-600 text-white"
                    : "border-black bg-black text-white"
                  : "border-gray-200 bg-white text-gray-600"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
