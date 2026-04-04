import Link from "next/link";
import { notFound } from "next/navigation";
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

export const revalidate = 60;

type Props = {
  params: Promise<{ storeSlug: string }>;
  searchParams: Promise<{ welcome?: string }>;
};

export default async function SellerStoreSlugPage({ params, searchParams }: Props) {
  const { storeSlug } = await params;
  const { welcome } = await searchParams;

  const seller = await prisma.user.findFirst({
    where: {
      ...getPublicSpaceUserWhere(),
      sellerProfile: { is: { storeSlug } },
    },
    include: { sellerProfile: true },
  });

  if (!seller || !seller.sellerProfile) {
    notFound();
  }

  const session = await getSession();
  const sellerId = seller.id;
  const isOwner = session?.userId === sellerId;
  const isApprovedSeller =
    seller.role === "SELLER_ACTIVE" &&
    seller.sellerProfile.status === "APPROVED";

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
        {isOwner && welcome === "1" && (
          <div className="pt-4">
            <div className="rounded-2xl border border-black bg-black px-4 py-4 text-white">
              <p className="text-[15px] font-semibold">내 공간이 만들어졌습니다.</p>
              <p className="mt-1 text-[13px] text-white/80 leading-relaxed">
                지금부터 사진과 기록을 올리며 내 공간을 운영할 수 있습니다. 판매가 필요해지면 언제든 입점 신청을 이어갈 수 있습니다.
              </p>
              <div className="mt-3 flex gap-2">
                <Link
                  href="/space/posts/new"
                  className="inline-flex h-10 items-center rounded-xl bg-white px-4 text-[13px] font-semibold text-black"
                >
                  사진 올리기
                </Link>
                <Link
                  href="/apply/seller"
                  className="inline-flex h-10 items-center rounded-xl border border-white/30 px-4 text-[13px] font-medium text-white"
                >
                  판매자 입점 신청
                </Link>
              </div>
            </div>
          </div>
        )}
        <SellerShopHeader
          sellerId={sellerId}
          shopName={seller.sellerProfile.shopName}
          bio={seller.sellerProfile.bio}
          avatarUrl={seller.sellerProfile.avatarUrl}
          socialChannelType={seller.sellerProfile.socialChannelType}
          socialChannelUrl={seller.sellerProfile.socialChannelUrl}
        />
        {!isApprovedSeller && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-[13px] font-medium text-amber-800">아카이브 공간</p>
            <p className="mt-1 text-[12px] text-amber-700 leading-relaxed">
              이 공간은 판매자 승인 전 아카이브·쇼룸 용도로 운영됩니다. 판매 운영은 판매자 승인 완료 후 가능합니다.
            </p>
          </div>
        )}
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
