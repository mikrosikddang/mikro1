import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { buildDescriptionInitialValues } from "@/lib/descriptionSchema";
import ProductForm, { type ProductFormInitialValues } from "@/components/ProductForm";

type Props = { params: Promise<{ id: string }> };

export default async function EditArchivePostPage({ params }: Props) {
  const session = await getSession();
  if (!session) {
    redirect("/login?next=/space");
  }

  const { id } = await params;
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      variants: { orderBy: { createdAt: "asc" } },
    },
  });

  if (
    !product ||
    product.sellerId !== session.userId ||
    product.postType !== "ARCHIVE"
  ) {
    notFound();
  }

  const initialValues: ProductFormInitialValues = {
    title: product.title,
    postType: product.postType,
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
      .filter((i) => i.kind === "MAIN")
      .map((i) => ({ url: i.url, colorKey: i.colorKey ?? null })),
    contentImages: product.images
      .filter((i) => i.kind === "CONTENT")
      .map((i) => i.url),
    variants: product.variants.map((v) => ({
      id: v.id,
      color: v.color || "FREE",
      sizeLabel: v.sizeLabel,
      stock: v.stock,
      priceAddonKrw: v.priceAddonKrw,
    })),
  };

  return (
    <ProductForm
      initialValues={initialValues}
      editProductId={id}
      isActive={product.isActive}
      forcedPostType="ARCHIVE"
      allowArchiveToggle={false}
      redirectTo="/space"
    />
  );
}
