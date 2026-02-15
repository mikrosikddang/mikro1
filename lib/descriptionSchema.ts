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

const MAX_FIELD_LENGTH = 2000;
const MAX_DETAIL_LENGTH = 10000;

/**
 * Sanitize and validate description JSON input
 * Ensures safe structure, trims strings, enforces length limits
 */
export function sanitizeDescriptionJson(input: any): ProductDescriptionV1 {
  if (!input || typeof input !== "object") {
    return { v: 1 };
  }

  const trimAndCap = (str: any, maxLen: number): string | undefined => {
    if (typeof str !== "string") return undefined;
    const trimmed = str.trim();
    if (!trimmed) return undefined;
    return trimmed.slice(0, maxLen);
  };

  const spec: ProductDescriptionV1["spec"] = {};
  if (input.spec && typeof input.spec === "object") {
    const allowedSpecKeys = ["measurements", "modelInfo", "material", "origin", "fit"] as const;
    for (const key of allowedSpecKeys) {
      const value = trimAndCap((input.spec as any)[key], MAX_FIELD_LENGTH);
      if (value) (spec as any)[key] = value;
    }
  }

  const csShipping: ProductDescriptionV1["csShipping"] = {};
  if (input.csShipping && typeof input.csShipping === "object") {
    const allowedCsKeys = ["courier", "csPhone", "csEmail", "returnAddress", "note"] as const;
    for (const key of allowedCsKeys) {
      const value = trimAndCap((input.csShipping as any)[key], MAX_FIELD_LENGTH);
      if (value) (csShipping as any)[key] = value;
    }
  }

  return {
    v: 1,
    spec: Object.keys(spec).length > 0 ? spec : undefined,
    detail: trimAndCap(input.detail, MAX_DETAIL_LENGTH),
    csShipping: Object.keys(csShipping).length > 0 ? csShipping : undefined,
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
  } | null;
}): ProductDescriptionV1 {
  const { descriptionJson, descriptionLegacy, sellerProfile } = options;

  // If structured data exists, use it
  if (descriptionJson && typeof descriptionJson === "object" && descriptionJson.v === 1) {
    return sanitizeDescriptionJson(descriptionJson);
  }

  // Otherwise, migrate from legacy + prefill CS info
  return {
    v: 1,
    spec: {},
    detail: descriptionLegacy || "",
    csShipping: {
      csPhone: sellerProfile?.managerPhone || undefined,
      note: sellerProfile?.shopName ? `${sellerProfile.shopName}에서 발송합니다.` : undefined,
    },
  };
}

/**
 * Render structured description for customer view
 * Returns normalized arrays for UI rendering
 */
export function renderDescriptionForCustomer(desc: ProductDescriptionV1 | null) {
  if (!desc || desc.v !== 1) {
    return { spec: [], detail: "", csShipping: [] };
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

  return {
    spec,
    detail: desc.detail || "",
    csShipping,
  };
}
