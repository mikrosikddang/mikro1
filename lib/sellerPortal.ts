import { SellerApprovalStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { Session } from "@/lib/auth";

export async function hasSellerPortalAccess(session: Session | null) {
  if (!session) return false;
  if (session.role === "ADMIN") return true;

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      role: true,
      sellerProfile: {
        select: {
          status: true,
        },
      },
    },
  });

  return Boolean(
    user &&
      user.role === "SELLER_ACTIVE" &&
      user.sellerProfile?.status === SellerApprovalStatus.APPROVED,
  );
}
