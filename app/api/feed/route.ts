import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getCustomerVisibleProductWhere } from "@/lib/publicVisibility";

export const runtime = "nodejs";

const PAGE_SIZE = 20;

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const cursor = searchParams.get("cursor");
  const main = searchParams.get("main");
  const mid = searchParams.get("mid");
  const sub = searchParams.get("sub");
  const q = searchParams.get("q");
  const category = searchParams.get("category");

  const categoryMap: Record<string, string> = {
    pants: "바지",
    outer: "아우터",
    short: "반팔티",
    long: "긴팔티",
    knit: "니트",
  };
  const dbCategory = category ? categoryMap[category] : undefined;

  const session = await getSession();
  let hiddenIds: string[] = [];
  if (session) {
    const hidden = await prisma.hiddenProduct.findMany({
      where: { userId: session.userId },
      select: { productId: true },
    });
    hiddenIds = hidden.map((h) => h.productId);
  }

  const where = getCustomerVisibleProductWhere({
    ...(hiddenIds.length > 0 ? { id: { notIn: hiddenIds } } : {}),
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" as const } },
            { categoryMain: { contains: q, mode: "insensitive" as const } },
            { categoryMid: { contains: q, mode: "insensitive" as const } },
            { categorySub: { contains: q, mode: "insensitive" as const } },
            { variants: { some: { color: { contains: q, mode: "insensitive" as const } } } },
          ],
        }
      : {}),
    ...(!q && main ? { categoryMain: main } : {}),
    ...(!q && mid ? { categoryMid: mid } : {}),
    ...(!q && sub ? { categorySub: sub } : {}),
    ...(!q && dbCategory && !main ? { category: dbCategory } : {}),
  });

  const products = await prisma.product.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: PAGE_SIZE + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: {
      images: {
        orderBy: [{ kind: "asc" }, { sortOrder: "asc" }],
      },
      seller: { include: { sellerProfile: true } },
    },
  });

  const hasMore = products.length > PAGE_SIZE;
  const items = hasMore ? products.slice(0, PAGE_SIZE) : products;
  const nextCursor = hasMore ? items[items.length - 1].id : null;

  return NextResponse.json({ items, nextCursor });
}
