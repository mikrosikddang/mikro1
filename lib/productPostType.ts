import { ProductPostType } from "@prisma/client";

export { ProductPostType };

export function isArchivePost(postType: ProductPostType | null | undefined) {
  return postType === ProductPostType.ARCHIVE;
}

export function getPostTypeLabel(postType: ProductPostType | null | undefined) {
  return isArchivePost(postType) ? "아카이브" : "판매";
}

export function shouldShowCommercePrice(postType: ProductPostType | null | undefined) {
  return !isArchivePost(postType);
}
