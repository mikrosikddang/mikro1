import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { requireRole } from "@/lib/auth";
import { sanitizeDescriptionJson } from "@/lib/descriptionSchema";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

/* ------------------------------------------------------------------ */
/*  GET /api/seller/products/[id]                                      */
/*  Returns product with images grouped by kind + variants             */
/* ------------------------------------------------------------------ */
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const session = await requireRole("SELLER");
    if (!session) {
      return NextResponse.json({ error: "로그인이 필요합니다 (판매자 전용)" }, { status: 401 });
    }

    const sellerId = session.userId;
    const { id } = await params;

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        images: { orderBy: { sortOrder: "asc" } },
        variants: { orderBy: { createdAt: "asc" } },
      },
    });

    if (!product || product.sellerId !== sellerId) {
      return NextResponse.json({ error: "상품을 찾을 수 없습니다" }, { status: 404 });
    }

    // Group images by kind
    const mainImages = product.images
      .filter((i) => i.kind === "MAIN")
      .map((i) => ({ id: i.id, url: i.url, sortOrder: i.sortOrder }));
    const contentImages = product.images
      .filter((i) => i.kind === "CONTENT")
      .map((i) => ({ id: i.id, url: i.url, sortOrder: i.sortOrder }));

    return NextResponse.json({
      ...product,
      mainImages,
      contentImages,
    });
  } catch (err) {
    console.error("product get error:", err);
    return NextResponse.json({ error: "상품 조회에 실패했습니다" }, { status: 500 });
  }
}

