import type { Prisma } from "@prisma/client";

/**
 * Public seller visibility:
 * - user role must be SELLER_ACTIVE
 * - seller profile must be APPROVED
 */
export const PUBLIC_SELLER_WHERE: Prisma.UserWhereInput = {
  role: "SELLER_ACTIVE",
  sellerProfile: {
    is: {
      status: "APPROVED",
    },
  },
};

/**
 * Public product visibility:
 * - product is active and not deleted
 * - seller must satisfy PUBLIC_SELLER_WHERE
 */
export function getPublicProductWhere(
  extra: Prisma.ProductWhereInput = {},
): Prisma.ProductWhereInput {
  return {
    isActive: true,
    isDeleted: false,
    seller: {
      is: {
        role: "SELLER_ACTIVE",
        sellerProfile: {
          is: {
            status: "APPROVED",
          },
        },
      },
    },
    ...extra,
  };
}

