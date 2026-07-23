import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getPublicSpaceUserWhere } from "@/lib/publicVisibility";
import { getSellerFeedWindow } from "@/lib/sellerFeed";
import SellerFeedList from "@/components/SellerFeedList";

export const revalidate = 30;

type Props = {
  params: Promise<{ storeSlug: string }>;
  searchParams: Promise<{ post?: string }>;
};

export default async function SellerFeedPage({ params, searchParams }: Props) {
  const { storeSlug } = await params;
  const { post } = await searchParams;

  const seller = await prisma.user.findFirst({
    where: {
      ...getPublicSpaceUserWhere(),
      sellerProfile: { is: { storeSlug } },
    },
    include: { sellerProfile: true },
  });

  if (!seller || !seller.sellerProfile) {
    const historical = await prisma.storeSlugHistory.findUnique({
      where: { slug: storeSlug },
      select: { sellerProfile: { select: { storeSlug: true } } },
    });
    const currentSlug = historical?.sellerProfile.storeSlug;
    if (currentSlug && currentSlug !== storeSlug) {
      redirect(`/${currentSlug}/feed${post ? `?post=${post}` : ""}`);
    }
    notFound();
  }

  const sellerId = seller.id;
  const canonicalSlug = seller.sellerProfile.storeSlug ?? storeSlug;

  const window = await getSellerFeedWindow({ sellerId, anchor: post ?? null });

  return (
    <div className="mx-auto w-full max-w-[420px]">
      {/* Top bar */}
      <div className="sticky top-0 z-20 flex h-12 items-center border-b border-gray-200 bg-white px-2">
        <Link
          href={`/${canonicalSlug}`}
          aria-label="뒤로"
          className="flex h-10 w-10 items-center justify-center text-gray-700"
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="ml-1 text-[16px] font-bold text-black">{seller.sellerProfile.shopName}</h1>
      </div>

      <SellerFeedList
        sellerId={sellerId}
        shopName={seller.sellerProfile.shopName}
        avatarUrl={seller.sellerProfile.avatarUrl}
        anchorId={post ?? null}
        initialItems={window.items}
        initialPrevCursor={window.prevCursor}
        initialNextCursor={window.nextCursor}
      />
    </div>
  );
}
