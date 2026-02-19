"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { label: "홈", href: "/" },
  { label: "관심", href: "/wishlist" },
  { label: "뉴스", href: "/news" },
  { label: "채팅", href: "/chat" },
  { label: "MY", href: "/my" },
];

export default function BottomTab() {
  const pathname = usePathname();

  // Hide bottom tab in seller center and admin area
  if (pathname.startsWith('/seller') || pathname.startsWith('/admin')) {
    return null;
  }

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
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
            <span className={`text-[13px] ${isActive(tab.href) ? "font-bold" : "font-medium"}`}>
              {tab.label}
            </span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
