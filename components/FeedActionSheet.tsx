"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/components/SessionProvider";

type FeedActionSheetProps = {
  triggerRef?: React.RefObject<HTMLElement | null>;
  productId: string;
  sellerId: string;
  shopName: string;
  onClose: () => void;
  // Wishlist 상태 및 토글
  wishlisted: boolean;
  onWishlistToggle: () => void;
  // 프로필 편집 콜백 (self only)
  onProfileEdit?: () => void;
  // 게시물 숨기기 콜백
  onHide?: () => void;
};

export default function FeedActionSheet({
  triggerRef,
  productId,
  sellerId,
  shopName,
  onClose,
  wishlisted,
  onWishlistToggle,
  onProfileEdit,
  onHide,
}: FeedActionSheetProps) {
  const router = useRouter();
  const session = useSession();
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isSelf = session ? session.userId === sellerId : false;

  // 팔로우 상태 조회 (non-self만)
  const checkFollowStatus = useCallback(async () => {
    if (!session || isSelf) return;

    try {
      const res = await fetch(`/api/sellers/${sellerId}/follow`);
      if (res.ok) {
        const data = await res.json();
        setFollowing(data.followed);
      }
    } catch (error) {
      console.error("Failed to check follow status:", error);
    }
  }, [session, sellerId, isSelf]);

  // 팝오버 열릴 때 팔로우 상태 확인
  useEffect(() => {
    checkFollowStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // followChange 이벤트 동기화
  useEffect(() => {
    const handleFollowChange = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail.sellerId === sellerId) {
        setFollowing(detail.followed);
      }
    };
    window.addEventListener("followChange", handleFollowChange);
    return () => window.removeEventListener("followChange", handleFollowChange);
  }, [sellerId]);

  // 바깥 클릭 시 닫기 (trigger 버튼 제외 — 토글로 처리)
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (menuRef.current && !menuRef.current.contains(target)
          && !(triggerRef?.current?.contains(target))) {
        onClose();
      }
    };
    // requestAnimationFrame to avoid closing on the same click that opened it
    const id = requestAnimationFrame(() => {
      document.addEventListener("mousedown", handleClickOutside);
    });
    return () => {
      cancelAnimationFrame(id);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose, triggerRef]);

  // ESC key to close
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  // 팔로우/언팔로우 토글
  const handleFollowToggle = useCallback(async () => {
    if (!session) {
      router.push(`/login?next=/`);
      onClose();
      return;
    }

    setLoading(true);
    try {
      const method = following ? "DELETE" : "POST";
      const res = await fetch(`/api/sellers/${sellerId}/follow`, { method });

      if (!res.ok) {
        const data = await res.json();
        if (res.status === 409) {
          alert("자신을 팔로우할 수 없습니다");
        } else {
          alert(data.error || "오류가 발생했습니다");
        }
        return;
      }

      const data = await res.json();
      setFollowing(data.followed);
      window.dispatchEvent(
        new CustomEvent("followChange", { detail: { sellerId, followed: data.followed } })
      );
    } catch (error) {
      console.error("Failed to toggle follow:", error);
      alert("오류가 발생했습니다");
    } finally {
      setLoading(false);
    }
  }, [session, sellerId, following, router, onClose]);

  // 즐겨찾기 토글
  const handleWishlistToggle = useCallback(() => {
    if (!session) {
      router.push(`/login?next=/`);
      onClose();
      return;
    }

    onWishlistToggle();
    onClose();
  }, [session, onWishlistToggle, router, onClose]);

  // 업체 정보 보기
  const handleViewShop = useCallback(() => {
    router.push(`/s/${sellerId}`);
    onClose();
  }, [sellerId, router, onClose]);

  // 프로필 편집 (self only)
  const handleProfileEdit = useCallback(() => {
    if (onProfileEdit) {
      onProfileEdit();
    }
    onClose();
  }, [onProfileEdit, onClose]);

  // 게시물 숨기기
  const handleHide = useCallback(async () => {
    try {
      await fetch("/api/feed/hide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });
    } catch {
      // silently fail — UI hides regardless
    }
    if (onHide) onHide();
    onClose();
  }, [productId, onHide, onClose]);

  const itemClass =
    "w-full px-4 py-2.5 flex items-center gap-2.5 text-left text-[14px] text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <div
      ref={menuRef}
      className="absolute right-0 top-full mt-1 z-30 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1.5 overflow-hidden"
    >
      {/* self: 프로필 편집 / non-self: 팔로우/언팔로우 */}
      {isSelf ? (
        <button
          type="button"
          onClick={handleProfileEdit}
          disabled={loading}
          className={itemClass}
        >
          <svg className="w-4 h-4 text-gray-500 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
            />
          </svg>
          프로필 편집
        </button>
      ) : (
        <button
          type="button"
          onClick={handleFollowToggle}
          disabled={loading}
          className={itemClass}
        >
          <svg className="w-4 h-4 text-gray-500 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d={
                following
                  ? "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  : "M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
              }
            />
          </svg>
          {following ? "팔로잉" : "팔로우"}
        </button>
      )}

      {/* 포스팅 즐겨찾기 */}
      <button
        type="button"
        onClick={handleWishlistToggle}
        disabled={loading}
        className={itemClass}
      >
        <svg
          className={`w-4 h-4 shrink-0 ${wishlisted ? "text-red-500" : "text-gray-500"}`}
          fill={wishlisted ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth={wishlisted ? 0 : 2}
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
          />
        </svg>
        {wishlisted ? "즐겨찾기 해제" : "즐겨찾기"}
      </button>

      {/* 업체 정보 보기 */}
      <button
        type="button"
        onClick={handleViewShop}
        disabled={loading}
        className={itemClass}
      >
        <svg className="w-4 h-4 text-gray-500 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        업체 정보 보기
      </button>

      {/* 이 게시물 숨기기 (non-self only) */}
      {!isSelf && (
        <button
          type="button"
          onClick={handleHide}
          disabled={loading}
          className={itemClass}
        >
          <svg className="w-4 h-4 text-gray-500 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"
            />
          </svg>
          이 게시물 숨기기
        </button>
      )}
    </div>
  );
}
