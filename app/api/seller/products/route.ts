import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    // Auth guard: SELLER only
    const session = await requireRole("SELLER");
    if (!session) {
      return NextResponse.json(
        { error: "로그인이 필요합니다 (판매자 전용)" },
        { status: 401 },
      );
    }

    const sellerId = session.userId;

    const body = await req.json();
    const { title, priceKrw, stock, category, description, imageUrls } = body as {
      title: string;
      priceKrw: number;
      stock?: number;
      category?: string;
      description?: string;
      imageUrls: string[];
    };

    // Validation
    if (!title || typeof title !== "string" || title.trim().length === 0) {
      return NextResponse.json({ error: "상품명을 입력해주세요" }, { status: 400 });
    }
    if (!priceKrw || typeof priceKrw !== "number" || priceKrw < 1) {
      return NextResponse.json({ error: "가격을 올바르게 입력해주세요" }, { status: 400 });
    }
    if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
      return NextResponse.json({ error: "이미지를 1장 이상 올려주세요" }, { status: 400 });
    }

    const stockValue = typeof stock === "number" && stock >= 0 ? stock : 0;

    const product = await prisma.product.create({
      data: {
        sellerId,
        title: title.trim(),
        priceKrw,
        category: category?.trim() || null,
        description: description?.trim() || null,
        status: "ACTIVE",
        images: {
          create: imageUrls.map((url, i) => ({
            url,
            sortOrder: i,
          })),
        },
        variants: {
          create: [{ color: "FREE", size: "FREE", stock: stockValue }],
        },
      },
    });

    return NextResponse.json({ id: product.id });
  } catch (err) {
    console.error("product creation error:", err);
    return NextResponse.json(
      { error: "상품 등록에 실패했습니다" },
      { status: 500 },
    );
  }
}
