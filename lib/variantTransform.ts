/**
 * Variant transformation utilities: flat ↔ tree
 *
 * DB structure (flat): ProductVariant[]
 * UI structure (tree): ColorGroup[] → SizeRow[]
 */

// Browser-compatible UUID generation
function generateId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export type FlatVariant = {
  id?: string; // existingVariantId (from DB)
  color: string;
  sizeLabel: string;
  stock: number;
};

export type SizeRow = {
  clientId: string;
  sizeLabel: string;
  stock: number;
  existingVariantId?: string; // DB variant ID (for update)
};

export type ColorGroup = {
  clientId: string;
  color: string;
  sizes: SizeRow[];
};

export type VariantTree = ColorGroup[];

/**
 * Convert flat variants (from DB) to tree structure (for UI)
 */
export function variantsFlatToTree(flatVariants: FlatVariant[]): VariantTree {
  if (!flatVariants || flatVariants.length === 0) {
    // Default: one FREE color group with one FREE size
    return [
      {
        clientId: generateId(),
        color: "FREE",
        sizes: [
          {
            clientId: generateId(),
            sizeLabel: "FREE",
            stock: 0,
          },
        ],
      },
    ];
  }

  const colorMap = new Map<string, ColorGroup>();

  for (const v of flatVariants) {
    const color = (v.color || "FREE").trim().toUpperCase();
    const sizeLabel = (v.sizeLabel || "FREE").trim().toUpperCase();
    const stock = v.stock || 0;

    if (!colorMap.has(color)) {
      colorMap.set(color, {
        clientId: generateId(),
        color,
        sizes: [],
      });
    }

    const group = colorMap.get(color)!;
    group.sizes.push({
      clientId: generateId(),
      sizeLabel,
      stock,
      existingVariantId: v.id,
    });
  }

  // Sort: FREE color first, then alphabetically
  const sorted = Array.from(colorMap.values()).sort((a, b) => {
    if (a.color === "FREE") return -1;
    if (b.color === "FREE") return 1;
    return a.color.localeCompare(b.color);
  });

  // Within each color group, sort sizes: FREE first, then alphabetically
  for (const group of sorted) {
    group.sizes.sort((a, b) => {
      if (a.sizeLabel === "FREE") return -1;
      if (b.sizeLabel === "FREE") return 1;
      return a.sizeLabel.localeCompare(b.sizeLabel);
    });
  }

  return sorted;
}

/**
 * Convert tree structure (from UI) to flat variants (for API)
 * Validates and normalizes data
 */
export function variantsTreeToFlat(tree: VariantTree): FlatVariant[] {
  const result: FlatVariant[] = [];
  const seenCombos = new Set<string>();

  for (const group of tree) {
    const color = (group.color || "").trim().toUpperCase();
    if (!color) continue; // Skip empty color groups

    for (const size of group.sizes) {
      const sizeLabel = (size.sizeLabel || "").trim().toUpperCase();
      if (!sizeLabel) continue; // Skip empty sizes

      const combo = `${color}|${sizeLabel}`;
      if (seenCombos.has(combo)) {
        // Skip duplicates (validation should catch this earlier)
        continue;
      }
      seenCombos.add(combo);

      result.push({
        id: size.existingVariantId,
        color,
        sizeLabel,
        stock: Math.max(0, Math.floor(size.stock || 0)),
      });
    }
  }

  return result;
}
