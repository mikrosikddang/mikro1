import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import Container from "@/components/Container";
import { formatKrw } from "@/lib/format";

type Props = { params: Promise<{ id: string }> };

export default async function ProductDetailPage({ params }: Props) {
  const { id } = await params;

  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      seller: { include: { sellerProfile: true } },
      variants: true,
    },
  });

  if (!product) notFound();

  const shopName = product.seller.sellerProfile?.shopName ?? "알수없음";

  return (
    <Container>
      {/* Product images - stacked vertically */}
      {product.images.length > 0 ? (
        <div className="flex flex-col">
          {product.images.map((img) => (
            <div key={img.id} className="w-full aspect-[3/4] bg-gray-100">
              <img
                src={img.url}
                alt={product.title}
                className="w-full h-full object-cover"
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="w-full aspect-[3/4] bg-gray-100 flex items-center justify-center text-gray-300 text-sm">
          이미지 없음
        </div>
      )}

      {/* Product info */}
      <div className="py-5">
        {/* Seller info */}
        <Link
          href={`/s/${product.sellerId}`}
          className="inline-flex items-center gap-2 mb-3"
        >
          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-[11px] font-bold text-gray-500">
            {shopName.charAt(0)}
          </div>
          <span className="text-[14px] font-medium text-gray-700 hover:text-black transition-colors">
            {shopName}
          </span>
        </Link>

        <h1 className="text-[20px] font-bold text-black leading-tight">
          {product.title}
        </h1>

        <p className="mt-2 text-[24px] font-extrabold text-black">
          {formatKrw(product.priceKrw)}
        </p>

        {/* Variants */}
        {product.variants.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {product.variants.map((v) => (
              <span
                key={v.id}
                className="px-3 py-1.5 rounded-full bg-gray-100 text-[13px] text-gray-600"
              >
                {v.color} / {v.size} (재고 {v.stock})
              </span>
            ))}
          </div>
        )}

        {/* Description */}
        {product.description && (
          <div className="mt-6 pt-5 border-t border-gray-100">
            <p className="text-[14px] text-gray-600 leading-relaxed whitespace-pre-wrap">
              {product.description}
            </p>
          </div>
        )}

        {/* CTA placeholders */}
        <div className="mt-8 flex gap-3">
          <button className="flex-1 h-[52px] bg-black text-white rounded-xl text-[16px] font-bold active:bg-gray-800 transition-colors">
            구매하기
          </button>
          <button className="w-[52px] h-[52px] border border-gray-200 rounded-xl flex items-center justify-center active:bg-gray-50 transition-colors">
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
          </button>
        </div>
      </div>
    </Container>
  );
}
