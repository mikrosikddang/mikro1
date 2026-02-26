import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession, canAccessSellerFeatures } from "@/lib/auth";
import { buildDescriptionInitialValues } from "@/lib/descriptionSchema";
import ProductForm, { type ProductFormInitialValues } from "@/components/ProductForm";

type Props = { params: Promise<{ id: string }> };

export default async function EditProductPage({ params }: Props) {
  const { id } = await params;

  const session = await getSession();
  if (!session || !canAccessSellerFeatures(session.role)) notFound();

  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      variants: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!product || product.sellerId !== session.userId) notFound();

  // Build initial values for ProductForm
  const initialValues: ProductFormInitialValues = {
    title: product.title,
    priceKrw: product.priceKrw,
    salePriceKrw: product.salePriceKrw,
    category: product.category ?? "",
    categoryMain: product.categoryMain,
    categoryMid: product.categoryMid,
    categorySub: product.categorySub,
    description: product.description ?? "",
    descriptionJson: buildDescriptionInitialValues({
      descriptionJson: product.descriptionJson,
      descriptionLegacy: product.description,
    }),
    mainImages: product.images
      .filter((i) => i.kind === "MAIN" && !i.colorKey)
      .map((i) => i.url),
    contentImages: product.images
      .filter((i) => i.kind === "CONTENT")
      .map((i) => i.url),
    variants: product.variants.map((v) => ({
      id: v.id,
      color: v.color || "FREE",
      sizeLabel: v.sizeLabel,
      stock: v.stock,
    })),
    colorImages: product.images
      .filter((i) => i.kind === "MAIN" && i.colorKey)
      .map((i) => ({ colorKey: i.colorKey!, url: i.url })),
  };

  return (
    <ProductForm
      initialValues={initialValues}
      editProductId={id}
      isActive={product.isActive}
    />
  );
}
