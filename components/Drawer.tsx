"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "@/components/SessionProvider";
import LogoutButton from "@/components/LogoutButton";
import { canAccessSellerFeatures } from "@/lib/roles";

type DrawerProps = {
  open: boolean;
  onClose: () => void;
};

type Section = {
  title: string;
  links: { label: string; href: string }[];
  sellerOnly?: boolean;
};

const sections: Section[] = [
  {
    title: "카테고리",
    links: [
      { label: "바지", href: "/?category=pants" },
      { label: "아우터", href: "/?category=outer" },
      { label: "반팔티", href: "/?category=short" },
      { label: "긴팔티", href: "/?category=long" },
      { label: "니트", href: "/?category=knit" },
    ],
  },
  {
    title: "브랜드",
    links: [{ label: "브랜드 보기", href: "/brands" }],
  },
  {
    title: "판매자",
    links: [
      { label: "대시보드", href: "/seller" },
      { label: "상품 관리", href: "/seller/products" },
      { label: "주문 관리", href: "/seller/orders" },
    ],
    sellerOnly: true,
  },
  {
    title: "정책",
    links: [
      { label: "이용약관", href: "/policy/terms" },
      { label: "개인정보처리방침", href: "/policy/privacy" },
    ],
  },
  {
    title: "입점/광고",
    links: [{ label: "입점 안내", href: "/apply" }],
  },
];

export default function Drawer({ open, onClose }: DrawerProps) {
  const pathname = usePathname();
  const prevPathname = useRef(pathname);
  const session = useSession();

  const isSeller = session ? canAccessSellerFeatures(session.role) : false;

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

  const visibleSections = sections.filter(
    (s) => !s.sellerOnly || isSeller,
  );

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 z-[60] bg-black/40 transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <aside
        aria-hidden={!open}
        className={`fixed top-0 right-0 z-[70] h-full w-[85%] max-w-[360px] bg-white shadow-xl transition-transform duration-300 ease-in-out ${
          !open ? "pointer-events-none" : ""
        }`}
        style={{ transform: open ? "translateX(0)" : "translateX(100%)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 h-[52px] border-b border-gray-100">
          <span className="text-[16px] font-bold">메뉴</span>
          <button
            onClick={onClose}
            className="p-1"
            aria-label="닫기"
          >
            <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <nav className="overflow-y-auto h-[calc(100%-52px)] px-5 pb-10 flex flex-col">
          {/* Login status */}
          <div className="mt-4 mb-2 px-1">
            {session ? (
              <div className="flex items-center gap-2">
                <span className="text-[13px] text-gray-500">
                  {canAccessSellerFeatures(session.role) ? "🏪 판매자" : "👤 고객"}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  href="/login"
                  className="text-[13px] font-medium text-black underline"
                >
                  로그인
                </Link>
                <span className="text-gray-300">|</span>
                <Link
                  href="/signup"
                  className="text-[13px] font-medium text-black underline"
                >
                  회원가입
                </Link>
              </div>
            )}
          </div>

          {/* Menu sections */}
          <div className="flex-1">
            {visibleSections.map((section) => (
              <div key={section.title}>
                <h3 className="text-xs uppercase text-gray-400 mt-6 mb-2 tracking-wide">
                  {section.title}
                </h3>
                {section.links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="block py-3 border-b border-gray-50 text-base text-gray-800 active:text-black transition-colors"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            ))}
          </div>

          {/* Logout button at bottom - logged in users only */}
          {session && (
            <div className="mt-6 pt-6 border-t border-gray-100">
              <LogoutButton variant="drawer" />
            </div>
          )}
        </nav>
      </aside>
    </>
  );
}
