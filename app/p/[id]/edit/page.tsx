import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { hasSellerPortalAccess } from "@/lib/sellerPortal";

type Props = { params: Promise<{ id: string }> };

export default async function ProductEditEntryPage({ params }: Props) {
  const session = await getSession();
  const { id } = await params;

  if (!session) {
    redirect(`/login?next=/p/${id}/edit`);
  }

  const product = await prisma.product.findFirst({
    where: {
      id,
      sellerId: session.userId,
      isDeleted: false,
    },
    select: {
      id: true,
      postType: true,
    },
  });

  if (!product) {
    notFound();
  }

  if (product.postType === "ARCHIVE") {
    redirect(`/space/posts/${product.id}/edit`);
  }

  if (!(await hasSellerPortalAccess(session))) {
    notFound();
  }

  redirect(`/seller/products/${product.id}/edit`);
}
