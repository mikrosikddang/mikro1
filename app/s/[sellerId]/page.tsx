import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Container from "@/components/Container";
import SellerShopHeader from "@/components/SellerShopHeader";
import ProductGrid from "@/components/ProductGrid";

type Props = { params: Promise<{ sellerId: string }> };

export default async function SellerShopPage({ params }: Props) {
  const { sellerId } = await params;

  // Fetch seller profile
  const seller = await prisma.user.findUnique({
    where: { id: sellerId },
    include: { sellerProfile: true },
  });

  if (!seller || !seller.sellerProfile) notFound();

  const profile = seller.sellerProfile;

  // Fetch initial products for SSR (first page)
  const limit = 30;
  const products = await prisma.product.findMany({
    where: {
      sellerId,
      isActive: true,
      isDeleted: false,
    },
    orderBy: [
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
    imageUrl: p.images[0]?.url || null,
  }));

  return (
    <>
      <Container>
        {/* Instagram-style header */}
        <SellerShopHeader
          sellerId={sellerId}
          shopName={profile.shopName}
          type={profile.type}
          marketBuilding={profile.marketBuilding}
          floor={profile.floor}
          roomNo={profile.roomNo}
          avatarUrl={profile.avatarUrl}
          csEmail={profile.csEmail}
        />
      </Container>

      {/* Instagram-style product grid - full width, no padding */}
      <div className="mx-auto w-full max-w-[420px]">
        <ProductGrid
          sellerId={sellerId}
          initialProducts={initialProducts}
          initialNextCursor={nextCursor}
        />
      </div>
    </>
  );
}
