/**
 * Seller name typography component
 * Used in product detail page for consistent seller name styling
 */

import Link from "next/link";

interface SellerNameTextProps {
  sellerId: string;
  shopName: string;
}

export default function SellerNameText({ sellerId, shopName }: SellerNameTextProps) {
  return (
    <Link
      href={`/s/${sellerId}`}
      className="text-[13px] font-medium text-gray-600 hover:text-black transition-colors"
    >
      {shopName}
    </Link>
  );
}
