"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "@/components/SessionProvider";
import { canAccessSellerFeatures, isAdmin, isSellerActive } from "@/lib/roles";
import { getSellerMode } from "@/lib/uiPrefs";
import HomeFeedViewToggle from "@/components/HomeFeedViewToggle";
import SellerModeToggle from "@/components/SellerModeToggle";
import MenuItem from "@/components/menu/MenuItem";
import MenuSection from "@/components/menu/MenuSection";
import CategoryPickerSheet from "@/components/CategoryPickerSheet";
import { MAIN_CATEGORIES, pushRecentCategory } from "@/lib/categories";

type DrawerProps = {
  open: boolean;
  onClose: () => void;
};

export default function Drawer({ open, onClose }: DrawerProps) {
  const pathname = usePathname();
  const prevPathname = useRef(pathname);
  const session = useSession();
  const router = useRouter();

  const [categorySheetOpen, setCategorySheetOpen] = useState(false);
  const [categoryRoot, setCategoryRoot] = useState<string | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [activeCategories, setActiveCategories] = useState<string[]>([]);

  const isSeller = session ? canAccessSellerFeatures(session.role) : false;
  const isAdminUser = session ? isAdmin(session.role) : false;
  const isSellerActiveUser = session ? isSellerActive(session.role) : false;

  const [sellerMode, setSellerModeState] = useState(false);

  useEffect(() => {
    if (isSellerActiveUser) {
      setSellerModeState(getSellerMode() === "seller");
    }

    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setSellerModeState(detail.mode === "seller");
    };
    window.addEventListener("sellerModeChange", handler);
    return () => window.removeEventListener("sellerModeChange", handler);
  }, [isSellerActiveUser]);

  // Close on route change (not on initial mount)
  useEffect(() => {
    if (prevPathname.current !== pathname) {
      prevPathname.current = pathname;
      onClose();
    }
  }, [pathname, onClose]);

  // Lock body scroll when open (preserve swipe gestures)
  useEffect(() => {
    if (open) {
      const scrollY = window.scrollY;
      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = "100%";
      return () => {
        document.body.style.position = "";
        document.body.style.top = "";
        document.body.style.width = "";
        window.scrollTo(0, scrollY);
      };
    }
  }, [open]);

  // Fetch active categories
  useEffect(() => {
    fetch('/api/categories/active')
      .then(res => res.json())
      .then(data => setActiveCategories(data))
      .catch(() => {});
  }, []);

  const handleCategorySelect = (category: {
    main: string;
    mid?: string;
    sub?: string;
  }) => {
    // Build URL based on selection depth
    let url = `/?main=${encodeURIComponent(category.main)}`;
    if (category.mid) {
      url += `&mid=${encodeURIComponent(category.mid)}`;
    }
    if (category.sub) {
      url += `&sub=${encodeURIComponent(category.sub)}`;
    }

    // Navigate — sheet stays open for continued browsing
    // pathname doesn't change (all queries on /), so Drawer's
    // route-change listener won't fire → sheet remains open
    router.push(url);
  };

  const openCategorySheet = (root: string) => {
    setCategoryRoot(root);
    setCategorySheetOpen(true);
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    setShowLogoutConfirm(false);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/");
      router.refresh();
    } catch {
      setLoggingOut(false);
    }
  };

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
        <div className="px-4 pt-4 pb-3 flex items-start justify-between">
          <div className="flex-1 min-w-0">
            {session ? (
              <>
                {/* User name + role pill */}
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-[18px] font-semibold text-gray-900 leading-tight truncate">
                    {session.name || session.email || "사용자"}
                  </h2>
                  <span
                    className={`inline-block text-[11px] font-semibold px-2 py-[3px] rounded-full flex-shrink-0 ${
                      isAdminUser
                        ? "bg-red-50 text-red-600"
                        : isSeller
                        ? "bg-blue-50 text-blue-600"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {isAdminUser ? "관리자" : isSeller ? "판매자" : "일반"}
                  </span>
                </div>
                {/* Subtitle */}
                <p className="text-[13px] font-normal text-gray-500 mt-[2px]">
                  {isAdminUser
                    ? "플랫폼 관리자"
                    : isSeller
                    ? "판매자 계정"
                    : "일반 회원"}
                </p>
              </>
            ) : (
              <h2 className="text-[18px] font-semibold text-gray-900 leading-tight">
                mikro
              </h2>
            )}
          </div>

          {/* Close button */}
          <button
            onClick={onClose}
            className="w-10 h-10 grid place-items-center text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
            aria-label="닫기"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <nav
          className="overflow-y-auto h-[calc(100%-56px)] flex flex-col"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          {/* Home feed view toggle */}
          <HomeFeedViewToggle compact={isSellerActiveUser} />
          <SellerModeToggle onToggle={onClose} />

          {/* Navigation sections */}
          <div className="flex-1">
            {/* Login/Signup (only when not logged in) */}
            {!session && (
              <MenuSection title="계정">
                <MenuItem label="로그인" href="/login" isSubmenu />
                <MenuItem label="회원가입" href="/signup" isSubmenu />
              </MenuSection>
            )}

            {/* Seller Section - shown above browse when seller mode is ON */}
            {isSeller && session && sellerMode && (
              <MenuSection title="판매자">
                <MenuItem label="내 상점 보기" href={`/s/${session.userId}`} isSubmenu />
                <MenuItem label="대시보드" href="/seller" isSubmenu />
                <MenuItem label="상품 관리" href="/seller/products" isSubmenu />
                <MenuItem label="주문 관리" href="/seller/orders" isSubmenu />
              </MenuSection>
            )}

            {/* Browse Section */}
            <MenuSection title="둘러보기">
              {MAIN_CATEGORIES.filter(cat => activeCategories.includes(cat)).map(cat => (
                <MenuItem key={cat} label={cat} showChevron onClick={() => openCategorySheet(cat)} isSubmenu />
              ))}
              <MenuItem label="브랜드 보기" href="/brands" showChevron isSubmenu />
            </MenuSection>

            {/* Seller Section - shown below browse when seller mode is OFF */}
            {isSeller && session && !sellerMode && (
              <MenuSection title="판매자">
                <MenuItem label="내 상점 보기" href={`/s/${session.userId}`} isSubmenu />
                <MenuItem label="대시보드" href="/seller" isSubmenu />
                <MenuItem label="상품 관리" href="/seller/products" isSubmenu />
                <MenuItem label="주문 관리" href="/seller/orders" isSubmenu />
              </MenuSection>
            )}

            {/* Admin Section */}
            {isAdminUser && (
              <MenuSection title="관리자">
                <MenuItem label="플랫폼 관리" href="/admin" isSubmenu />
                <MenuItem label="판매자 승인" href="/admin/sellers" isSubmenu />
                <MenuItem label="주문 모니터링" href="/admin/orders" isSubmenu />
                <MenuItem label="분쟁 처리" href="/admin/disputes" isSubmenu />
              </MenuSection>
            )}

            {/* Info Section */}
            <MenuSection title="정보">
              <MenuItem label="이용약관" href="/policy/terms" isSubmenu />
              <MenuItem label="개인정보처리방침" href="/policy/privacy" isSubmenu />
              <MenuItem label="입점 안내" href="/apply" isSubmenu />
              {session && (
                <MenuItem
                  label={loggingOut ? "로그아웃 중..." : "로그아웃"}
                  onClick={() => setShowLogoutConfirm(true)}
                  isSubmenu
                />
              )}
            </MenuSection>
          </div>
        </nav>

        {/* Logout Confirm Modal */}
        {showLogoutConfirm && (
          <>
            {/* Overlay */}
            <div
              className="fixed inset-0 z-[100] bg-black/40"
              onClick={() => setShowLogoutConfirm(false)}
            />

            {/* Modal */}
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl max-w-[280px] w-full overflow-hidden">
                <div className="p-6 text-center">
                  <h3 className="text-[17px] font-bold text-gray-900 mb-2">
                    로그아웃 하시겠어요?
                  </h3>
                </div>

                <div className="grid grid-cols-2 border-t border-gray-200">
                  <button
                    onClick={() => setShowLogoutConfirm(false)}
                    className="h-12 text-[16px] font-medium text-gray-600 active:bg-gray-50"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleLogout}
                    disabled={loggingOut}
                    className="h-12 text-[16px] font-bold text-red-600 active:bg-gray-50 border-l border-gray-200 disabled:opacity-50"
                  >
                    {loggingOut ? "로그아웃 중..." : "로그아웃"}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </aside>

      {/* Category Picker Sheet */}
      <CategoryPickerSheet
        open={categorySheetOpen}
        onClose={() => setCategorySheetOpen(false)}
        initialMain={categoryRoot}
        initialMid={null}
        initialSub={null}
        onChange={handleCategorySelect}
      />
    </>
  );
}
