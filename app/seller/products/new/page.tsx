import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession, canAccessSellerFeatures } from "@/lib/auth";
import { buildDescriptionInitialValues } from "@/lib/descriptionSchema";
import ProductForm, { type ProductFormInitialValues } from "@/components/ProductForm";

type Props = {
  searchParams: Promise<{ cloneFrom?: string }>;
};

export default async function NewProductPage({ searchParams }: Props) {
  const { cloneFrom } = await searchParams;

  let initialValues: ProductFormInitialValues | undefined;

  const session = await getSession();
  if (!session || !canAccessSellerFeatures(session.role)) notFound();

  if (cloneFrom) {
    const product = await prisma.product.findUnique({
      where: { id: cloneFrom },
      include: {
        images: { orderBy: { sortOrder: "asc" } },
        variants: { orderBy: { createdAt: "asc" } },
      },
    });

    if (!product || product.sellerId !== session.userId) notFound();

    initialValues = {
      title: product.title,
      priceKrw: product.priceKrw,
      category: product.category ?? "",
      description: product.description ?? "",
      mainImages: product.images
        .filter((i) => i.kind === "MAIN")
        .map((i) => i.url),
      contentImages: product.images
        .filter((i) => i.kind === "CONTENT")
        .map((i) => i.url),
      variants: product.variants.map((v) => ({
        sizeLabel: v.sizeLabel,
        stock: 0,
      })),
    };
  } else {
    // 새 상품: 셀러 프로필에서 CS/배송 정보 프리필
    const seller = await prisma.user.findUnique({
      where: { id: session.userId },
      include: { sellerProfile: true },
    });

    initialValues = {
      title: "",
      priceKrw: 0,
      category: "",
      description: "",
      descriptionJson: buildDescriptionInitialValues({
        sellerProfile: seller?.sellerProfile,
      }),
      mainImages: [],
      contentImages: [],
      variants: [],
    };
  }

  return <ProductForm initialValues={initialValues} />;
}
