export const COURIER_OPTIONS = [
  { code: "CJ", label: "CJ대한통운" },
  { code: "POST", label: "우체국택배" },
  { code: "HANJIN", label: "한진택배" },
  { code: "LOTTE", label: "롯데택배" },
  { code: "LOGEN", label: "로젠택배" },
  { code: "ILYANG", label: "일양로지스" },
  { code: "KDEXP", label: "경동택배" },
  { code: "DAESIN", label: "대신택배" },
  { code: "CU", label: "CU편의점택배" },
  { code: "GS", label: "GS Postbox" },
] as const;

export type CourierCode = (typeof COURIER_OPTIONS)[number]["code"];

export function getCourierLabel(codeOrLabel: string) {
  const trimmed = codeOrLabel.trim();
  const option = COURIER_OPTIONS.find(
    (courier) => courier.code === trimmed || courier.label === trimmed,
  );
  return option?.label ?? null;
}

export function normalizeTrackingNo(value: string) {
  return value.replace(/\s+/g, "").trim();
}

export function buildNaverDeliveryTrackingUrl(courier: string, trackingNo: string) {
  const query = `${courier.trim()} ${normalizeTrackingNo(trackingNo)}`;
  return `https://search.naver.com/search.naver?query=${encodeURIComponent(query)}`;
}
