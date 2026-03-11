import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { buildDescriptionInitialValues } from "@/lib/descriptionSchema";
import ProductForm, { type ProductFormInitialValues } from "@/components/ProductForm";
import { hasSellerPortalAccess } from "@/lib/sellerPortal";

type Props = {
  searchParams: Promise<{ cloneFrom?: string }>;
};

export default async function NewProductPage({ searchParams }: Props) {
  const { cloneFrom } = await searchParams;

  let initialValues: ProductFormInitialValues | undefined;

  const session = await getSession();
  if (!session || !(await hasSellerPortalAccess(session))) notFound();

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
        .map((i) => ({ url: i.url, colorKey: i.colorKey ?? null })),
      contentImages: product.images
        .filter((i) => i.kind === "CONTENT")
        .map((i) => i.url),
      variants: product.variants.map((v) => ({
        sizeLabel: v.sizeLabel,
        stock: 0,
      })),
    };
  } else {
    // 새 상품: 최근 상품 CS 정보 → 셀러 프로필 순으로 프리필
    const [seller, latestProduct] = await Promise.all([
      prisma.user.findUnique({
        where: { id: session.userId },
        include: { sellerProfile: true },
      }),
      prisma.product.findFirst({
        where: { sellerId: session.userId, isDeleted: false },
        orderBy: { createdAt: "desc" },
        select: { descriptionJson: true },
      }),
    ]);

    initialValues = {
      title: "",
      priceKrw: 0,
      category: "",
      description: "",
      descriptionJson: buildDescriptionInitialValues({
        descriptionJson: latestProduct?.descriptionJson
          ? { v: 1, csShipping: (latestProduct.descriptionJson as any).csShipping }
          : undefined,
        sellerProfile: seller?.sellerProfile,
      }),
      mainImages: [],
      contentImages: [],
      variants: [],
    };
  }

  return <ProductForm initialValues={initialValues} />;
}
