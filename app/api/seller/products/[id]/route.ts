import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getSession } from "@/lib/auth";
import { requireSeller } from "@/lib/roleGuards";
import { sanitizeDescriptionJson } from "@/lib/descriptionSchema";
import { validateFlatVariants, formatValidationErrors } from "@/lib/variantValidation";
import { normalizeVariantInput, variantsEqual } from "@/lib/variantNormalize";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

/* ------------------------------------------------------------------ */
/*  GET /api/seller/products/[id]                                      */
/*  Returns product with images grouped by kind + variants             */
/* ------------------------------------------------------------------ */
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const _session = await getSession();
    const session = requireSeller(_session);

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
    const _session = await getSession();
    const session = requireSeller(_session);

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
      variants?: { id?: string; color?: string; sizeLabel: string; stock: number }[];
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
      // Normalize variants for validation
      const normalizedVariants = variants.map((v) => ({
        id: v.id,
        color: v.color || "FREE",
        sizeLabel: v.sizeLabel,
        stock: v.stock,
      }));
      const variantErrors = validateFlatVariants(normalizedVariants);
      if (variantErrors.length > 0) {
        return NextResponse.json(
          { error: formatValidationErrors(variantErrors) },
          { status: 400 }
        );
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

      // Diff-based variant update (FK-safe with normalization)
      if (variants !== undefined) {
        // Normalize incoming variants
        const normalizedIncoming = variants.map((v) => normalizeVariantInput(v));

        // Fetch existing variants
        const existingVariants = await tx.productVariant.findMany({
          where: { productId: id },
        });

        const existingById = new Map(existingVariants.map((v) => [v.id, v]));
        const incomingIds = new Set(
          normalizedIncoming.filter((v) => v.id).map((v) => v.id!)
        );

        // Identify variants to delete
        const toDeleteIds = existingVariants
          .filter((v) => !incomingIds.has(v.id))
          .map((v) => v.id);

        // FK SAFETY: Check if any to-delete variants are referenced
        if (toDeleteIds.length > 0) {
          const [cartRefs, orderRefs] = await Promise.all([
            tx.cartItem.count({
              where: { variantId: { in: toDeleteIds } },
            }),
            tx.orderItem.count({
              where: { variantId: { in: toDeleteIds } },
            }),
          ]);

          if (cartRefs > 0 || orderRefs > 0) {
            throw new Error(
              "VARIANT_IN_USE: Cannot delete variant used in cart or orders"
            );
          }
        }

        // Identify variants to update (check for color/sizeLabel changes)
        const toUpdate: typeof normalizedIncoming = [];
        const toUpdateWithChange: string[] = []; // Track variants with semantic changes

        for (const v of normalizedIncoming) {
          if (v.id && existingById.has(v.id)) {
            const existing = existingById.get(v.id)!;
            const semanticChange = !variantsEqual(
              { color: existing.color, sizeLabel: existing.sizeLabel },
              { color: v.color, sizeLabel: v.sizeLabel }
            );

            if (semanticChange) {
              // Color or sizeLabel changed - treat as delete+create
              toUpdateWithChange.push(v.id);
            } else {
              // Only stock changed - safe to update
              toUpdate.push(v);
            }
          }
        }

        // FK SAFETY: Block semantic changes to variants in use
        if (toUpdateWithChange.length > 0) {
          const [cartRefs, orderRefs] = await Promise.all([
            tx.cartItem.count({
              where: { variantId: { in: toUpdateWithChange } },
            }),
            tx.orderItem.count({
              where: { variantId: { in: toUpdateWithChange } },
            }),
          ]);

          if (cartRefs > 0 || orderRefs > 0) {
            throw new Error(
              "VARIANT_IN_USE: Cannot change color/size of variant used in cart or orders"
            );
          }
        }

        // 1. Update variants (stock-only changes)
        for (const v of toUpdate) {
          await tx.productVariant.update({
            where: { id: v.id },
            data: {
              color: v.color,
              sizeLabel: v.sizeLabel,
              stock: v.stock,
            },
          });
        }

        // 2. Delete variants with semantic changes (already verified safe)
        if (toUpdateWithChange.length > 0) {
          await tx.productVariant.deleteMany({
            where: { id: { in: toUpdateWithChange } },
          });
        }

        // 3. Delete variants not in request (already verified safe)
        if (toDeleteIds.length > 0) {
          await tx.productVariant.deleteMany({
            where: { id: { in: toDeleteIds } },
          });
        }

        // 4. Create new variants (no id, id not found, or semantic change)
        const toCreate = normalizedIncoming.filter(
          (v) => !v.id || !existingById.has(v.id) || toUpdateWithChange.includes(v.id!)
        );

        if (toCreate.length > 0) {
          await tx.productVariant.createMany({
            data: toCreate.map((v) => ({
              productId: id,
              color: v.color,
              sizeLabel: v.sizeLabel,
              stock: v.stock,
            })),
          });
        }
      }

      return updatedProduct;
    });

    return NextResponse.json({
      id: updated.id,
      isActive: updated.isActive,
    });
  } catch (err) {
    console.error("product update error:", err);

    // Handle FK violation errors
    if (err instanceof Error) {
      if (err.message.includes("VARIANT_IN_USE")) {
        return NextResponse.json(
          { error: "장바구니나 주문에 사용 중인 옵션은 삭제하거나 변경할 수 없습니다" },
          { status: 409 }
        );
      }
    }

    return NextResponse.json({ error: "상품 수정에 실패했습니다" }, { status: 500 });
  }
}

/* ------------------------------------------------------------------ */
/*  DELETE /api/seller/products/[id]                                    */
/*  Soft delete: sets isDeleted=true                                   */
/* ------------------------------------------------------------------ */
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const _session = await getSession();
    const session = requireSeller(_session);

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
