import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
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
    const { id } = await params;

    const product = await prisma.product.findUnique({
      where: { id },
      include: { variants: true },
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
    // Auth guard: SELLER only
    const session = await requireRole("SELLER");
    if (!session) {
      return NextResponse.json(
        { error: "로그인이 필요합니다 (판매자 전용)" },
        { status: 401 },
      );
    }

    const sellerId = session.userId;
    const { id } = await params;
    const body = await req.json();
    const { title, priceKrw, description, isActive, isDeleted, stock } = body as {
      title?: string;
      priceKrw?: number;
      description?: string;
      isActive?: boolean;
      isDeleted?: boolean;
      stock?: number;
    };

    // Check product exists and belongs to this seller
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing || existing.sellerId !== sellerId) {
      return NextResponse.json({ error: "상품을 찾을 수 없습니다" }, { status: 404 });
    }

    // Build product update data
    const productData: Record<string, unknown> = {};
    if (title !== undefined) {
      if (typeof title !== "string" || title.trim().length === 0) {
        return NextResponse.json({ error: "상품명을 입력해주세요" }, { status: 400 });
      }
      productData.title = title.trim();
    }
    if (priceKrw !== undefined) {
      if (typeof priceKrw !== "number" || priceKrw < 1) {
        return NextResponse.json({ error: "가격을 올바르게 입력해주세요" }, { status: 400 });
      }
      productData.priceKrw = priceKrw;
    }
    if (description !== undefined) {
      productData.description = typeof description === "string" ? description.trim() || null : null;
    }
    if (isActive !== undefined) {
      productData.isActive = Boolean(isActive);
    }
    if (isDeleted !== undefined) {
      productData.isDeleted = Boolean(isDeleted);
    }

    // Build variant update data
    const variantData: Record<string, unknown> = {};
    if (stock !== undefined) {
      if (typeof stock !== "number" || stock < 0) {
        return NextResponse.json({ error: "재고를 올바르게 입력해주세요" }, { status: 400 });
      }
      variantData.stock = stock;
    }

    if (Object.keys(productData).length === 0 && Object.keys(variantData).length === 0) {
      return NextResponse.json({ error: "수정할 항목이 없습니다" }, { status: 400 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      let updatedProduct = existing;

      if (Object.keys(productData).length > 0) {
        updatedProduct = await tx.product.update({ where: { id }, data: productData });
      }

      if (Object.keys(variantData).length > 0) {
        const defaultVariant = await tx.productVariant.findFirst({ where: { productId: id } });
        if (defaultVariant) {
          await tx.productVariant.update({
            where: { id: defaultVariant.id },
            data: variantData,
          });
        }
      }

      return updatedProduct;
    });

    return NextResponse.json({ id: updated.id, isActive: updated.isActive, isDeleted: updated.isDeleted });
  } catch (err) {
    console.error("product update error:", err);
    return NextResponse.json({ error: "상품 수정에 실패했습니다" }, { status: 500 });
  }
}
