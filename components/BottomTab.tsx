"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useSession } from "@/components/SessionProvider";
import { canAccessSellerFeatures, isAdmin } from "@/lib/roles";
import {
  getAdminMode,
  setAdminMode as persistAdminMode,
} from "@/lib/uiPrefs";

export default function BottomTab() {
  const pathname = usePathname();
  const session = useSession();
  const isAdminUser = session ? isAdmin(session.role) : false;
  const canUseSellerView = session ? canAccessSellerFeatures(session.role) : false;
  const spaceTabLabel = canUseSellerView ? "스토어" : "내 공간";

  const [adminMode, setAdminMode] = useState(false);
  const [spaceSlug, setSpaceSlug] = useState<string | null>(null);

  useEffect(() => {
    if (!session) {
      setSpaceSlug(null);
      return;
    }

    let cancelled = false;

    fetch("/api/space/profile")
      .then(async (res) => {
        if (!res.ok) return null;
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        setSpaceSlug(typeof data?.storeSlug === "string" ? data.storeSlug : null);
      })
      .catch(() => {
        if (!cancelled) setSpaceSlug(null);
      });

    return () => {
      cancelled = true;
    };
  }, [session]);

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
    { label: spaceTabLabel, href: "/space" },
    { label: "MY", href: "/my" },
  ];

  const sellerTabs = session
    ? [
        { label: "대시보드", href: "/seller" },
        { label: "상품관리", href: "/seller/products" },
        { label: "상품올리기", href: "/seller/products/new" },
        { label: "주문관리", href: "/seller/orders" },
        { label: "스토어", href: "/space" },
      ]
    : buyerTabs;

  const adminTabs = [
    { label: "관리자", href: "/admin" },
    { label: "판매자", href: "/admin/sellers" },
    { label: "캠페인", href: "/admin/campaigns" },
    { label: "주문", href: "/admin/orders" },
    { label: "분쟁", href: "/admin/disputes" },
  ];

  const inSellerCenter = pathname.startsWith("/seller");
  const tabs =
    adminMode && isAdminUser ? adminTabs : inSellerCenter && canUseSellerView ? sellerTabs : buyerTabs;

  // Hide bottom tab in admin area unless admin mode is on
  if (pathname.startsWith("/admin") && !(adminMode && isAdminUser)) {
    return null;
  }

  // Hide bottom tab inside chat room pages (they have their own UI)
  if (pathname.startsWith("/chat/")) {
    return null;
  }

  // Hide on /seller paths when the user cannot access seller center
  if (pathname.startsWith("/seller") && !canUseSellerView) {
    return null;
  }

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    if (href === "/space") {
      return (
        pathname === "/space" ||
        pathname.startsWith("/space/") ||
        (spaceSlug ? pathname === `/${spaceSlug}` : false)
      );
    }
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
          </Link>
        ))}
      </div>
    </nav>
  );
}
