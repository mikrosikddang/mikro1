import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import Container from "@/components/Container";
import ImageCarousel from "@/components/ImageCarousel";
import { formatKrw } from "@/lib/format";
import WishlistButton from "@/components/WishlistButton";
import AddToCartSection from "./AddToCartSection";
import { renderDescriptionForCustomer } from "@/lib/descriptionSchema";
import { getSession } from "@/lib/auth";
import SellerNameText from "@/components/typography/SellerNameText";
import ProductTitleText from "@/components/typography/ProductTitleText";
import ProductSellerActions from "./ProductSellerActions";

export const revalidate = 30; // ISR: 30초 (getSession 사용으로 실제 동적 렌더링)

type Props = { params: Promise<{ id: string }> };

export default async function ProductDetailPage({ params }: Props) {
  const { id } = await params;

  const [product, session] = await Promise.all([
    prisma.product.findUnique({
      where: { id },
      include: {
        images: { orderBy: { sortOrder: "asc" } },
        seller: { include: { sellerProfile: true } },
        variants: { orderBy: { createdAt: "asc" } },
      },
    }),
    getSession(),
  ]);

  if (!product || product.isDeleted || !product.isActive) notFound();

  const shopName = product.seller.sellerProfile?.shopName ?? "알수없음";
  const totalStock = product.variants.reduce((sum, v) => sum + v.stock, 0);
  const isSoldOut = totalStock <= 0;
  const isSelf = session ? session.userId === product.sellerId : false;

  // Split images by kind
  const mainImages = product.images.filter((i) => i.kind === "MAIN");
  const contentImages = product.images.filter((i) => i.kind === "CONTENT");

  return (
    <Container>
      {/* Main images – Instagram-like horizontal swipe */}
      <ImageCarousel
        images={mainImages.map((i) => ({ url: i.url }))}
        aspect="3/4"
      />

      {/* Product info */}
      <div className="py-6">
        {/* Seller name */}
        <SellerNameText sellerId={product.sellerId} shopName={shopName} />

        {/* Product title + Price */}
        <div className="mt-2 flex items-baseline justify-between gap-4">
          <h1 className="flex-1 min-w-0 text-[18px] font-bold text-black tracking-tight leading-snug">
            {product.title}
          </h1>
          <span className="shrink-0 text-[20px] font-bold text-black tracking-tight">
            ₩{product.priceKrw.toLocaleString()}
          </span>
        </div>

        {/* Seller Actions (self only) */}
        {isSelf && <ProductSellerActions productId={product.id} />}

        {/* Divider */}
        <div className="border-t border-gray-100 my-6" />

        {/* Size selection and CTA */}
        <AddToCartSection
          productId={product.id}
          variants={product.variants}
          isSoldOut={isSoldOut}
          userRole={session?.role ?? null}
        />

        {/* Divider */}
        <div className="border-t border-gray-100 my-6" />

        {/* Description */}
        {(() => {
          // Render structured description if available
          if (product.descriptionJson && typeof product.descriptionJson === "object") {
            const rendered = renderDescriptionForCustomer(product.descriptionJson as any);
            const hasContent = rendered.spec.length > 0 || rendered.detail || rendered.csShipping.length > 0;

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

                {/* Detail Section */}
                {rendered.detail && (
                  <div>
                    <h3 className="text-[14px] font-bold text-gray-900 mb-2">상세 설명</h3>
                    <p className="text-[13px] text-gray-600 leading-relaxed whitespace-pre-wrap">
                      {rendered.detail}
                    </p>
                  </div>
                )}

                {/* CS & Shipping Section */}
                {rendered.csShipping.length > 0 && (
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <h3 className="text-[13px] font-bold text-gray-900 mb-2">배송 및 고객센터</h3>
                    <dl className="space-y-1">
                      {rendered.csShipping.map((item, idx) => (
                        <div key={idx} className="flex text-[12px]">
                          <dt className="w-20 text-gray-500 shrink-0">{item.label}</dt>
                          <dd className="text-gray-700">{item.value}</dd>
                        </div>
                      ))}
                    </dl>
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

        {/* Content images – stacked vertically */}
        {contentImages.length > 0 && (
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

        {/* Wishlist button */}
        <div className="mt-4 flex justify-end">
          <WishlistButton productId={product.id} variant="detail" />
        </div>
      </div>
    </Container>
  );
}
