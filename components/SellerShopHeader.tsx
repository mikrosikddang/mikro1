/**
 * Instagram-style seller shop header
 * Features: avatar, shop info, follow/edit buttons, follower counts (self only)
 */

"use client";

import Link from "next/link";
import { useState } from "react";
import { useSession } from "@/components/SessionProvider";
import FollowButton from "@/components/FollowButton";
import ProfileEditSheet from "@/components/ProfileEditSheet";

export interface SellerShopHeaderProps {
  sellerId: string;
  shopName: string;
  bio?: string | null;
  avatarUrl?: string | null;
  csEmail?: string | null;
}

export default function SellerShopHeader({
  sellerId,
  shopName,
  bio,
  avatarUrl,
  csEmail,
}: SellerShopHeaderProps) {
  const session = useSession();
  const isSelf = session ? session.userId === sellerId : false;

  const [profileEditOpen, setProfileEditOpen] = useState(false);
  const [imgError, setImgError] = useState(false);

  // CS button: only show when csEmail exists
  const csLink = csEmail ? `mailto:${csEmail}` : null;
  const csLabel = csEmail ? "이메일 문의" : null;

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
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          {isSelf ? (
            <>
              {/* Profile Edit Button (self only) */}
              <button
                type="button"
                onClick={() => setProfileEditOpen(true)}
                className="flex-1 h-11 bg-gray-100 text-black rounded-lg text-[15px] font-medium active:bg-gray-200 transition-colors"
              >
                프로필 편집
              </button>
              {/* Shop Management Button (self only) */}
              <Link
                href="/seller"
                className="flex-1 h-11 bg-black text-white rounded-lg text-[15px] font-medium flex items-center justify-center active:bg-gray-800 transition-colors"
              >
                상점관리
              </Link>
            </>
          ) : (
            <>
              {/* Follow Button (non-self only) */}
              <div className="flex-1">
                <FollowButton sellerId={sellerId} size="md" className="w-full h-11" />
              </div>
              {/* CS Button - only shown when csEmail exists */}
              {csLink && csLabel && (
                <Link
                  href={csLink}
                  className="flex-1 h-11 bg-black text-white rounded-lg text-[15px] font-medium flex items-center justify-center active:bg-gray-800 transition-colors"
                >
                  {csLabel}
                </Link>
              )}
            </>
          )}
        </div>
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
