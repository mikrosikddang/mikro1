import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const sellerId = process.env.MVP_SELLER_ID;
    if (!sellerId) {
      return NextResponse.json({ error: "MVP_SELLER_ID not configured" }, { status: 500 });
    }

    const { id } = await params;
    const product = await prisma.product.findUnique({
      where: { id },
      select: { id: true, title: true, priceKrw: true, description: true, isActive: true, sellerId: true },
    });

    if (!product || product.sellerId !== sellerId) {
      return NextResponse.json({ error: "상품을 찾을 수 없습니다" }, { status: 404 });
    }

    return NextResponse.json(product);
  } catch (err) {
    console.error("product get error:", err);
    return NextResponse.json({ error: "상품 조회에 실패했습니다" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const sellerId = process.env.MVP_SELLER_ID;
    if (!sellerId) {
      return NextResponse.json({ error: "MVP_SELLER_ID not configured" }, { status: 500 });
    }

    const { id } = await params;
    const body = await req.json();
    const { title, priceKrw, description, isActive } = body as {
      title?: string;
      priceKrw?: number;
      description?: string;
      isActive?: boolean;
    };

    // Check product exists and belongs to seller
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing || existing.sellerId !== sellerId) {
      return NextResponse.json({ error: "상품을 찾을 수 없습니다" }, { status: 404 });
    }

    // Build update data
    const data: Record<string, unknown> = {};
    if (title !== undefined) {
      if (typeof title !== "string" || title.trim().length === 0) {
        return NextResponse.json({ error: "상품명을 입력해주세요" }, { status: 400 });
      }
      data.title = title.trim();
    }
    if (priceKrw !== undefined) {
      if (typeof priceKrw !== "number" || priceKrw < 1) {
        return NextResponse.json({ error: "가격을 올바르게 입력해주세요" }, { status: 400 });
      }
      data.priceKrw = priceKrw;
    }
    if (description !== undefined) {
      data.description = typeof description === "string" ? description.trim() || null : null;
    }
    if (isActive !== undefined) {
      data.isActive = Boolean(isActive);
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "수정할 항목이 없습니다" }, { status: 400 });
    }

    const updated = await prisma.product.update({ where: { id }, data });

    return NextResponse.json({ id: updated.id, isActive: updated.isActive });
  } catch (err) {
    console.error("product update error:", err);
    return NextResponse.json({ error: "상품 수정에 실패했습니다" }, { status: 500 });
  }
}
