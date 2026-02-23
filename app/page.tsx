import Link from "next/link";
import { prisma } from "@/lib/prisma";
import Container from "@/components/Container";
import HomeClientView from "@/components/HomeClientView";
import { MAIN_CATEGORIES } from "@/lib/categories";

/** DEPRECATED: Old category mapping */
const categoryMap: Record<string, string> = {
  pants: "바지",
  outer: "아우터",
  short: "반팔티",
  long: "긴팔티",
  knit: "니트",
};

type Props = {
  searchParams: Promise<{ category?: string; main?: string }>;
};

export default async function HomePage({ searchParams }: Props) {
  const { category, main } = await searchParams;

  const dbCategory = category ? categoryMap[category] : undefined; // DEPRECATED

  const products = await prisma.product.findMany({
    where: {
      isActive: true,
      isDeleted: false,
      // New 3-depth category filter (main only for now)
      ...(main ? { categoryMain: main } : {}),
      // Fallback to old category for backward compatibility
      ...(dbCategory && !main ? { category: dbCategory } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: {
      images: { where: { kind: "MAIN" }, orderBy: { sortOrder: "asc" } },
      seller: { include: { sellerProfile: true } },
    },
  });

  return (
    <Container>
      {/* Category chips (3-depth main category) */}
      <div className="flex gap-2 overflow-x-auto py-3 scrollbar-hide">
        <Link
          href="/"
          className={`shrink-0 px-3.5 py-1.5 rounded-full text-[13px] font-medium transition-colors ${
            !main && !category
              ? "bg-black text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          전체
        </Link>
        {/* New 3-depth category filters */}
        {MAIN_CATEGORIES.map((mainCat) => (
          <Link
            key={mainCat}
            href={`/?main=${encodeURIComponent(mainCat)}`}
            className={`shrink-0 px-3.5 py-1.5 rounded-full text-[13px] font-medium transition-colors ${
              main === mainCat
                ? "bg-black text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {mainCat}
          </Link>
        ))}
      </div>

      {/* View mode switcher (feed or carrot list) */}
      {products.length > 0 ? (
        <HomeClientView products={products} />
      ) : (
        <div className="py-20 text-center">
          <p className="text-[40px] mb-3">🔍</p>
          <p className="text-gray-400 text-sm">
            {main
              ? `"${main}" 카테고리에 상품이 없습니다.`
              : dbCategory
              ? `"${dbCategory}" 카테고리에 상품이 없습니다.`
              : "등록된 상품이 없습니다."}
          </p>
          {(main || dbCategory) && (
            <Link
              href="/"
              className="inline-block mt-4 px-5 py-2.5 bg-black text-white rounded-xl text-[13px] font-medium"
            >
              전체 보기
            </Link>
          )}
        </div>
      )}
    </Container>
  );
}