/* ------------------------------------------------------------------ */
/*  PATCH /api/seller/products/[id]                                    */
/*  Update product scalars + replace images/variants in transaction     */
/* ------------------------------------------------------------------ */
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await requireRole("SELLER");
    if (!session) {
      return NextResponse.json({ error: "로그인이 필요합니다 (판매자 전용)" }, { status: 401 });
    }

    const sellerId = session.userId;
    const { id } = await params;
    const body = await req.json();
    const {
      title,
      priceKrw,
      category,
      description,
      descriptionJson,
      isActive,
      mainImages,
      contentImages,
      variants,
    } = body as {
      title?: string;
      priceKrw?: number;
      category?: string;
      description?: string;
      descriptionJson?: any;
      isActive?: boolean;
      mainImages?: string[];
      contentImages?: string[];
      variants?: { color?: string; sizeLabel: string; stock: number }[];
    };

    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing || existing.sellerId !== sellerId) {
      return NextResponse.json({ error: "상품을 찾을 수 없습니다" }, { status: 404 });
    }

    // ---- Validate scalars ----
    const productData: Record<string, unknown> = {};

    if (title !== undefined) {
      if (typeof title !== "string" || title.trim().length === 0) {
        return NextResponse.json({ error: "상품명을 입력해주세요" }, { status: 400 });
      }
      productData.title = title.trim();
    }
    if (priceKrw !== undefined) {
      if (typeof priceKrw !== "number" || priceKrw < 0) {
        return NextResponse.json({ error: "가격을 올바르게 입력해주세요" }, { status: 400 });
      }
      productData.priceKrw = priceKrw;
    }
    if (category !== undefined) {
      productData.category = typeof category === "string" ? category.trim() || null : null;
    }
    if (description !== undefined) {
      productData.description = typeof description === "string" ? description.trim() || null : null;
    }
    if (descriptionJson !== undefined) {
      productData.descriptionJson = descriptionJson ? (sanitizeDescriptionJson(descriptionJson) as unknown as Prisma.InputJsonValue) : Prisma.JsonNull;
    }
    if (isActive !== undefined) {
      productData.isActive = Boolean(isActive);
    }

    // ---- Validate images ----
    if (mainImages !== undefined) {
      if (!Array.isArray(mainImages) || mainImages.length === 0) {
        return NextResponse.json({ error: "대표 이미지를 1장 이상 올려주세요" }, { status: 400 });
      }
      if (mainImages.length > 10) {
        return NextResponse.json({ error: "대표 이미지는 최대 10장입니다" }, { status: 400 });
      }
    }
    if (contentImages !== undefined && contentImages.length > 20) {
      return NextResponse.json({ error: "상세 이미지는 최대 20장입니다" }, { status: 400 });
    }

    // ---- Validate variants ----
    if (variants !== undefined) {
      if (!Array.isArray(variants) || variants.length === 0) {
        return NextResponse.json({ error: "사이즈/재고를 1개 이상 입력해주세요" }, { status: 400 });
      }
      const seenCombos = new Set<string>();
      for (const v of variants) {
        const color = (v.color || "FREE").trim().toUpperCase();
        const label = (v.sizeLabel || "").trim().toUpperCase();
        if (!label) {
          return NextResponse.json({ error: "사이즈명을 입력해주세요" }, { status: 400 });
        }
        const combo = `${color}|${label}`;
        if (seenCombos.has(combo)) {
          return NextResponse.json({ error: `중복된 옵션: ${color} ${label}` }, { status: 400 });
        }
        seenCombos.add(combo);
        if (typeof v.stock !== "number" || v.stock < 0 || !Number.isInteger(v.stock)) {
          return NextResponse.json({ error: "재고는 0 이상 정수를 입력해주세요" }, { status: 400 });
        }
      }
    }

    // Check if anything to update
    const hasScalars = Object.keys(productData).length > 0;
    const hasImages = mainImages !== undefined || contentImages !== undefined;
    const hasVariants = variants !== undefined;

    if (!hasScalars && !hasImages && !hasVariants) {
      return NextResponse.json({ error: "수정할 항목이 없습니다" }, { status: 400 });
    }

    // ---- Transaction ----
    const updated = await prisma.$transaction(async (tx) => {
      // Update scalar fields
      const updatedProduct = hasScalars
        ? await tx.product.update({ where: { id }, data: productData })
        : existing;

      // Replace images (delete + recreate per kind)
      if (mainImages !== undefined) {
        await tx.productImage.deleteMany({ where: { productId: id, kind: "MAIN" } });
        await tx.productImage.createMany({
          data: mainImages.map((url: string, i: number) => ({
            productId: id,
            url,
            kind: "MAIN" as const,
            sortOrder: i,
          })),
        });
      }
      if (contentImages !== undefined) {
        await tx.productImage.deleteMany({ where: { productId: id, kind: "CONTENT" } });
        if (contentImages.length > 0) {
          await tx.productImage.createMany({
            data: contentImages.map((url: string, i: number) => ({
              productId: id,
              url,
              kind: "CONTENT" as const,
              sortOrder: i,
            })),
          });
        }
      }

      // Replace variants (delete + recreate)
      if (variants !== undefined) {
        await tx.productVariant.deleteMany({ where: { productId: id } });
        await tx.productVariant.createMany({
          data: variants.map((v) => ({
            productId: id,
            color: (v.color || "FREE").trim().toUpperCase(),
            sizeLabel: v.sizeLabel.trim().toUpperCase(),
            stock: v.stock,
          })),
        });
      }

      return updatedProduct;
    });

    return NextResponse.json({
      id: updated.id,
      isActive: updated.isActive,
    });
  } catch (err) {
    console.error("product update error:", err);
    return NextResponse.json({ error: "상품 수정에 실패했습니다" }, { status: 500 });
  }
}

/* ------------------------------------------------------------------ */
/*  DELETE /api/seller/products/[id]                                    */
/*  Soft delete: sets isDeleted=true                                   */
/* ------------------------------------------------------------------ */
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await requireRole("SELLER");
    if (!session) {
      return NextResponse.json({ error: "로그인이 필요합니다 (판매자 전용)" }, { status: 401 });
    }

    const sellerId = session.userId;
    const { id } = await params;

    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing || existing.sellerId !== sellerId) {
      return NextResponse.json({ error: "상품을 찾을 수 없습니다" }, { status: 404 });
    }

    // Always soft delete
    // TODO: 추후 주문 연동 시 hard delete 정책 확장 가능
    await prisma.product.update({ where: { id }, data: { isDeleted: true } });

    return NextResponse.json({ id, deleted: "soft" });
  } catch (err) {
    console.error("product delete error:", err);
    return NextResponse.json({ error: "상품 삭제에 실패했습니다" }, { status: 500 });
  }
}
