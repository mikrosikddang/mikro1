import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Container from "@/components/Container";
import ImageCarousel from "@/components/ImageCarousel";
import ColorImageCarousel from "./ColorImageCarousel";
import WishlistButton from "@/components/WishlistButton";
import AddToCartSection from "./AddToCartSection";
import {
  renderDescriptionForCustomer,
  type ProductDescription,
} from "@/lib/descriptionSchema";
import { getSession } from "@/lib/auth";
import SellerNameText from "@/components/typography/SellerNameText";
import ProductSellerActions from "./ProductSellerActions";
import ReviewSection, { ReviewSummary } from "./ReviewSection";
import InquirySection from "./InquirySection";
import ScrollToTop from "@/components/ScrollToTop";
import {
  getCustomerVisibleProductWhere,
  getOwnerVisibleProductWhere,
} from "@/lib/publicVisibility";
import { isArchivePost } from "@/lib/productPostType";

export const revalidate = 30; // ISR: 30초 (getSession 사용으로 실제 동적 렌더링)

type Props = { params: Promise<{ id: string }> };

export default async function ProductDetailPage({ params }: Props) {
  const { id } = await params;
  const session = await getSession();
  const product = await prisma.product.findFirst({
    where: session
      ? {
          OR: [
            getOwnerVisibleProductWhere({ id, sellerId: session.userId }),
            getCustomerVisibleProductWhere({ id }),
          ],
        }
      : getCustomerVisibleProductWhere({ id }),
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      seller: { include: { sellerProfile: true } },
      variants: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!product) notFound();

  const shopName = product.seller.sellerProfile?.shopName ?? "알수없음";
  const totalStock = product.variants.reduce((sum, v) => sum + v.stock, 0);
  const isSoldOut = totalStock <= 0;
  const isArchive = isArchivePost(product.postType);
  const isSelf = session ? session.userId === product.sellerId : false;

  // Split images by kind
  const allMainImages = product.images.filter((i) => i.kind === "MAIN");
  const contentImages = product.images.filter((i) => i.kind === "CONTENT");

  // Color image tab support
  const hasColorImages = allMainImages.some((i) => i.colorKey);
  const colorKeys: string[] = [];
  const seen = new Set<string>();
  allMainImages.forEach((img) => {
    if (img.colorKey && !seen.has(img.colorKey)) {
      seen.add(img.colorKey);
      colorKeys.push(img.colorKey);
    }
  });
  const hasUntagged = allMainImages.some((i) => !i.colorKey);

  // Shipping & CS info from seller profile
  const sp = product.seller.sellerProfile;
  const shippingInfo = [
    sp?.shippingGuide && { label: "배송 안내", value: sp.shippingGuide },
    sp?.exchangeGuide && { label: "교환/반품", value: sp.exchangeGuide },
    sp?.refundGuide && { label: "환불 안내", value: sp.refundGuide },
    sp?.csPhone && { label: "고객센터", value: sp.csPhone },
    sp?.csEmail && { label: "이메일", value: sp.csEmail },
    sp?.csAddress && { label: "교환/반품 주소", value: sp.csAddress },
    sp?.csHours && { label: "운영시간", value: sp.csHours },
    sp?.etcGuide && { label: "기타 안내", value: sp.etcGuide },
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <Container>
      <ScrollToTop />
      {/* Main images – Instagram-like horizontal swipe */}
      {hasColorImages ? (
        <ColorImageCarousel
          images={allMainImages.map((i) => ({ url: i.url, colorKey: i.colorKey }))}
          colorKeys={colorKeys}
          hasUntagged={hasUntagged}
          aspect="3/4"
        />
      ) : (
        <ImageCarousel
          images={allMainImages.map((i) => ({ url: i.url }))}
          aspect="3/4"
        />
      )}

      {/* Product info */}
      <div className="py-6">
        {/* Seller name */}
        <SellerNameText sellerId={product.sellerId} shopName={shopName} avatarUrl={product.seller.sellerProfile?.avatarUrl} />

        {/* Product title + Price */}
        <div className="mt-2 flex items-baseline justify-between gap-4">
          <h1 className="flex-1 min-w-0 text-[18px] font-bold text-black tracking-tight leading-snug">
            {product.title}
          </h1>
          <div className="shrink-0 text-right">
            {isArchive ? (
              <span className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-[12px] font-semibold text-gray-600">
                아카이브 게시물
              </span>
            ) : product.salePriceKrw != null && product.salePriceKrw < product.priceKrw ? (
              <>
                <div className="flex items-baseline gap-1.5">
                  <span className="bg-red-500 text-white rounded px-1.5 py-0.5 text-[12px] font-bold">
                    {Math.round((1 - product.salePriceKrw / product.priceKrw) * 100)}%
                  </span>
                  <span className="text-[20px] font-bold text-black tracking-tight">
                    {product.salePriceKrw.toLocaleString()}원
                  </span>
                </div>
                <span className="text-[13px] text-gray-400 line-through">
                  {product.priceKrw.toLocaleString()}원
                </span>
              </>
            ) : (
              <span className="text-[20px] font-bold text-black tracking-tight">
                {product.priceKrw.toLocaleString()}원
              </span>
            )}
          </div>
        </div>

        {/* Review Summary */}
        <ReviewSummary productId={product.id} />

        {/* Seller Actions (self only) */}
        {isSelf && (
          <ProductSellerActions productId={product.id} postType={product.postType} />
        )}

        {/* Divider */}
        <div className="border-t border-gray-100 my-6" />

        {/* Size selection and CTA */}
        {!isArchive && (
          <AddToCartSection
            productId={product.id}
            variants={product.variants}
            isSoldOut={isSoldOut}
            userRole={session?.role ?? null}
            priceKrw={product.priceKrw}
            salePriceKrw={product.salePriceKrw}
          />
        )}

        {/* Divider */}
        <div className="border-t border-gray-100 my-6" />

        {/* Description */}
        {(() => {
          // Render structured description if available
          if (product.descriptionJson && typeof product.descriptionJson === "object") {
            const rendered = renderDescriptionForCustomer(
              product.descriptionJson as unknown as ProductDescription,
            );
            const hasContent = rendered.spec.length > 0 || rendered.detail || rendered.blocks.length > 0;

            if (!hasContent) return null;

            return (
              <div className="mt-6 pt-5 border-t border-gray-100 space-y-5">
                {/* Spec Section */}
                {rendered.spec.length > 0 && (
                  <div>
                    <h3 className="text-[14px] font-bold text-gray-900 mb-2">상품 사양</h3>
                    <dl className="space-y-1.5">
                      {rendered.spec.map((item, idx) => (
                        <div key={idx} className="flex text-[13px]">
                          <dt className="w-20 text-gray-500 shrink-0">{item.label}</dt>
                          <dd className="text-gray-700">{item.value}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                )}

                {/* V2 Block-based description */}
                {rendered.isV2 && rendered.blocks.length > 0 && (
                  <div className="space-y-4">
                    {rendered.blocks.map((block, idx) => (
                      <div key={idx}>
                        {block.type === "text" ? (
                          <p className="text-[13px] text-gray-600 leading-relaxed whitespace-pre-wrap">
                            {block.content}
                          </p>
                        ) : (
                          <div className="w-full rounded-lg overflow-hidden">
                            <img
                              src={block.url}
                              alt={block.caption || ""}
                              className="w-full h-auto"
                              loading="lazy"
                            />
                            {block.caption && (
                              <p className="text-[12px] text-gray-400 mt-1 px-1">{block.caption}</p>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* V1 Detail Section (legacy) */}
                {!rendered.isV2 && rendered.detail && (
                  <div>
                    <h3 className="text-[14px] font-bold text-gray-900 mb-2">상세 설명</h3>
                    <p className="text-[13px] text-gray-600 leading-relaxed whitespace-pre-wrap">
                      {rendered.detail}
                    </p>
                  </div>
                )}
              </div>
            );
          }

          // Fallback to legacy description
          if (product.description) {
            return (
              <div className="mt-6 pt-5 border-t border-gray-100">
                <p className="text-[14px] text-gray-600 leading-relaxed whitespace-pre-wrap">
                  {product.description}
                </p>
              </div>
            );
          }

          return null;
        })()}

        {/* Content images – stacked vertically (V1 only, V2 uses blocks) */}
        {contentImages.length > 0 && (!product.descriptionJson || (product.descriptionJson as unknown as ProductDescription).v !== 2) && (
          <div className="mt-6 pt-5 border-t border-gray-100 space-y-2">
            {contentImages.map((img) => (
              <div key={img.id} className="w-full rounded-lg overflow-hidden">
                <img
                  src={img.url}
                  alt=""
                  className="w-full h-auto"
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        )}

        {/* Shipping & CS from Seller Profile */}
        {shippingInfo.length > 0 && (
          <div className="mt-6 pt-5 border-t border-gray-100">
            <div className="p-4 bg-gray-50 rounded-xl">
              <h3 className="text-[13px] font-bold text-gray-900 mb-2">배송 및 고객센터</h3>
              <dl className="space-y-1">
                {shippingInfo.map((item, idx) => (
                  <div key={idx} className="flex text-[12px]">
                    <dt className="w-24 text-gray-500 shrink-0">{item.label}</dt>
                    <dd className="text-gray-700 whitespace-pre-wrap">{item.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        )}

        {/* Reviews */}
        <ReviewSection productId={product.id} />

        {/* Inquiries */}
        <InquirySection productId={product.id} />

        {/* Wishlist button */}
        <div className="mt-4 flex justify-end">
          <WishlistButton productId={product.id} variant="detail" />
        </div>
      </div>
    </Container>
  );
}
