/**
 * Instagram-style seller shop header
 * Features: avatar, shop info, CS contact button
 */

import Link from "next/link";

export interface SellerShopHeaderProps {
  sellerId: string;
  shopName: string;
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
  type,
  marketBuilding,
  floor,
  roomNo,
  avatarUrl,
  csEmail,
}: SellerShopHeaderProps) {
  // Build location string
  const locationParts = [
    marketBuilding,
    floor ? `${floor}층` : null,
    roomNo,
  ].filter(Boolean);
  const locationText = locationParts.length > 0 ? locationParts.join(" · ") : null;

  // CS button link
  const csLink = csEmail
    ? `mailto:${csEmail}`
    : `/chat?sellerId=${sellerId}`;
  const csLabel = csEmail ? "이메일 문의" : "채팅 문의";

  return (
    <div className="py-6 border-b border-gray-200 mb-6">
      {/* Avatar + Shop Info Row */}
      <div className="flex items-start gap-4 mb-4">
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

        {/* Shop Info */}
        <div className="flex-1 min-w-0 pt-1">
          <h1 className="text-[20px] font-bold text-black mb-1">
            {shopName}
          </h1>
          {type && (
            <span className="inline-block px-2.5 py-1 rounded-full bg-gray-100 text-[11px] font-medium text-gray-600 mb-2">
              {type}
            </span>
          )}
          {locationText && (
            <p className="text-[13px] text-gray-500 mt-1">
              {locationText}
            </p>
          )}
        </div>
      </div>

      {/* CS Button */}
      <Link
        href={csLink}
        className="block w-full h-11 bg-black text-white rounded-lg text-[15px] font-medium flex items-center justify-center active:bg-gray-800 transition-colors"
      >
        {csLabel}
      </Link>
    </div>
  );
}
