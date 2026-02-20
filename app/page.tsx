import Link from "next/link";
import { prisma } from "@/lib/prisma";
import Container from "@/components/Container";
import HomeClientView from "@/components/HomeClientView";

/** Map English URL slugs → Korean category values stored in DB */
const categoryMap: Record<string, string> = {
  pants: "바지",
  outer: "아우터",
  short: "반팔티",
  long: "긴팔티",
  knit: "니트",
};

const categoryLabels = Object.entries(categoryMap);

type Props = {
  searchParams: Promise<{ category?: string }>;
};

export default async function HomePage({ searchParams }: Props) {
  const { category } = await searchParams;

  const dbCategory = category ? categoryMap[category] : undefined;

  const products = await prisma.product.findMany({
    where: {
      isActive: true,
      isDeleted: false,
      ...(dbCategory ? { category: dbCategory } : {}),
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
      {/* Category chips */}
      <div className="flex gap-2 overflow-x-auto py-3 scrollbar-hide">
        <Link
          href="/"
          className={`shrink-0 px-3.5 py-1.5 rounded-full text-[13px] font-medium transition-colors ${
            !category
              ? "bg-black text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          전체
        </Link>
        {categoryLabels.map(([slug, label]) => (
          <Link
            key={slug}
            href={`/?category=${slug}`}
            className={`shrink-0 px-3.5 py-1.5 rounded-full text-[13px] font-medium transition-colors ${
              category === slug
                ? "bg-black text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {label}
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
            {dbCategory
              ? `"${dbCategory}" 카테고리에 상품이 없습니다.`
              : "등록된 상품이 없습니다."}
          </p>
          {dbCategory && (
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
