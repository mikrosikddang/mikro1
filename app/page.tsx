import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import HomeClientView from "@/components/HomeClientView";
import {
  MAIN_CATEGORIES,
  getMidCategories,
  getSubCategories,
  type CategoryMain,
} from "@/lib/categories";

export const revalidate = 30; // ISR: 30초

/** DEPRECATED: Old category mapping */
const categoryMap: Record<string, string> = {
  pants: "바지",
  outer: "아우터",
  short: "반팔티",
  long: "긴팔티",
  knit: "니트",
};

type Props = {
  searchParams: Promise<{
    category?: string;
    main?: string;
    mid?: string;
    sub?: string;
  }>;
};

export default async function HomePage({ searchParams }: Props) {
  const { category, main, mid, sub } = await searchParams;

  const dbCategory = category ? categoryMap[category] : undefined; // DEPRECATED

  // Fetch hidden product IDs for logged-in user
  const session = await getSession();
  let hiddenIds: string[] = [];
  if (session) {
    const hidden = await prisma.hiddenProduct.findMany({
      where: { userId: session.userId },
      select: { productId: true },
    });
    hiddenIds = hidden.map((h) => h.productId);
  }

  const products = await prisma.product.findMany({
    where: {
      isActive: true,
      isDeleted: false,
      ...(hiddenIds.length > 0 ? { id: { notIn: hiddenIds } } : {}),
      // New 3-depth category filter
      ...(main ? { categoryMain: main } : {}),
      ...(mid ? { categoryMid: mid } : {}),
      ...(sub ? { categorySub: sub } : {}),
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

  // Determine drill-down level and chips
  const isMainLevel = !main;
  const isMidLevel = !!main && !mid;
  const isSubLevel = !!main && !!mid;

  // Build category label for empty state
  const categoryLabel = sub
    ? `${main} > ${mid} > ${sub}`
    : mid
    ? `${main} > ${mid}`
    : main || dbCategory || null;

  return (
    <div className="mx-auto w-full max-w-[420px]">
      <div className="px-4">
      {/* Breadcrumb (visible when drilled into mid or sub level) */}
      {main && (
        <div className="flex items-center gap-1 px-1 pt-3 pb-1 text-[12px] text-gray-400">
          <Link href="/" className="hover:text-gray-600 transition-colors">
            전체
          </Link>
          <span>/</span>
          {isMidLevel ? (
            <span className="text-gray-700 font-medium">{main}</span>
          ) : (
            <Link
              href={`/?main=${encodeURIComponent(main)}`}
              className="hover:text-gray-600 transition-colors"
            >
              {main}
            </Link>
          )}
          {mid && (
            <>
              <span>/</span>
              {sub ? (
                <Link
                  href={`/?main=${encodeURIComponent(main)}&mid=${encodeURIComponent(mid)}`}
                  className="hover:text-gray-600 transition-colors"
                >
                  {mid}
                </Link>
              ) : (
                <span className="text-gray-700 font-medium">{mid}</span>
              )}
            </>
          )}
          {sub && (
            <>
              <span>/</span>
              <span className="text-gray-700 font-medium">{sub}</span>
            </>
          )}
        </div>
      )}

      {/* Category chips (3-depth drill-down) */}
      <div
        key={`chips-${main || ''}-${mid || ''}`}
        className="flex gap-2 overflow-x-auto py-3 scrollbar-hide chip-fade-in"
      >
        {/* Level 0: Main categories */}
        {isMainLevel && (
          <>
            <Link
              href="/"
              className="shrink-0 px-3.5 py-1.5 rounded-full text-[13px] font-medium bg-black text-white"
            >
              전체
            </Link>
            {MAIN_CATEGORIES.map((mainCat) => (
              <Link
                key={mainCat}
                href={`/?main=${encodeURIComponent(mainCat)}`}
                className="shrink-0 px-3.5 py-1.5 rounded-full text-[13px] font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
              >
                {mainCat}
              </Link>
            ))}
          </>
        )}

        {/* Level 1: Mid categories (main selected) */}
        {isMidLevel && (
          <>
            <Link
              href="/"
              className="shrink-0 px-3.5 py-1.5 rounded-full text-[13px] font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors flex items-center"
            >
              <svg className="w-3 h-3 mr-0.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              전체
            </Link>
            {getMidCategories(main as CategoryMain).map((midCat) => (
              <Link
                key={midCat}
                href={`/?main=${encodeURIComponent(main)}&mid=${encodeURIComponent(midCat)}`}
                className="shrink-0 px-3.5 py-1.5 rounded-full text-[13px] font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
              >
                {midCat}
              </Link>
            ))}
          </>
        )}

        {/* Level 2: Sub categories (main + mid selected) */}
        {isSubLevel && (
          <>
            <Link
              href={`/?main=${encodeURIComponent(main)}`}
              className="shrink-0 px-3.5 py-1.5 rounded-full text-[13px] font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors flex items-center"
            >
              <svg className="w-3 h-3 mr-0.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              {mid}
            </Link>
            {getSubCategories(main as CategoryMain, mid).map((subCat) => (
              <Link
                key={subCat}
                href={`/?main=${encodeURIComponent(main)}&mid=${encodeURIComponent(mid)}&sub=${encodeURIComponent(subCat)}`}
                className={`shrink-0 px-3.5 py-1.5 rounded-full text-[13px] font-medium transition-colors ${
                  sub === subCat
                    ? "bg-black text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {subCat}
              </Link>
            ))}
          </>
        )}
      </div>
      </div>

      {/* View mode switcher (feed or carrot list) */}
      {products.length > 0 ? (
        <HomeClientView products={products} />
      ) : (
        <div className="px-4 py-20 text-center">
          <p className="text-[40px] mb-3">🔍</p>
          <p className="text-gray-400 text-sm">
            {categoryLabel
              ? `"${categoryLabel}" 카테고리에 상품이 없습니다.`
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
    </div>
  );
}
