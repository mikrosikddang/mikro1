"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "@/components/SessionProvider";
import LogoutButton from "@/components/LogoutButton";
import { canAccessSellerFeatures, isAdmin } from "@/lib/roles";
import HomeFeedViewToggle from "@/components/HomeFeedViewToggle";
import MenuItem from "@/components/menu/MenuItem";
import MenuSection from "@/components/menu/MenuSection";
import MenuProfileRow from "@/components/menu/MenuProfileRow";

type DrawerProps = {
  open: boolean;
  onClose: () => void;
};

type NavigationGroup = {
  id: string;
  label: string;
  adminOnly?: boolean;
  sellerOnly?: boolean;
  items: { label: string; href: string; showChevron?: boolean }[];
};

const navigationGroups: NavigationGroup[] = [
  {
    id: "browse",
    label: "둘러보기",
    items: [
      { label: "여성의류", href: "/?main=여성의류" },
      { label: "남성의류", href: "/?main=남성의류" },
      { label: "브랜드 보기", href: "/brands", showChevron: true },
    ],
  },
  {
    id: "seller",
    label: "판매자",
    sellerOnly: true,
    items: [
      { label: "대시보드", href: "/seller" },
      { label: "상품 관리", href: "/seller/products" },
      { label: "주문 관리", href: "/seller/orders" },
    ],
  },
  {
    id: "admin",
    label: "관리자",
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
    label: "정보",
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
      {/* Overlay */}
      <div
        className={`fixed inset-0 z-[60] bg-black/30 transition-opacity duration-200 ease-out ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <aside
        aria-hidden={!open}
        className={`fixed top-0 right-0 z-[70] h-full w-[85%] max-w-[360px] bg-white shadow-lg transition-transform duration-200 ease-out ${
          !open ? "pointer-events-none" : ""
        }`}
        style={{ transform: open ? "translateX(0)" : "translateX(100%)" }}
      >
        {/* Header */}
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

        {/* Content */}
        <nav className="overflow-y-auto h-[calc(100%-56px)] flex flex-col" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
          {/* Home feed view toggle */}
          <HomeFeedViewToggle />

          {/* Profile / Login */}
          <MenuProfileRow />

          {/* Navigation sections */}
          <div className="flex-1">
            {visibleGroups.map((group) => (
              <MenuSection key={group.id} title={group.label}>
                {group.items.map((item) => (
                  <MenuItem
                    key={item.href}
                    label={item.label}
                    href={item.href}
                    showChevron={item.showChevron}
                  />
                ))}
              </MenuSection>
            ))}
          </div>

          {/* Logout */}
          {session && (
            <div className="mt-8 pt-6 border-t border-gray-100 px-4 pb-4">
              <LogoutButton variant="drawer" />
            </div>
          )}
        </nav>
      </aside>
    </>
  );
}
