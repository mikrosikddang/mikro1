"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useSession } from "@/components/SessionProvider";
import { isAdmin, isSellerActive } from "@/lib/roles";
import {
  getAdminMode,
  getSellerMode,
  setAdminMode as persistAdminMode,
  setSellerMode as persistSellerMode,
} from "@/lib/uiPrefs";

export default function BottomTab() {
  const pathname = usePathname();
  const session = useSession();
  const isSellerActiveUser = session ? isSellerActive(session.role) : false;
  const isAdminUser = session ? isAdmin(session.role) : false;

  const [sellerMode, setSellerMode] = useState(false);
  const [adminMode, setAdminMode] = useState(false);
  const [chatUnread, setChatUnread] = useState(0);

  // Poll chat unread count
  useEffect(() => {
    if (!session) return;

    const loadUnread = async () => {
      try {
        const res = await fetch("/api/chat/unread-count");
        if (!res.ok) return;
        const data = await res.json();
        setChatUnread(data.count ?? 0);
      } catch {
        // silently fail
      }
    };

    loadUnread();
    const interval = setInterval(loadUnread, 5000);
    return () => clearInterval(interval);
  }, [session]);

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

  useEffect(() => {
    if (isAdminUser) {
      setAdminMode(getAdminMode() === "admin");
    }

    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setAdminMode(detail.mode === "admin");
    };
    window.addEventListener("adminModeChange", handler);
    return () => window.removeEventListener("adminModeChange", handler);
  }, [isAdminUser]);

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

  useEffect(() => {
    if (isAdminUser && pathname.startsWith("/admin") && !adminMode) {
      setAdminMode(true);
      persistAdminMode("admin");
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("adminModeChange", { detail: { mode: "admin" } }),
        );
      }
    }
  }, [pathname, isAdminUser, adminMode]);

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

  const adminTabs = [
    { label: "관리자", href: "/admin" },
    { label: "판매자", href: "/admin/sellers" },
    { label: "캠페인", href: "/admin/campaigns" },
    { label: "주문", href: "/admin/orders" },
    { label: "분쟁", href: "/admin/disputes" },
  ];

  const tabs = adminMode && isAdminUser ? adminTabs : sellerMode ? sellerTabs : buyerTabs;

  // Hide bottom tab in admin area unless admin mode is on
  if (pathname.startsWith("/admin") && !(adminMode && isAdminUser)) {
    return null;
  }

  // Hide bottom tab inside chat room pages (they have their own UI)
  if (pathname.startsWith("/chat/")) {
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
            className={`relative flex flex-col items-center justify-center gap-0.5 text-xs transition-colors ${
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
            {tab.href === "/chat" && chatUnread > 0 && (
              <span className="absolute -top-0.5 right-0 min-w-[16px] h-4 px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {chatUnread > 99 ? "99+" : chatUnread}
              </span>
            )}
          </Link>
        ))}
      </div>
    </nav>
  );
}
