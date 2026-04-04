import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import Container from "@/components/Container";
import SellerShopHeader from "@/components/SellerShopHeader";
import ProductGrid from "@/components/ProductGrid";
import ScrollToTop from "@/components/ScrollToTop";
import {
  getCustomerVisibleProductWhere,
  getPublicSpaceUserWhere,
} from "@/lib/publicVisibility";

export const revalidate = 60; // ISR: 60초

type Props = { params: Promise<{ sellerId: string }> };

export default async function SellerShopPage({ params }: Props) {
  const { sellerId } = await params;

  // Fetch seller profile
  const seller = await prisma.user.findFirst({
    where: {
      id: sellerId,
      ...getPublicSpaceUserWhere(),
    },
    include: { sellerProfile: true },
  });

  const session = await getSession();

  if (!seller || !seller.sellerProfile) {
    if (session && session.userId === sellerId) {
      redirect("/apply/seller");
    }
    notFound();
  }

  if (seller.sellerProfile.storeSlug) {
    redirect(`/${seller.sellerProfile.storeSlug}`);
  }

  const isOwner = session?.userId === sellerId;

  const profile = seller.sellerProfile;

  // Fetch initial products for SSR (first page)
  const limit = 30;
  const products = await prisma.product.findMany({
    where: getCustomerVisibleProductWhere({ sellerId }),
    orderBy: [
      { sortOrder: "asc" },
      { createdAt: "desc" },
      { id: "desc" },
    ],
    take: limit + 1,
    include: {
      images: {
        where: { kind: "MAIN" },
        orderBy: { sortOrder: "asc" },
        take: 1,
      },
    },
  });

  // Pagination logic
  const hasMore = products.length > limit;
  const items = hasMore ? products.slice(0, limit) : products;
  const nextCursor = hasMore
    ? items[items.length - 1].createdAt.toISOString()
    : null;

  const initialProducts = items.map((p) => ({
    id: p.id,
    title: p.title,
    priceKrw: p.priceKrw,
    salePriceKrw: p.salePriceKrw,
    postType: p.postType,
    imageUrl: p.images[0]?.url || null,
  }));

  return (
    <>
      <ScrollToTop />
      <Container>
        {/* Instagram-style header */}
        <SellerShopHeader
          sellerId={sellerId}
          shopName={profile.shopName}
          bio={profile.bio}
          avatarUrl={profile.avatarUrl}
        />
      </Container>

      {/* Instagram-style product grid - full width, no padding */}
      <div className="mx-auto w-full max-w-[420px]">
        <ProductGrid
          sellerId={sellerId}
          initialProducts={initialProducts}
          initialNextCursor={nextCursor}
          isOwner={isOwner}
        />
      </div>
    </>
  );
}
