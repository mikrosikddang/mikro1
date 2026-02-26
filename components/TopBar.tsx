"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "@/components/SessionProvider";
import Drawer from "@/components/Drawer";
import NotificationBadge from "@/components/NotificationBadge";

export default function TopBar() {
  const session = useSession();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [cartCount, setCartCount] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const loadCartCount = useCallback(async () => {
    if (!session) {
      setCartCount(0);
      return;
    }
    try {
      const res = await fetch("/api/cart");
      if (!res.ok) return;
      const data = await res.json();
      setCartCount(Array.isArray(data) ? data.length : 0);
    } catch {
      // silently fail
    }
  }, [session]);

  useEffect(() => {
    loadCartCount();
    window.addEventListener("cart-change", loadCartCount);
    return () => window.removeEventListener("cart-change", loadCartCount);
  }, [loadCartCount]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      searchInputRef.current?.blur();
    }
  };

  const handleSearchClear = () => {
    setSearchQuery("");
    searchInputRef.current?.focus();
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-100">
        <div className="mx-auto w-full max-w-[420px] flex items-center gap-2 px-4 h-[52px]">
          {/* Logo */}
          <Link href="/" className="text-[22px] font-extrabold tracking-tight shrink-0">
            mikro
          </Link>

          {/* Search bar */}
          <form onSubmit={handleSearchSubmit} className="flex-1">
            <div
              className={`h-9 bg-gray-100 rounded-lg flex items-center px-3 transition-colors ${
                searchFocused ? "bg-gray-200" : ""
              }`}
            >
              <svg
                className="w-4 h-4 text-gray-400 shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                placeholder="검색"
                className="flex-1 ml-2 text-sm bg-transparent outline-none placeholder:text-gray-400 text-gray-900"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={handleSearchClear}
                  className="ml-1 w-4 h-4 flex items-center justify-center text-gray-400 hover:text-gray-600"
                  aria-label="검색어 지우기"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              )}
            </div>
          </form>

          {/* Icons group */}
          <div className="flex items-center gap-0.5 shrink-0 -mr-1.5">
            {/* Notifications */}
            <Link
              href="/notifications"
              className="p-2 relative"
              aria-label="알림"
            >
              <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <NotificationBadge />
            </Link>

            {/* Cart (shown only when items exist) */}
            {cartCount > 0 && (
              <Link
                href="/cart"
                className="p-2"
                aria-label="장바구니"
              >
                <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </Link>
            )}

            {/* Hamburger menu */}
            <button
              className="p-2"
              aria-label="메뉴"
              onClick={() => setDrawerOpen(true)}
            >
              <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
}
