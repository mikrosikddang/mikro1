/**
 * Structured Product Description Schema
 *
 * Version 1 format with 3 sections:
 * - spec: product specifications (measurements, material, etc.)
 * - detail: detailed description text
 * - csShipping: customer service and shipping info
 */

export interface ProductDescriptionV1 {
  v: 1;
  spec?: {
    measurements?: string; // 사이즈
    modelInfo?: string; // 모델 정보
    material?: string; // 소재
    origin?: string; // 원산지
    fit?: string; // 핏
    [key: string]: string | undefined;
  };
  detail?: string; // 상세 설명
  csShipping?: {
    courier?: string; // 택배사
    csPhone?: string; // 고객센터 전화
    csEmail?: string; // 고객센터 이메일
    returnAddress?: string; // 반품 주소
    note?: string; // 배송 안내
  };
}

// ---- V2: Block-based description (사진+글 자유 배치) ----

export type DescriptionBlock =
  | { type: "text"; content: string }
  | { type: "image"; url: string; caption?: string };

export interface ProductDescriptionV2 {
  v: 2;
  spec?: ProductDescriptionV1["spec"];
  blocks: DescriptionBlock[];
  csShipping?: ProductDescriptionV1["csShipping"];
}

export type ProductDescription = ProductDescriptionV1 | ProductDescriptionV2;

const MAX_FIELD_LENGTH = 2000;
const MAX_DETAIL_LENGTH = 10000;
const MAX_BLOCKS = 50;
const MAX_BLOCK_TEXT_LENGTH = 5000;

/**
 * Sanitize and validate description JSON input
 * Ensures safe structure, trims strings, enforces length limits
 */
export function sanitizeDescriptionJson(input: any): ProductDescription {
  if (!input || typeof input !== "object") {
    return { v: 1 };
  }

  const trimAndCap = (str: any, maxLen: number): string | undefined => {
    if (typeof str !== "string") return undefined;
    const trimmed = str.trim();
    if (!trimmed) return undefined;
    return trimmed.slice(0, maxLen);
  };

  const sanitizeSpec = (specInput: any): ProductDescriptionV1["spec"] | undefined => {
    const spec: ProductDescriptionV1["spec"] = {};
    if (specInput && typeof specInput === "object") {
      const allowedSpecKeys = ["measurements", "modelInfo", "material", "origin", "fit"] as const;
      for (const key of allowedSpecKeys) {
        const value = trimAndCap((specInput as any)[key], MAX_FIELD_LENGTH);
        if (value) (spec as any)[key] = value;
      }
    }
    return Object.keys(spec).length > 0 ? spec : undefined;
  };

  const sanitizeCsShipping = (csInput: any): ProductDescriptionV1["csShipping"] | undefined => {
    const csShipping: ProductDescriptionV1["csShipping"] = {};
    if (csInput && typeof csInput === "object") {
      const allowedCsKeys = ["courier", "csPhone", "csEmail", "returnAddress", "note"] as const;
      for (const key of allowedCsKeys) {
        const value = trimAndCap((csInput as any)[key], MAX_FIELD_LENGTH);
        if (value) (csShipping as any)[key] = value;
      }
    }
    return Object.keys(csShipping).length > 0 ? csShipping : undefined;
  };

  // V2 format
  if (input.v === 2 && Array.isArray(input.blocks)) {
    const blocks: DescriptionBlock[] = [];
    for (const block of input.blocks.slice(0, MAX_BLOCKS)) {
      if (block?.type === "text" && typeof block.content === "string") {
        const content = block.content.trim().slice(0, MAX_BLOCK_TEXT_LENGTH);
        if (content) blocks.push({ type: "text", content });
      } else if (block?.type === "image" && typeof block.url === "string") {
        const url = block.url.trim();
        if (url) {
          const caption = trimAndCap(block.caption, MAX_FIELD_LENGTH);
          blocks.push({ type: "image", url, ...(caption ? { caption } : {}) });
        }
      }
    }
    return {
      v: 2,
      spec: sanitizeSpec(input.spec),
      blocks,
      csShipping: sanitizeCsShipping(input.csShipping),
    };
  }

  // V1 format (default)
  return {
    v: 1,
    spec: sanitizeSpec(input.spec),
    detail: trimAndCap(input.detail, MAX_DETAIL_LENGTH),
    csShipping: sanitizeCsShipping(input.csShipping),
  };
}

/**
 * Build initial form values for product edit/create
 * Handles backward compatibility with legacy description
 */
export function buildDescriptionInitialValues(options: {
  descriptionJson?: any;
  descriptionLegacy?: string | null;
  sellerProfile?: {
    managerPhone?: string | null;
    shopName?: string;
    csPhone?: string | null;
    csEmail?: string | null;
    csAddress?: string | null;
    shippingGuide?: string | null;
  } | null;
}): ProductDescription {
  const { descriptionJson, descriptionLegacy, sellerProfile } = options;

  // If structured data exists, use it (기존 상품 수정 시 기존 값 유지)
  if (descriptionJson && typeof descriptionJson === "object" && (descriptionJson.v === 1 || descriptionJson.v === 2)) {
    return sanitizeDescriptionJson(descriptionJson);
  }

  // Otherwise, migrate from legacy + prefill CS info from seller profile
  return {
    v: 1,
    spec: {},
    detail: descriptionLegacy || "",
    csShipping: {
      csPhone: sellerProfile?.csPhone || sellerProfile?.managerPhone || undefined,
      csEmail: sellerProfile?.csEmail || undefined,
      returnAddress: sellerProfile?.csAddress || undefined,
      note: sellerProfile?.shippingGuide || undefined,
    },
  };
}

/**
 * Render structured description for customer view
 * Returns normalized arrays for UI rendering
 */
export function renderDescriptionForCustomer(desc: ProductDescription | null) {
  if (!desc) {
    return { spec: [], detail: "", blocks: [], csShipping: [], isV2: false };
  }

  const specLabels: Record<string, string> = {
    measurements: "사이즈",
    modelInfo: "모델 정보",
    material: "소재",
    origin: "원산지",
    fit: "핏",
  };

  const spec = Object.entries(desc.spec || {})
    .filter(([_, value]) => value)
    .map(([key, value]) => ({
      label: specLabels[key] || key,
      value: value!,
    }));

  const csShippingLabels: Record<string, string> = {
    courier: "택배사",
    csPhone: "고객센터",
    csEmail: "이메일",
    returnAddress: "반품 주소",
    note: "배송 안내",
  };

  const csShipping = Object.entries(desc.csShipping || {})
    .filter(([_, value]) => value)
    .map(([key, value]) => ({
      label: csShippingLabels[key] || key,
      value: value!,
    }));

  if (desc.v === 2) {
    return {
      spec,
      detail: "",
      blocks: desc.blocks || [],
      csShipping,
      isV2: true,
    };
  }

  return {
    spec,
    detail: (desc as ProductDescriptionV1).detail || "",
    blocks: [] as DescriptionBlock[],
    csShipping,
    isV2: false,
  };
}
