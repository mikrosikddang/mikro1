import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const sellerId = process.env.MVP_SELLER_ID;
    if (!sellerId) {
      return NextResponse.json(
        { error: "MVP_SELLER_ID not configured" },
        { status: 500 },
      );
    }

    const body = await req.json();
    const { title, priceKrw, category, description, imageUrls } = body as {
      title: string;
      priceKrw: number;
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
          create: [{ color: "FREE", size: "FREE", stock: 9 }],
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
