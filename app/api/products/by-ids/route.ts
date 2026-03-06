import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPublicProductWhere } from "@/lib/publicVisibility";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { ids } = (await request.json()) as { ids?: string[] };

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json([]);
    }

    // Limit to 50 to prevent abuse
    const safeIds = ids.slice(0, 50);

    const products = await prisma.product.findMany({
      where: getPublicProductWhere({ id: { in: safeIds } }),
      include: {
        images: { where: { kind: "MAIN" }, orderBy: { sortOrder: "asc" } },
        seller: { include: { sellerProfile: true } },
        variants: { orderBy: { createdAt: "asc" } },
      },
    });

    // Preserve the order of ids
    const productMap = new Map(products.map((p) => [p.id, p]));
    const ordered = safeIds
      .map((id) => productMap.get(id))
      .filter(Boolean);

    return NextResponse.json(ordered);
  } catch (error) {
    console.error("by-ids error:", error);
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}
