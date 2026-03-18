import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import Container from "@/components/Container";
import SellerShopHeader from "@/components/SellerShopHeader";
import ProductGrid from "@/components/ProductGrid";
import ScrollToTop from "@/components/ScrollToTop";
import { getPublicProductWhere } from "@/lib/publicVisibility";

export const revalidate = 60;

type Props = { params: Promise<{ storeSlug: string }> };

export default async function SellerStoreSlugPage({ params }: Props) {
  const { storeSlug } = await params;

  const seller = await prisma.user.findFirst({
    where: {
      role: "SELLER_ACTIVE",
      sellerProfile: {
        is: {
          status: "APPROVED",
          storeSlug,
        },
      },
    },
    include: { sellerProfile: true },
  });

  if (!seller || !seller.sellerProfile) {
    notFound();
  }

  const session = await getSession();
  const sellerId = seller.id;
  const isOwner = session?.userId === sellerId;

  const limit = 30;
  const products = await prisma.product.findMany({
    where: getPublicProductWhere({ sellerId }),
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

  const hasMore = products.length > limit;
  const items = hasMore ? products.slice(0, limit) : products;
  const nextCursor = hasMore
    ? items[items.length - 1].createdAt.toISOString()
    : null;

  const initialProducts = items.map((p) => ({
    id: p.id,
    title: p.title,
    priceKrw: p.priceKrw,
    imageUrl: p.images[0]?.url || null,
  }));

  return (
    <>
      <ScrollToTop />
      <Container>
        <SellerShopHeader
          sellerId={sellerId}
          shopName={seller.sellerProfile.shopName}
          bio={seller.sellerProfile.bio}
          avatarUrl={seller.sellerProfile.avatarUrl}
          socialChannelType={seller.sellerProfile.socialChannelType}
          socialChannelUrl={seller.sellerProfile.socialChannelUrl}
        />
      </Container>

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
