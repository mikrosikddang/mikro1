"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "@/components/SessionProvider";
import LogoutButton from "@/components/LogoutButton";
import { canAccessSellerFeatures, isAdmin } from "@/lib/roles";
import HomeFeedViewToggle from "@/components/HomeFeedViewToggle";

type DrawerProps = {
  open: boolean;
  onClose: () => void;
};

type NavigationGroup = {
  id: string;
  label: string;
  adminOnly?: boolean;
  sellerOnly?: boolean;
  items: { label: string; href: string }[];
};

const navigationGroups: NavigationGroup[] = [
  {
    id: "browse",
    label: "BROWSE",
    items: [
      { label: "바지", href: "/?category=pants" },
      { label: "아우터", href: "/?category=outer" },
      { label: "반팔티", href: "/?category=short" },
      { label: "긴팔티", href: "/?category=long" },
      { label: "니트", href: "/?category=knit" },
      { label: "브랜드 보기", href: "/brands" },
    ],
  },
  {
    id: "seller",
    label: "SELLER",
    sellerOnly: true,
    items: [
      { label: "대시보드", href: "/seller" },
      { label: "상품 관리", href: "/seller/products" },
      { label: "주문 관리", href: "/seller/orders" },
    ],
  },
  {
    id: "admin",
    label: "ADMIN",
    adminOnly: true,
    items: [
      { label: "플랫폼 관리", href: "/admin" },
      { label: "판매자 승인", href: "/admin/sellers" },
      { label: "주문 모니터링", href: "/admin/orders" },
      { label: "분쟁 처리", href: "/admin/disputes" },
    ],
  },
  {
    id: "info",
    label: "INFORMATION",
    items: [
      { label: "이용약관", href: "/policy/terms" },
      { label: "개인정보처리방침", href: "/policy/privacy" },
      { label: "입점 안내", href: "/apply" },
    ],
  },
];

export default function Drawer({ open, onClose }: DrawerProps) {
  const pathname = usePathname();
  const prevPathname = useRef(pathname);
  const session = useSession();

  const isSeller = session ? canAccessSellerFeatures(session.role) : false;
  const isAdminUser = session ? isAdmin(session.role) : false;

  // Close on route change (not on initial mount)
  useEffect(() => {
    if (prevPathname.current !== pathname) {
      prevPathname.current = pathname;
      onClose();
    }
  }, [pathname, onClose]);

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const visibleGroups = navigationGroups.filter((g) => {
    if (g.adminOnly) return isAdminUser;
    if (g.sellerOnly) return isSeller;
    return true;
  });

  return (
    <>
      {/* Overlay - softer backdrop */}
      <div
        className={`fixed inset-0 z-[60] bg-black/30 transition-opacity duration-200 ease-out ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer panel - brand navigation feel */}
      <aside
        aria-hidden={!open}
        className={`fixed top-0 right-0 z-[70] h-full w-[85%] max-w-[360px] bg-white shadow-lg transition-transform duration-200 ease-out ${
          !open ? "pointer-events-none" : ""
        }`}
        style={{ transform: open ? "translateX(0)" : "translateX(100%)" }}
      >
        {/* Header - 56px height, brand identity */}
        <div className="flex items-center justify-between px-6 h-14 border-b border-gray-100">
          <span className="text-[15px] font-semibold tracking-tight text-black">
            mikro
          </span>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-black transition-colors"
            aria-label="닫기"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content - clean hierarchy */}
        <nav className="overflow-y-auto h-[calc(100%-56px)] pb-10 flex flex-col">
          {/* Home feed view toggle - at top */}
          <HomeFeedViewToggle />

          {/* Login status - refined */}
          <div className="mt-3 mb-2 px-6">
            {session ? (
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center">
                  <span className="text-[13px]">
                    {isAdminUser ? "🛡️" : isSeller ? "🏪" : "👤"}
                  </span>
                </div>
                <span className="text-[13px] font-medium text-gray-700">
                  {isAdminUser
                    ? "관리자"
                    : canAccessSellerFeatures(session.role)
                      ? "판매자"
                      : "고객"}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  href="/login"
                  className="text-[14px] font-medium text-black hover:text-gray-600 transition-colors"
                >
                  로그인
                </Link>
                <span className="text-gray-300">·</span>
                <Link
                  href="/signup"
                  className="text-[14px] font-medium text-black hover:text-gray-600 transition-colors"
                >
                  회원가입
                </Link>
              </div>
            )}
          </div>

          {/* Navigation groups - clean sections */}
          <div className="flex-1">
            {visibleGroups.map((group) => (
              <div key={group.id} className="mt-6 first:mt-4">
                {/* Section header - uppercase, spaced */}
                <h3 className="text-[11px] uppercase tracking-widest text-gray-400 font-medium mb-3 px-1">
                  {group.label}
                </h3>

                {/* Menu items - no borders, clean hierarchy */}
                <div className="space-y-0.5">
                  {group.items.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="block px-3 py-2.5 text-[16px] font-medium text-gray-900 hover:text-black hover:bg-gray-50 rounded-md transition-all leading-none"
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Logout - minimal divider, refined button */}
          {session && (
            <div className="mt-8 pt-6 border-t border-gray-100">
              <LogoutButton variant="drawer" />
            </div>
          )}
        </nav>
      </aside>
    </>
  );
}
