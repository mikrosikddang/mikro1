import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getSession } from "@/lib/auth";
import { requireSeller } from "@/lib/roleGuards";
import { sanitizeDescriptionJson } from "@/lib/descriptionSchema";
import { validateFlatVariants, formatValidationErrors } from "@/lib/variantValidation";
import { normalizeVariantInput } from "@/lib/variantNormalize";
import { validateCategory } from "@/lib/categories";
import { revalidatePath } from "next/cache";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const _session = await getSession();
    const session = requireSeller(_session);

    const sellerId = session.userId;
    const body = await req.json();
    const {
      title,
      priceKrw,
      category, // DEPRECATED
      categoryMain,
      categoryMid,
      categorySub,
      description,
      descriptionJson,
      mainImages,
      contentImages,
      colorImages,
      variants,
    } = body as {
      title: string;
      priceKrw: number;
      salePriceKrw?: number | null;
      category?: string; // DEPRECATED
      categoryMain?: string;
      categoryMid?: string;
      categorySub?: string;
      description?: string;
      descriptionJson?: any;
      mainImages: string[];
      contentImages?: string[];
      colorImages?: { colorKey: string; urls: string[] }[];
      variants: { color?: string; sizeLabel: string; stock: number }[];
    };

    const salePriceKrw = body.salePriceKrw;

    // ---- Validation ----
    if (!title || typeof title !== "string" || title.trim().length === 0) {
      return NextResponse.json({ error: "상품명을 입력해주세요" }, { status: 400 });
    }
    if (typeof priceKrw !== "number" || priceKrw < 0) {
      return NextResponse.json({ error: "가격을 올바르게 입력해주세요" }, { status: 400 });
    }
    if (salePriceKrw != null) {
      if (typeof salePriceKrw !== "number" || salePriceKrw < 0) {
        return NextResponse.json({ error: "할인가를 올바르게 입력해주세요" }, { status: 400 });
      }
      if (salePriceKrw >= priceKrw) {
        return NextResponse.json({ error: "할인가는 정가보다 낮아야 합니다" }, { status: 400 });
      }
    }
    // Validate 3-depth category (required)
    if (!validateCategory(categoryMain, categoryMid, categorySub)) {
      return NextResponse.json(
        { error: "카테고리를 올바르게 선택해주세요 (성별 > 카테고리 > 세부 카테고리)" },
        { status: 400 }
      );
    }
    if (!mainImages || !Array.isArray(mainImages) || mainImages.length === 0) {
      return NextResponse.json({ error: "대표 이미지를 1장 이상 올려주세요" }, { status: 400 });
    }
    if (mainImages.length > 10) {
      return NextResponse.json({ error: "대표 이미지는 최대 10장입니다" }, { status: 400 });
    }
    if (contentImages && contentImages.length > 20) {
      return NextResponse.json({ error: "상세 이미지는 최대 20장입니다" }, { status: 400 });
    }
    // Validate variants using shared validation
    const normalizedVariants = variants.map((v) => ({
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

    // ---- Transaction ----
    const product = await prisma.$transaction(async (tx) => {
      const p = await tx.product.create({
        data: {
          sellerId,
          title: title.trim(),
          priceKrw,
          salePriceKrw: salePriceKrw ?? null,
          category: category?.trim() || null, // DEPRECATED
          categoryMain: categoryMain || null,
          categoryMid: categoryMid || null,
          categorySub: categorySub || null,
          description: description?.trim() || null,
          descriptionJson: descriptionJson ? (sanitizeDescriptionJson(descriptionJson) as unknown as Prisma.InputJsonValue) : Prisma.JsonNull,
        },
      });

      // Create MAIN images
      await tx.productImage.createMany({
        data: mainImages.map((url: string, i: number) => ({
          productId: p.id,
          url,
          kind: "MAIN" as const,
          sortOrder: i,
        })),
      });

      // Create CONTENT images
      if (contentImages && contentImages.length > 0) {
        await tx.productImage.createMany({
          data: contentImages.map((url: string, i: number) => ({
            productId: p.id,
            url,
            kind: "CONTENT" as const,
            sortOrder: i,
          })),
        });
      }

      // Create color-specific MAIN images
      if (colorImages && colorImages.length > 0) {
        const colorImageRecords: Array<{
          productId: string;
          url: string;
          kind: "MAIN";
          sortOrder: number;
          colorKey: string;
        }> = [];

        colorImages.forEach((colorImage) => {
          colorImage.urls.forEach((url, index) => {
            colorImageRecords.push({
              productId: p.id,
              url,
              kind: "MAIN" as const,
              sortOrder: index,
              colorKey: colorImage.colorKey,
            });
          });
        });

        if (colorImageRecords.length > 0) {
          await tx.productImage.createMany({
            data: colorImageRecords,
          });
        }
      }

      // Create variants (normalized)
      const normalizedVariants = variants.map((v) => normalizeVariantInput(v));
      await tx.productVariant.createMany({
        data: normalizedVariants.map((v) => ({
          productId: p.id,
          color: v.color,
          sizeLabel: v.sizeLabel,
          stock: v.stock,
        })),
      });

      return p;
    });

    revalidatePath("/");
    return NextResponse.json({ id: product.id });
  } catch (err) {
    console.error("product creation error:", err);
    return NextResponse.json(
      { error: "상품 등록에 실패했습니다" },
      { status: 500 },
    );
  }
}
