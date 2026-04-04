/**
 * Instagram-style seller shop header
 * Features: avatar, shop info, follow/edit buttons, follower counts (self only)
 */

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { type SocialChannelType } from "@prisma/client";
import { useSession } from "@/components/SessionProvider";
import FollowButton from "@/components/FollowButton";
import ProfileEditSheet from "@/components/ProfileEditSheet";
import { getHomeFeedViewMode, setHomeFeedViewMode, type HomeFeedViewMode } from "@/lib/uiPrefs";
import { canAccessSellerFeatures, isCustomer } from "@/lib/roles";
import { socialChannelLabel } from "@/lib/sellerTypes";

export interface SellerShopHeaderProps {
  sellerId: string;
  shopName: string;
  bio?: string | null;
  avatarUrl?: string | null;
  socialChannelType?: SocialChannelType | null;
  socialChannelUrl?: string | null;
}

export default function SellerShopHeader({
  sellerId,
  shopName,
  bio,
  avatarUrl,
  socialChannelType,
  socialChannelUrl,
}: SellerShopHeaderProps) {
  const session = useSession();
  const isSelf = session ? session.userId === sellerId : false;
  const canUseSellerView = session ? canAccessSellerFeatures(session.role) : false;
  const isCustomerView = session ? isCustomer(session.role) : false;
  const selfUploadLabel = canUseSellerView ? "상품 올리기" : "사진 올리기";
  const selfUploadHref = canUseSellerView ? "/seller/products/new" : "/space/posts/new";
  const shareTextLabel = canUseSellerView ? "스토어 프로필" : "공간 프로필";

  const [profileEditOpen, setProfileEditOpen] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [viewMode, setViewMode] = useState<HomeFeedViewMode>(() => {
    if (typeof window === "undefined") return "feed";
    return getHomeFeedViewMode();
  });

  useEffect(() => {
    const handleViewModeChange = (event: CustomEvent<{ mode: HomeFeedViewMode }>) => {
      setViewMode(event.detail.mode);
    };
    window.addEventListener("homeFeedViewModeChange", handleViewModeChange as EventListener);
    return () => {
      window.removeEventListener("homeFeedViewModeChange", handleViewModeChange as EventListener);
    };
  }, []);

  const handleToggleViewMode = () => {
    const nextMode: HomeFeedViewMode = viewMode === "feed" ? "carrot" : "feed";
    setHomeFeedViewMode(nextMode);
    setViewMode(nextMode);
    window.dispatchEvent(new CustomEvent("homeFeedViewModeChange", { detail: { mode: nextMode } }));
  };

  const handleShareProfile = async () => {
    const profileUrl = window.location.href;
    const shareData = {
      title: shopName,
      text: `${shopName} ${shareTextLabel}`,
      url: profileUrl,
    };

    try {
      if (navigator.share && navigator.canShare?.(shareData)) {
        await navigator.share(shareData);
        return;
      }
      await navigator.clipboard.writeText(profileUrl);
      alert("프로필 링크가 복사되었습니다");
    } catch {
      alert("프로필 공유에 실패했습니다");
    }
  };

  return (
    <>
      <div className="py-6 border-b border-gray-200 mb-6">
        {/* Avatar + Shop Info Row */}
        <div className="flex gap-4 mb-4">
          {/* Avatar */}
          <div className="flex-shrink-0">
            {avatarUrl && !imgError ? (
              <img
                src={avatarUrl}
                alt={shopName}
                className="w-20 h-20 rounded-full object-cover bg-gray-100"
                onError={() => setImgError(true)}
              />
            ) : (
              <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center text-[24px] font-bold text-gray-500">
                {shopName.charAt(0)}
              </div>
            )}
          </div>

          {/* Shop Info */}
          <div className="flex-1 min-w-0">
            <h1 className="text-[16px] font-bold text-black mb-1">
              {shopName}
            </h1>
            {bio && (
              <p className="text-[14px] text-gray-700 leading-relaxed whitespace-pre-wrap mb-2">
                {bio}
              </p>
            )}
            {socialChannelType && socialChannelUrl && (
              <a
                href={socialChannelUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[13px] font-medium text-blue-600 underline underline-offset-2"
              >
                {socialChannelLabel(socialChannelType)}
                <span aria-hidden="true">↗</span>
              </a>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          {isSelf ? (
            <>
              <button
                type="button"
                onClick={() => setProfileEditOpen(true)}
                className="flex-1 h-11 bg-gray-100 text-black rounded-lg text-[15px] font-medium active:bg-gray-200 transition-colors"
              >
                프로필 편집
              </button>
              <Link
                href={selfUploadHref}
                className="flex-1 h-11 bg-black text-white rounded-lg text-[15px] font-medium flex items-center justify-center active:bg-gray-800 transition-colors"
              >
                {selfUploadLabel}
              </Link>
            </>
          ) : (
            <>
              {/* Follow Button (non-self only) */}
              <div className="flex-1">
                <FollowButton sellerId={sellerId} size="md" className="w-full h-11" />
              </div>
              <button
                type="button"
                onClick={handleToggleViewMode}
                className="flex-1 h-11 bg-gray-100 text-black rounded-lg text-[14px] font-medium active:bg-gray-200 transition-colors"
              >
                {viewMode === "feed" ? "리스트보기" : "피드보기"}
              </button>
              <button
                type="button"
                onClick={handleShareProfile}
                className="flex-1 h-11 bg-black text-white rounded-lg text-[14px] font-medium active:bg-gray-800 transition-colors"
              >
                프로필공유
              </button>
            </>
          )}
        </div>
        {isSelf && (
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-[13px]">
            {canUseSellerView ? (
              <Link href="/seller" className="text-gray-700 underline underline-offset-2">
                판매자 센터
              </Link>
            ) : null}
            {isCustomerView ? (
              <Link href="/apply/seller" className="text-gray-700 underline underline-offset-2">
                판매자 신청
              </Link>
            ) : null}
          </div>
        )}
      </div>

      {/* Profile Edit Sheet */}
      {profileEditOpen && (
        <ProfileEditSheet
          open={profileEditOpen}
          onClose={() => setProfileEditOpen(false)}
        />
      )}
    </>
  );
}
