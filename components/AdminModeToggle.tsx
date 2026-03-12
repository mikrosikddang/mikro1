"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/components/SessionProvider";
import { isAdmin } from "@/lib/roles";
import { getAdminMode, setAdminMode, type AdminMode } from "@/lib/uiPrefs";

type AdminModeToggleProps = {
  onToggle?: () => void;
};

export default function AdminModeToggle({ onToggle }: AdminModeToggleProps) {
  const session = useSession();
  const router = useRouter();
  const [mode, setMode] = useState<AdminMode>("user");
  const [mounted, setMounted] = useState(false);

  const isAdminUser = session ? isAdmin(session.role) : false;

  useEffect(() => {
    setMode(getAdminMode());
    setMounted(true);
  }, []);

  if (!isAdminUser) return null;

  const isOn = mode === "admin";

  const handleToggle = () => {
    const nextMode: AdminMode = isOn ? "user" : "admin";
    setMode(nextMode);
    setAdminMode(nextMode);

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("adminModeChange", { detail: { mode: nextMode } }),
      );
    }

    router.push(nextMode === "admin" ? "/admin" : "/");
    onToggle?.();
  };

  if (!mounted) {
    return (
      <div className="mx-4 mt-3 mb-4">
        <div className="h-10 rounded-2xl border border-gray-100 bg-gray-50 px-3" />
      </div>
    );
  }

  return (
    <div className="mx-4 mt-3 mb-4">
      <button
        type="button"
        onClick={handleToggle}
        className="flex h-10 w-full items-center justify-between rounded-2xl border border-gray-100 bg-gray-50 px-3 transition-colors active:bg-gray-100"
      >
        <span className="text-[14px] font-medium text-gray-700">어드민 모드</span>
        <div
          className={`relative h-5 w-9 rounded-full transition-colors ${
            isOn ? "bg-red-600" : "bg-gray-300"
          }`}
        >
          <div
            className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
              isOn ? "translate-x-[18px]" : "translate-x-0.5"
            }`}
          />
        </div>
      </button>
    </div>
  );
}
