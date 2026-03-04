import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import SellerProductList from "@/components/SellerProductReorderList";

export default async function SellerProductsPage() {
  const session = await getSession();
  const sellerId = session!.userId;

  const seller = await prisma.user.findUnique({
    where: { id: sellerId },
    include: { sellerProfile: true },
  });

  const shopName = seller?.sellerProfile?.shopName ?? "내 상점";

  return (
    <div className="py-4">
      <SellerProductList shopName={shopName} sellerId={sellerId} />
    </div>
  );
}
