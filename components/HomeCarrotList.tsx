"use client";

import Link from "next/link";
import { useState } from "react";
import ProductActionMenu from "@/components/ProductActionMenu";

type Product = {
  id: string;
  title: string;
  priceKrw: number;
  sellerId: string;
  images: { url: string }[];
  seller: {
    sellerProfile: {
      shopName: string;
    } | null;
  };
  createdAt: Date;
};

type HomeCarrotListProps = {
  products: Product[];
};

function CarrotListItem({ product }: { product: Product }) {
  const [menuOpen, setMenuOpen] = useState(false);

  const handleOptionsClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setMenuOpen(true);
  };

  const imageUrl = product.images[0]?.url || "/placeholder.png";
  const shopName = product.seller.sellerProfile?.shopName || "알수없음";

  return (
    <>
      <Link href={`/p/${product.id}`} className="block">
        <div className="flex gap-3 py-4 px-4 border-b border-gray-100 active:bg-gray-50 transition-colors">
          {/* Thumbnail */}
          <div className="flex-shrink-0 w-24 h-24 rounded-xl overflow-hidden bg-gray-100">
            <img
              src={imageUrl}
              alt={product.title}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 flex flex-col">
            {/* Top row: title + options button */}
            <div className="flex items-start justify-between gap-2 mb-1">
              <h3 className="flex-1 text-[16px] font-medium text-gray-900 leading-snug line-clamp-2">
                {product.title}
              </h3>
              <button
                type="button"
                onClick={handleOptionsClick}
                className="flex-shrink-0 w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600"
                aria-label="옵션"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
                  <circle cx="8" cy="3" r="1.5" />
                  <circle cx="8" cy="8" r="1.5" />
                  <circle cx="8" cy="13" r="1.5" />
                </svg>
              </button>
            </div>

            {/* Meta info */}
            <p className="text-[13px] text-gray-500 mt-0.5">
              {shopName}
            </p>

            {/* Bottom row: price only (wishlist moved to menu) */}
            <div className="flex items-end justify-between mt-auto pt-1">
              <p className="text-[20px] font-bold text-black tracking-tight tabular-nums">
                ₩{product.priceKrw.toLocaleString("ko-KR")}
              </p>
            </div>
          </div>
        </div>
      </Link>

      {/* Action Menu */}
      {menuOpen && (
        <ProductActionMenu
          productId={product.id}
          sellerId={product.sellerId}
          onClose={() => setMenuOpen(false)}
        />
      )}
    </>
  );
}

export default function HomeCarrotList({ products }: HomeCarrotListProps) {
  return (
    <div className="pb-4">
      {products.map((product) => (
        <CarrotListItem key={product.id} product={product} />
      ))}
    </div>
  );
}
