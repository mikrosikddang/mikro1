/**
 * Instagram-style seller shop header
 * Features: avatar, shop info, follow/edit buttons, follower counts (self only)
 */

"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useSession } from "@/components/SessionProvider";
import FollowButton from "@/components/FollowButton";
import ProfileEditSheet from "@/components/ProfileEditSheet";

export interface SellerShopHeaderProps {
  sellerId: string;
  shopName: string;
  bio?: string | null;
  locationText?: string | null;
  type?: string | null;
  marketBuilding?: string | null;
  floor?: string | null;
  roomNo?: string | null;
  avatarUrl?: string | null;
  csEmail?: string | null;
}

export default function SellerShopHeader({
  sellerId,
  shopName,
  bio,
  locationText,
  type,
  marketBuilding,
  floor,
  roomNo,
  avatarUrl,
  csEmail,
}: SellerShopHeaderProps) {
  const session = useSession();
  const isSelf = session ? session.userId === sellerId : false;

  const [followerCounts, setFollowerCounts] = useState<{
    followers: number;
    following: number;
  } | null>(null);
  const [profileEditOpen, setProfileEditOpen] = useState(false);

  // Fetch follower counts (self only)
  useEffect(() => {
    if (!isSelf) return;

    const fetchCounts = async () => {
      try {
        const res = await fetch(`/api/sellers/${sellerId}/follow/count`);
        if (res.ok) {
          const data = await res.json();
          setFollowerCounts(data);
        }
      } catch (error) {
        console.error("Failed to fetch follower counts:", error);
      }
    };

    fetchCounts();
  }, [isSelf, sellerId]);

  // Build legacy location string from old fields
  const legacyLocationParts = [
    marketBuilding,
    floor ? `${floor}층` : null,
    roomNo,
  ].filter(Boolean);
  const legacyLocation = legacyLocationParts.length > 0 ? legacyLocationParts.join(" · ") : null;

  // Use new locationText if available, otherwise fall back to legacy
  const displayLocation = locationText || legacyLocation;

  // CS button link
  const csLink = csEmail
    ? `mailto:${csEmail}`
    : `/chat?sellerId=${sellerId}`;
  const csLabel = csEmail ? "이메일 문의" : "채팅 문의";

  return (
    <>
      <div className="py-6 border-b border-gray-200 mb-6">
        {/* Avatar + Stats Row */}
        <div className="flex items-center gap-6 mb-4">
          {/* Avatar */}
          <div className="flex-shrink-0">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={shopName}
                className="w-20 h-20 rounded-full object-cover bg-gray-100"
              />
            ) : (
              <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center text-[24px] font-bold text-gray-500">
                {shopName.charAt(0)}
              </div>
            )}
          </div>

          {/* Stats (self only) */}
          {isSelf && followerCounts && (
            <div className="flex gap-6">
              <div className="text-center">
                <div className="text-[18px] font-bold text-black">
                  {followerCounts.followers}
                </div>
                <div className="text-[13px] text-gray-500">팔로워</div>
              </div>
              <div className="text-center">
                <div className="text-[18px] font-bold text-black">
                  {followerCounts.following}
                </div>
                <div className="text-[13px] text-gray-500">팔로잉</div>
              </div>
            </div>
          )}
        </div>

        {/* Shop Info */}
        <div className="mb-4">
          <h1 className="text-[16px] font-bold text-black mb-1">
            {shopName}
          </h1>
          {bio && (
            <p className="text-[14px] text-gray-700 leading-relaxed whitespace-pre-wrap mb-2">
              {bio}
            </p>
          )}
          {displayLocation && (
            <p className="text-[13px] text-gray-500">
              {displayLocation}
            </p>
          )}
          {type && (
            <span className="inline-block mt-2 px-2.5 py-1 rounded-full bg-gray-100 text-[11px] font-medium text-gray-600">
              {type}
            </span>
          )}
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
              {/* CS Button */}
              <Link
                href={csLink}
                className="flex-1 h-11 bg-black text-white rounded-lg text-[15px] font-medium flex items-center justify-center active:bg-gray-800 transition-colors"
              >
                {csLabel}
              </Link>
            </>
          ) : (
            <>
              {/* Follow Button (non-self only) */}
              <div className="flex-1">
                <FollowButton sellerId={sellerId} size="md" className="w-full h-11" />
              </div>
              {/* CS Button */}
              <Link
                href={csLink}
                className="flex-1 h-11 bg-black text-white rounded-lg text-[15px] font-medium flex items-center justify-center active:bg-gray-800 transition-colors"
              >
                {csLabel}
              </Link>
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
