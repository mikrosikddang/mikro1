import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import {
  buildDescriptionInitialValues,
  type ProductDescription,
} from "@/lib/descriptionSchema";
import ProductForm, { type ProductFormInitialValues } from "@/components/ProductForm";
import { ensureUserSpaceProfile } from "@/lib/userSpace";

export default async function NewArchivePostPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login?next=/space/posts/new");
  }

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

  await ensureUserSpaceProfile(prisma, {
    id: session.userId,
    name: session.name,
    email: session.email,
  });

  const initialValues: ProductFormInitialValues = {
    title: "",
    postType: "ARCHIVE",
    priceKrw: 0,
    category: "",
    description: "",
    descriptionJson: buildDescriptionInitialValues({
      descriptionJson: latestProduct?.descriptionJson
        ? {
            v: 1,
            csShipping: (latestProduct.descriptionJson as ProductDescription | null)?.csShipping,
          }
        : undefined,
      sellerProfile: seller?.sellerProfile,
    }),
    mainImages: [],
    contentImages: [],
    variants: [],
  };

  return (
    <ProductForm
      initialValues={initialValues}
      forcedPostType="ARCHIVE"
      allowArchiveToggle={false}
      redirectTo="/space"
    />
  );
}
