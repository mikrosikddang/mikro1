import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Container from "@/components/Container";
import ProductCard from "@/components/ProductCard";

type Props = { params: Promise<{ sellerId: string }> };

export default async function SellerShopPage({ params }: Props) {
  const { sellerId } = await params;

  const seller = await prisma.user.findUnique({
    where: { id: sellerId },
    include: { sellerProfile: true },
  });

  if (!seller || !seller.sellerProfile) notFound();

  const profile = seller.sellerProfile;

  const products = await prisma.product.findMany({
    where: { sellerId, status: "ACTIVE", isActive: true },
    orderBy: { createdAt: "desc" },
    include: {
      images: { orderBy: { sortOrder: "asc" }, take: 1 },
      seller: { include: { sellerProfile: true } },
    },
  });

  return (
    <Container>
      {/* Shop header */}
      <div className="py-6 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 bg-gray-200 rounded-full flex items-center justify-center text-[20px] font-bold text-gray-500">
            {profile.shopName.charAt(0)}
          </div>
          <div>
            <h1 className="text-[20px] font-bold text-black">
              {profile.shopName}
            </h1>
            <p className="text-[13px] text-gray-500 mt-0.5">
              {[profile.marketBuilding, profile.floor && `${profile.floor}층`, profile.roomNo]
                .filter(Boolean)
                .join(" · ") || "위치 정보 없음"}
            </p>
          </div>
        </div>
        {profile.type && (
          <span className="mt-3 inline-block px-3 py-1 rounded-full bg-gray-100 text-[12px] text-gray-600">
            {profile.type}
          </span>
        )}
      </div>

      {/* Product count */}
      <div className="py-4">
        <p className="text-[14px] text-gray-500">
          상품 <span className="font-bold text-black">{products.length}</span>개
        </p>
      </div>

      {/* Product list */}
      <div className="flex flex-col">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            id={product.id}
            title={product.title}
            priceKrw={product.priceKrw}
            imageUrl={product.images[0]?.url ?? null}
            shopName={profile.shopName}
            sellerId={sellerId}
          />
        ))}

        {products.length === 0 && (
          <p className="py-20 text-center text-gray-400 text-sm">
            등록된 상품이 없습니다.
          </p>
        )}
      </div>
    </Container>
  );
}
