import { prisma } from "@/lib/prisma";
import Container from "@/components/Container";
import ProductCard from "@/components/ProductCard";

export default async function HomePage() {
  const products = await prisma.product.findMany({
    where: { status: "ACTIVE", isActive: true },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: {
      images: { orderBy: { sortOrder: "asc" }, take: 1 },
      seller: { include: { sellerProfile: true } },
    },
  });

  return (
    <Container>
      <div className="flex flex-col">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            id={product.id}
            title={product.title}
            priceKrw={product.priceKrw}
            imageUrl={product.images[0]?.url ?? null}
            shopName={product.seller.sellerProfile?.shopName ?? "알수없음"}
            sellerId={product.sellerId}
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
