"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/components/SessionProvider";
import ActionSheet, { ActionSheetItem } from "@/components/ActionSheet";

type FeedActionSheetProps = {
  productId: string;
  sellerId: string;
  shopName: string;
  onClose: () => void;
  // Wishlist 상태 및 토글
  wishlisted: boolean;
  onWishlistToggle: () => void;
  // 프로필 편집 콜백 (self only)
  onProfileEdit?: () => void;
};

export default function FeedActionSheet({
  productId,
  sellerId,
  shopName,
  onClose,
  wishlisted,
  onWishlistToggle,
  onProfileEdit,
}: FeedActionSheetProps) {
  const router = useRouter();
  const session = useSession();
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(false);

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

  // 시트 열릴 때 팔로우 상태 확인
  useEffect(() => {
    checkFollowStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  return (
    <ActionSheet open={true} onClose={onClose} title={shopName}>
      {/* self: 프로필 편집 / non-self: 팔로우/언팔로우 */}
      {isSelf ? (
        <ActionSheetItem
          label="프로필 편집"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
          }
          onClick={handleProfileEdit}
          disabled={loading}
        />
      ) : (
        <ActionSheetItem
          label={following ? "팔로우 취소" : "팔로우"}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d={
                  following
                    ? "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" // user icon
                    : "M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" // user-add icon
                }
              />
            </svg>
          }
          onClick={handleFollowToggle}
          disabled={loading}
        />
      )}

      {/* 포스팅 즐겨찾기 */}
      <ActionSheetItem
        label={wishlisted ? "즐겨찾기 해제" : "즐겨찾기"}
        icon={
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
            />
          </svg>
        }
        onClick={handleWishlistToggle}
        disabled={loading}
      />

      {/* 업체 정보 보기 */}
      <ActionSheetItem
        label="업체 정보 보기"
        icon={
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        }
        onClick={handleViewShop}
        disabled={loading}
      />
    </ActionSheet>
  );
}
