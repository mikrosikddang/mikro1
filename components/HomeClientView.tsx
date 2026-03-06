"use client";

import { useState, useEffect } from "react";
import { getHomeFeedViewMode, type HomeFeedViewMode } from "@/lib/uiPrefs";
import { useSession } from "@/components/SessionProvider";
import { checkWishlistDB } from "@/lib/wishlist";
import ProductCard from "@/components/ProductCard";
import HomeCarrotList from "@/components/HomeCarrotList";

type Product = {
  id: string;
  title: string;
  priceKrw: number;
  salePriceKrw?: number | null;
  sellerId: string;
  createdAt: Date;
  images: { url: string }[];
  seller: {
    sellerProfile: {
      shopName: string;
      avatarUrl: string | null;
    } | null;
  };
};

type HomeClientViewProps = {
  products: Product[];
};

export default function HomeClientView({ products }: HomeClientViewProps) {
  const session = useSession();
  const [viewMode, setViewMode] = useState<HomeFeedViewMode>("feed");
  const [mounted, setMounted] = useState(false);
  const [wishlistMap, setWishlistMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    // Initialize from localStorage
    setViewMode(getHomeFeedViewMode());
    setMounted(true);

    // Listen for mode changes from drawer toggle
    const handleModeChange = (e: CustomEvent<{ mode: HomeFeedViewMode }>) => {
      setViewMode(e.detail.mode);
    };

    window.addEventListener("homeFeedViewModeChange", handleModeChange as EventListener);
    return () => {
      window.removeEventListener("homeFeedViewModeChange", handleModeChange as EventListener);
    };
  }, []);

  // Batch wishlist check for logged-in users
  useEffect(() => {
    if (!session || products.length === 0) return;
    const productIds = products.map((p) => p.id);
    const loadWishlist = () => {
      checkWishlistDB(productIds).then(setWishlistMap);
    };
    loadWishlist();
    window.addEventListener("wishlist-change", loadWishlist);
    return () => window.removeEventListener("wishlist-change", loadWishlist);
  }, [session, products]);

  // Show placeholder during hydration
  if (!mounted) {
    return (
      <div className="flex flex-col pb-8">
        {products.slice(0, 3).map((product) => (
          <div key={product.id} className="h-96 bg-gray-100 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (viewMode === "carrot") {
    return <HomeCarrotList products={products} />;
  }

  // Default: Instagram feed style
  return (
    <div className="flex flex-col pb-8">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          id={product.id}
          title={product.title}
          priceKrw={product.priceKrw}
          salePriceKrw={product.salePriceKrw}
          images={product.images.map((i) => ({ url: i.url }))}
          shopName={product.seller.sellerProfile?.shopName ?? "알수없음"}
          sellerId={product.sellerId}
          avatarUrl={product.seller.sellerProfile?.avatarUrl}
          initialWishlisted={session ? (wishlistMap[product.id] ?? false) : undefined}
        />
      ))}
    </div>
  );
}
