/**
 * Seller name typography component
 * Used in product detail page for consistent seller name styling
 */

import Link from "next/link";
import Image from "next/image";

interface SellerNameTextProps {
  sellerId: string;
  shopName: string;
  avatarUrl?: string | null;
}

export default function SellerNameText({ sellerId, shopName, avatarUrl }: SellerNameTextProps) {
  return (
    <Link
      href={`/s/${sellerId}`}
      className="inline-flex items-center gap-1.5 text-[13px] font-medium text-gray-600 hover:text-black transition-colors"
    >
      {avatarUrl ? (
        <Image
          src={avatarUrl}
          alt={shopName}
          width={20}
          height={20}
          className="w-5 h-5 rounded-full object-cover"
        />
      ) : (
        <span className="w-5 h-5 rounded-full bg-gray-200 text-gray-500 text-[10px] font-bold flex items-center justify-center shrink-0">
          {shopName.charAt(0)}
        </span>
      )}
      {shopName}
    </Link>
  );
}
