import Link from "next/link";
import Image from "next/image";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatKrw } from "@/lib/format";
import { getPublicProductWhere } from "@/lib/publicVisibility";
import { ATTRIBUTION_COOKIE_KEYS } from "@/lib/attributionShared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CampaignPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CampaignLandingPage({
  params,
  searchParams,
}: CampaignPageProps) {
  const { slug } = await params;
  const qs = await searchParams;
  const campaign = await prisma.campaign.findFirst({
    where: {
      slug,
      status: { in: ["ACTIVE", "ENDED"] },
      seller: {
        role: "SELLER_ACTIVE",
        sellerProfile: {
          is: {
            status: "APPROVED",
          },
        },
      },
    },
    include: {
      seller: {
        select: {
          id: true,
          sellerProfile: {
            select: {
              shopName: true,
              bio: true,
              avatarUrl: true,
              creatorSlug: true,
            },
          },
        },
      },
      products: {
        orderBy: { sortOrder: "asc" },
        select: { productId: true },
      },
    },
  });

  if (!campaign) {
    notFound();
  }

  const productIds = campaign.products.map((item) => item.productId);
  const products = productIds.length
    ? await prisma.product.findMany({
        where: getPublicProductWhere({
          id: { in: productIds },
          sellerId: campaign.sellerId,
        }),
        include: {
          images: {
            where: { kind: "MAIN" },
            orderBy: { sortOrder: "asc" },
            take: 1,
          },
        },
      })
    : [];

  const productOrder = new Map(productIds.map((id, index) => [id, index]));
  products.sort(
    (a, b) =>
      (productOrder.get(a.id) ?? Number.MAX_SAFE_INTEGER) -
      (productOrder.get(b.id) ?? Number.MAX_SAFE_INTEGER),
  );

  const cookieStore = await cookies();
  const refFromQuery = Array.isArray(qs.ref) ? qs.ref[0] : qs.ref;
  const utmSource = Array.isArray(qs.utm_source) ? qs.utm_source[0] : qs.utm_source;
  const utmMedium = Array.isArray(qs.utm_medium) ? qs.utm_medium[0] : qs.utm_medium;
  const utmCampaign = Array.isArray(qs.utm_campaign)
    ? qs.utm_campaign[0]
    : qs.utm_campaign;
  const sessionKey = cookieStore.get(ATTRIBUTION_COOKIE_KEYS.sessionKey)?.value;
  const search = new URLSearchParams();
  Object.entries(qs).forEach(([key, value]) => {
    if (typeof value === "string") search.set(key, value);
  });
  const landingPath = `/c/${campaign.slug}${
    search.toString() ? `?${search.toString()}` : ""
  }`;
  const recentVisit =
    sessionKey
      ? await prisma.campaignVisit.findFirst({
          where: {
            campaignId: campaign.id,
            sessionKey,
            createdAt: {
              gte: new Date(Date.now() - 10 * 60 * 1000),
            },
          },
          select: { id: true },
        })
      : null;

  if (!recentVisit) {
    await prisma.campaignVisit.create({
      data: {
        campaignId: campaign.id,
        sellerId: campaign.sellerId,
        refCode:
          refFromQuery ||
          campaign.seller.sellerProfile?.creatorSlug ||
          campaign.refCode,
        creatorSlug: campaign.seller.sellerProfile?.creatorSlug || null,
        utmSource: utmSource || null,
        utmMedium: utmMedium || null,
        utmCampaign: utmCampaign || null,
        landingPath,
        sessionKey: sessionKey || null,
      },
    });
  }

  return (
    <div className="min-h-screen bg-[#faf8f5]">
      <div className="mx-auto max-w-4xl px-4 py-10">
        <div className="mb-6 rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-black/5">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 overflow-hidden rounded-full bg-gray-100">
              {campaign.seller.sellerProfile?.avatarUrl ? (
                <Image
                  src={campaign.seller.sellerProfile.avatarUrl}
                  alt={campaign.seller.sellerProfile.shopName}
                  width={64}
                  height={64}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-[22px] font-bold text-gray-500">
                  {campaign.seller.sellerProfile?.shopName?.charAt(0) || "M"}
                </div>
              )}
            </div>
            <div>
              <p className="text-[13px] tracking-[0.12em] text-gray-400">
                공동구매 캠페인
              </p>
              <h1 className="mt-1 text-[28px] font-bold text-black">
                {campaign.landingHeadline || campaign.title}
              </h1>
              <p className="mt-2 text-[14px] leading-relaxed text-gray-600">
                {campaign.description ||
                  campaign.seller.sellerProfile?.bio ||
                  "공동구매 전용 혜택과 함께 바로 결제할 수 있는 캠페인입니다."}
              </p>
            </div>
          </div>

          {(campaign.startsAt || campaign.endsAt) && (
            <div className="mt-5 rounded-2xl bg-gray-50 px-4 py-3 text-[13px] text-gray-600">
              {campaign.startsAt && (
                <span>
                  시작 {new Date(campaign.startsAt).toLocaleString("ko-KR")}
                </span>
              )}
              {campaign.startsAt && campaign.endsAt && <span> · </span>}
              {campaign.endsAt && (
                <span>
                  종료 {new Date(campaign.endsAt).toLocaleString("ko-KR")}
                </span>
              )}
            </div>
          )}

          {campaign.landingBody && (
            <div className="mt-5 whitespace-pre-wrap rounded-2xl bg-[#f6f2eb] px-4 py-4 text-[14px] leading-7 text-gray-700">
              {campaign.landingBody}
            </div>
          )}
        </div>

        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[18px] font-bold text-black">캠페인 상품</h2>
          <span className="text-[13px] text-gray-500">{products.length}개</span>
        </div>

        {products.length === 0 ? (
          <div className="rounded-2xl bg-white p-8 text-center text-[14px] text-gray-500 ring-1 ring-black/5">
            현재 노출 가능한 상품이 없습니다.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {products.map((product) => (
              <Link
                key={product.id}
                href={`/p/${product.id}?campaign=${campaign.slug}&ref=${
                  campaign.seller.sellerProfile?.creatorSlug || campaign.refCode
                }`}
                className="overflow-hidden rounded-[24px] bg-white ring-1 ring-black/5 transition-transform hover:-translate-y-0.5"
              >
                <div className="relative aspect-[4/5] bg-gray-100">
                  {product.images[0]?.url ? (
                    <Image
                      src={product.images[0].url}
                      alt={product.title}
                      fill
                      className="object-cover"
                    />
                  ) : null}
                </div>
                <div className="p-4">
                  <p className="line-clamp-2 text-[16px] font-semibold text-black">
                    {product.title}
                  </p>
                  <div className="mt-2 flex items-baseline gap-2">
                    {product.salePriceKrw && product.salePriceKrw < product.priceKrw ? (
                      <>
                        <span className="text-[18px] font-bold text-black">
                          {formatKrw(product.salePriceKrw)}
                        </span>
                        <span className="text-[13px] text-gray-400 line-through">
                          {formatKrw(product.priceKrw)}
                        </span>
                      </>
                    ) : (
                      <span className="text-[18px] font-bold text-black">
                        {formatKrw(product.priceKrw)}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
