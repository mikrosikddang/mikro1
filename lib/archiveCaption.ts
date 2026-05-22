import {
  renderDescriptionForCustomer,
  type ProductDescription,
} from "@/lib/descriptionSchema";

export function getArchiveCaptionBody(
  descriptionJson: unknown,
  legacyDescription?: string | null,
) {
  if (descriptionJson && typeof descriptionJson === "object") {
    const rendered = renderDescriptionForCustomer(
      descriptionJson as unknown as ProductDescription,
    );

    if (rendered.isV2) {
      const textBlocks = rendered.blocks
        .filter((block) => block.type === "text")
        .map((block) => block.content.trim())
        .filter(Boolean);

      if (textBlocks.length > 0) {
        return textBlocks.join("\n\n");
      }
    }

    if (rendered.detail.trim()) {
      return rendered.detail.trim();
    }
  }

  return legacyDescription?.trim() ?? "";
}
