/**
 * Variant validation logic (shared by client and server)
 */

import type { VariantTree, FlatVariant } from "./variantTransform";

export type ValidationError = {
  field: string;
  message: string;
};

const MAX_COLOR_LENGTH = 20;
const MAX_SIZE_LENGTH = 10;

/**
 * Validate tree structure (UI state)
 */
export function validateVariantTree(tree: VariantTree): ValidationError[] {
  const errors: ValidationError[] = [];
  const seenCombos = new Set<string>();

  if (!tree || tree.length === 0) {
    errors.push({ field: "variants", message: "최소 1개의 컬러 그룹이 필요합니다" });
    return errors;
  }

  let totalSizes = 0;

  for (let gi = 0; gi < tree.length; gi++) {
    const group = tree[gi];
    const color = (group.color || "").trim();

    // Color validation
    if (!color) {
      errors.push({ field: `color-${gi}`, message: "컬러명을 입력해주세요" });
      continue;
    }
    if (color.length > MAX_COLOR_LENGTH) {
      errors.push({ field: `color-${gi}`, message: `컬러명은 최대 ${MAX_COLOR_LENGTH}자입니다` });
    }
    if (/^\s+|\s+$/. test(group.color)) {
      errors.push({ field: `color-${gi}`, message: "컬러명 앞뒤 공백은 제거됩니다" });
    }

    // Size validation
    if (!group.sizes || group.sizes.length === 0) {
      errors.push({ field: `color-${gi}`, message: "최소 1개의 사이즈가 필요합니다" });
      continue;
    }

    for (let si = 0; si < group.sizes.length; si++) {
      const size = group.sizes[si];
      const sizeLabel = (size.sizeLabel || "").trim();

      totalSizes++;

      // Size label validation
      if (!sizeLabel) {
        errors.push({ field: `size-${gi}-${si}`, message: "사이즈명을 입력해주세요" });
        continue;
      }
      if (sizeLabel.length > MAX_SIZE_LENGTH) {
        errors.push({ field: `size-${gi}-${si}`, message: `사이즈명은 최대 ${MAX_SIZE_LENGTH}자입니다` });
      }
      if (/^\s+|\s+$/.test(size.sizeLabel)) {
        errors.push({ field: `size-${gi}-${si}`, message: "사이즈명 앞뒤 공백은 제거됩니다" });
      }

      // Stock validation
      if (typeof size.stock !== "number" || !Number.isInteger(size.stock) || size.stock < 0) {
        errors.push({ field: `stock-${gi}-${si}`, message: "재고는 0 이상 정수를 입력해주세요" });
      }

      // Duplicate check
      const combo = `${color.toUpperCase()}|${sizeLabel.toUpperCase()}`;
      if (seenCombos.has(combo)) {
        errors.push({ field: `size-${gi}-${si}`, message: `중복된 옵션: ${color} ${sizeLabel}` });
      }
      seenCombos.add(combo);
    }
  }

  if (totalSizes === 0) {
    errors.push({ field: "variants", message: "최소 1개의 사이즈가 필요합니다" });
  }

  return errors;
}

/**
 * Validate flat variants (API input)
 * Server-side validation
 */
export function validateFlatVariants(variants: FlatVariant[]): ValidationError[] {
  const errors: ValidationError[] = [];
  const seenCombos = new Set<string>();

  if (!variants || !Array.isArray(variants) || variants.length === 0) {
    errors.push({ field: "variants", message: "사이즈/재고를 1개 이상 입력해주세요" });
    return errors;
  }

  for (let i = 0; i < variants.length; i++) {
    const v = variants[i];

    const color = (v.color || "").trim();
    const sizeLabel = (v.sizeLabel || "").trim();
    const stock = v.stock;

    // Color validation
    if (!color) {
      errors.push({ field: `variant-${i}`, message: "컬러명을 입력해주세요" });
    } else if (color.length > MAX_COLOR_LENGTH) {
      errors.push({ field: `variant-${i}`, message: `컬러명은 최대 ${MAX_COLOR_LENGTH}자입니다` });
    }

    // Size validation
    if (!sizeLabel) {
      errors.push({ field: `variant-${i}`, message: "사이즈명을 입력해주세요" });
    } else if (sizeLabel.length > MAX_SIZE_LENGTH) {
      errors.push({ field: `variant-${i}`, message: `사이즈명은 최대 ${MAX_SIZE_LENGTH}자입니다` });
    }

    // Stock validation
    if (typeof stock !== "number" || !Number.isInteger(stock) || stock < 0) {
      errors.push({ field: `variant-${i}`, message: "재고는 0 이상 정수를 입력해주세요" });
    }

    // Duplicate check
    if (color && sizeLabel) {
      const combo = `${color.toUpperCase()}|${sizeLabel.toUpperCase()}`;
      if (seenCombos.has(combo)) {
        errors.push({ field: `variant-${i}`, message: `중복된 옵션: ${color} ${sizeLabel}` });
      }
      seenCombos.add(combo);
    }
  }

  return errors;
}

/**
 * Format validation errors for user display
 */
export function formatValidationErrors(errors: ValidationError[]): string {
  if (errors.length === 0) return "";
  if (errors.length === 1) return errors[0].message;
  return `다음 오류를 수정해주세요:\n${errors.map((e) => `• ${e.message}`).join("\n")}`;
}
