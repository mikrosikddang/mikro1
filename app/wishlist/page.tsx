"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useSession } from "@/components/SessionProvider";
import { getWishlist } from "@/lib/wishlist";
import { formatKrw } from "@/lib/format";
import Container from "@/components/Container";
import ProductCard from "@/components/ProductCard";

type ProductData = {
  id: string;
  title: string;
  priceKrw: number;
  salePriceKrw?: number | null;
  sellerId?: string;
  images: { url: string }[];
  seller?: { sellerProfile?: { shopName: string } | null };
  shopName?: string | null;
  imageUrl?: string | null;
  isAvailable?: boolean;
};

interface WishlistItem {
  id: string;
  productId: string;
  title: string;
  priceKrw: number;
  salePriceKrw: number | null;
  imageUrl: string | null;
  shopName: string | null;
  isAvailable: boolean;
}

export default function WishlistPage() {
  const session = useSession();
  const [products, setProducts] = useState<ProductData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchFromDB = useCallback(async () => {
    try {
      const res = await fetch("/api/wishlist");
      if (!res.ok) throw new Error();
      const data = await res.json();
      const items: WishlistItem[] = data.items || [];
      setProducts(
        items
          .filter((item) => item.isAvailable)
          .map((item) => ({
            id: item.productId,
            title: item.title,
            priceKrw: item.priceKrw,
            salePriceKrw: item.salePriceKrw,
            images: item.imageUrl ? [{ url: item.imageUrl }] : [],
            shopName: item.shopName,
          }))
      );
    } catch {
      console.error("Failed to load wishlist from DB");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchFromLocalStorage = useCallback(async () => {
    const ids = getWishlist();
    if (ids.length === 0) {
      setProducts([]);
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/products/by-ids", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) throw new Error();
      const data: ProductData[] = await res.json();
      setProducts(data);
    } catch {
      console.error("Failed to load wishlist products");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchProducts = useCallback(() => {
    if (session) {
      fetchFromDB();
    } else {
      fetchFromLocalStorage();
    }
  }, [session, fetchFromDB, fetchFromLocalStorage]);

  useEffect(() => {
    fetchProducts();

    const handler = () => {
      setIsLoading(true);
      fetchProducts();
    };
    window.addEventListener("wishlist-change", handler);
    return () => window.removeEventListener("wishlist-change", handler);
  }, [fetchProducts]);

  return (
    <Container>
      <div className="py-6">
        <h1 className="text-[22px] font-bold text-black mb-1">관심목록</h1>
        <p className="text-[13px] text-gray-500 mb-6">
          {isLoading ? "불러오는 중..." : `${products.length}개`}
        </p>

        {isLoading ? (
          <div className="py-20 text-center text-gray-400 text-sm">
            불러오는 중...
          </div>
        ) : products.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-[40px] mb-3">💛</p>
            <p className="text-[15px] text-gray-500 mb-6">
              관심 상품이 없어요
            </p>
            <Link
              href="/"
              className="inline-block px-6 py-3 bg-black text-white rounded-xl text-[14px] font-medium"
            >
              홈으로 가기
            </Link>
          </div>
        ) : (
          <div className="flex flex-col">
            {products.map((product) => {
              const shopName =
                product.shopName ??
                product.seller?.sellerProfile?.shopName ??
                "알수없음";
              const sellerId = product.sellerId ?? "";
              return (
                <ProductCard
                  key={product.id}
                  id={product.id}
                  title={product.title}
                  priceKrw={product.priceKrw}
                  salePriceKrw={product.salePriceKrw}
                  images={product.images.map((i) => ({ url: i.url }))}
                  shopName={shopName}
                  sellerId={sellerId}
                />
              );
            })}
          </div>
        )}
      </div>
    </Container>
  );
}
