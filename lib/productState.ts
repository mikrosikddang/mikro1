import { ProductPostType } from "@prisma/client";

export type ProductBadge = "DELETED" | "HIDDEN" | "SOLD_OUT" | "ACTIVE" | "ARCHIVE";

export function getTotalStock(variants: { stock: number }[]): number {
  return variants.reduce((sum, v) => sum + v.stock, 0);
}

export function getProductBadge({
  postType,
  isActive,
  isDeleted,
  totalStock,
}: {
  postType?: ProductPostType | null;
  isActive: boolean;
  isDeleted: boolean;
  totalStock: number;
}): ProductBadge {
  if (isDeleted) return "DELETED";
  if (!isActive) return "HIDDEN";
  if (postType === "ARCHIVE") return "ARCHIVE";
  if (totalStock === 0) return "SOLD_OUT";
  return "ACTIVE";
}

export function isVisibleToCustomer(product: {
  postType?: ProductPostType | null;
  isDeleted: boolean;
  isActive: boolean;
}): boolean {
  return !product.isDeleted && product.isActive;
}
