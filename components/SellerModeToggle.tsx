"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/components/SessionProvider";
import { canAccessSellerFeatures } from "@/lib/roles";
import {
  getAdminMode,
  getSellerMode,
  setAdminMode,
  setSellerMode,
  type SellerMode,
} from "@/lib/uiPrefs";

type SellerModeToggleProps = {
  onToggle?: () => void;
};

export default function SellerModeToggle({ onToggle }: SellerModeToggleProps) {
  const session = useSession();
  const router = useRouter();
  const [mode, setMode] = useState<SellerMode>("buyer");
  const [mounted, setMounted] = useState(false);

  const canUseSellerView = session ? canAccessSellerFeatures(session.role) : false;

  useEffect(() => {
    setMode(getSellerMode());
    setMounted(true);
  }, []);

  if (!canUseSellerView) return null;

  const isOn = mode === "seller";

  const handleToggle = () => {
    const newMode: SellerMode = isOn ? "buyer" : "seller";
    setMode(newMode);
    setSellerMode(newMode);

    // Seller view should not keep admin navigation active.
    if (getAdminMode() === "admin") {
      setAdminMode("user");
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("adminModeChange", { detail: { mode: "user" } })
        );
      }
    }

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("sellerModeChange", { detail: { mode: newMode } })
      );
    }

    if (newMode === "seller") {
      router.push("/seller");
    } else {
      router.push("/");
    }

    onToggle?.();
  };

  if (!mounted) {
    return (
      <div className="mx-4 mt-1 mb-3">
        <div className="h-10 px-3 rounded-2xl bg-gray-50 border border-gray-100" />
      </div>
    );
  }

  return (
    <div className="mx-4 mt-1 mb-3">
      <button
        type="button"
        onClick={handleToggle}
        className="w-full h-10 px-3 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-between active:bg-gray-100 transition-colors"
      >
        <span className="text-[14px] font-medium text-gray-700">
          판매자 모드
        </span>

        <div
          className={`relative w-9 h-5 rounded-full transition-colors ${
            isOn ? "bg-black" : "bg-gray-300"
          }`}
        >
          <div
            className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
              isOn ? "translate-x-[18px]" : "translate-x-0.5"
            }`}
          />
        </div>
      </button>
    </div>
  );
}
