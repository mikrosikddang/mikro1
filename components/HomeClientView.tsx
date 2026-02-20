"use client";

import { useState, useEffect } from "react";
import { getHomeFeedViewMode, type HomeFeedViewMode } from "@/lib/uiPrefs";
import ProductCard from "@/components/ProductCard";
import HomeCarrotList from "@/components/HomeCarrotList";

type Product = {
  id: string;
  title: string;
  priceKrw: number;
  sellerId: string;
  createdAt: Date;
  images: { url: string }[];
  seller: {
    sellerProfile: {
      shopName: string;
    } | null;
  };
};

type HomeClientViewProps = {
  products: Product[];
};

export default function HomeClientView({ products }: HomeClientViewProps) {
  const [viewMode, setViewMode] = useState<HomeFeedViewMode>("feed");
  const [mounted, setMounted] = useState(false);

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

  // Show placeholder during hydration
  if (!mounted) {
    return (
      <div className="flex flex-col gap-4 pb-8">
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
    <div className="flex flex-col gap-4 pb-8">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          id={product.id}
          title={product.title}
          priceKrw={product.priceKrw}
          images={product.images.map((i) => ({ url: i.url }))}
          shopName={product.seller.sellerProfile?.shopName ?? "알수없음"}
          sellerId={product.sellerId}
        />
      ))}
    </div>
  );
}
