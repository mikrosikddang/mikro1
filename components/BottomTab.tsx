"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useSession } from "@/components/SessionProvider";
import { isSellerActive } from "@/lib/roles";
import { getSellerMode, setSellerMode as persistSellerMode } from "@/lib/uiPrefs";

export default function BottomTab() {
  const pathname = usePathname();
  const session = useSession();
  const isSellerActiveUser = session ? isSellerActive(session.role) : false;

  const [sellerMode, setSellerMode] = useState(false);

  useEffect(() => {
    if (isSellerActiveUser) {
      setSellerMode(getSellerMode() === "seller");
    }

    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setSellerMode(detail.mode === "seller");
    };
    window.addEventListener("sellerModeChange", handler);
    return () => window.removeEventListener("sellerModeChange", handler);
  }, [isSellerActiveUser]);

  // Auto-activate seller mode when navigating to /seller paths
  useEffect(() => {
    if (isSellerActiveUser && pathname.startsWith("/seller") && !sellerMode) {
      setSellerMode(true);
      persistSellerMode("seller");
      window.dispatchEvent(
        new CustomEvent("sellerModeChange", { detail: { mode: "seller" } })
      );
    }
  }, [pathname, isSellerActiveUser, sellerMode]);

  const buyerTabs = [
    { label: "홈", href: "/" },
    { label: "관심", href: "/wishlist" },
    { label: "채팅", href: "/chat" },
    { label: "MY", href: "/my" },
  ];

  const sellerTabs = session
    ? [
        { label: "대시보드", href: "/seller" },
        { label: "상품관리", href: "/seller/products" },
        { label: "상품올리기", href: "/seller/products/new" },
        { label: "주문관리", href: "/seller/orders" },
        { label: "내 상점", href: `/s/${session.userId}` },
      ]
    : buyerTabs;

  const tabs = sellerMode ? sellerTabs : buyerTabs;

  // Hide bottom tab in admin area (seller pages are shown when seller mode is on)
  if (pathname.startsWith("/admin")) {
    return null;
  }

  // Hide on /seller paths only when NOT in seller mode
  if (pathname.startsWith("/seller") && !sellerMode) {
    return null;
  }

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    // For /seller exact match (dashboard)
    if (href === "/seller") return pathname === "/seller";
    return pathname.startsWith(href);
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100">
      <div className="mx-auto w-full max-w-[420px] flex items-center justify-around h-[52px]">
        {tabs.map((tab) => (
          <Link
            key={tab.label}
            href={tab.href}
            className={`flex flex-col items-center justify-center gap-0.5 text-xs transition-colors ${
              isActive(tab.href)
                ? "text-black"
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            <span
              className={`text-[13px] ${isActive(tab.href) ? "font-bold" : "font-medium"}`}
            >
              {tab.label}
            </span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
