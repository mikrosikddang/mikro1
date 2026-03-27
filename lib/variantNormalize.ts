/**
 * Variant normalization utilities
 * Ensures deterministic comparison and prevents duplicate variants
 */

export type NormalizedVariant = {
  id?: string;
  color: string;
  sizeLabel: string;
  stock: number;
  priceAddonKrw: number;
};

/**
 * Normalize variant input for comparison
 * - Trim whitespace
 * - Convert to uppercase
 * - Collapse multiple spaces
 * - Reject empty strings
 */
export function normalizeVariantInput(variant: {
  id?: string;
  color?: string;
  sizeLabel: string;
  stock: number;
  priceAddonKrw?: number;
}): NormalizedVariant {
  const color = (variant.color || "FREE")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, " ");

  const sizeLabel = variant.sizeLabel
    .trim()
    .toUpperCase()
    .replace(/\s+/g, " ");

  if (!color) {
    throw new Error("Color cannot be empty");
  }

  if (!sizeLabel) {
    throw new Error("Size label cannot be empty");
  }

  return {
    id: variant.id,
    color,
    sizeLabel,
    stock: Math.max(0, Math.floor(variant.stock || 0)),
    priceAddonKrw: Math.max(0, Math.floor(variant.priceAddonKrw || 0)),
  };
}

/**
 * Check if two variants are semantically equal
 * (ignoring ID and stock)
 */
export function variantsEqual(
  a: { color: string; sizeLabel: string },
  b: { color: string; sizeLabel: string }
): boolean {
  return (
    a.color.toUpperCase() === b.color.toUpperCase() &&
    a.sizeLabel.toUpperCase() === b.sizeLabel.toUpperCase()
  );
}

/**
 * Generate variant combo key for uniqueness check
 */
export function getVariantComboKey(variant: {
  color: string;
  sizeLabel: string;
}): string {
  return `${variant.color.toUpperCase()}|${variant.sizeLabel.toUpperCase()}`;
}
