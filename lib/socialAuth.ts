export type SocialProvider = "kakao" | "naver";

export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digitsOnly = raw
    .replace(/\+82\s?/g, "0")
    .replace(/[^\d]/g, "")
    .trim();
  return digitsOnly.length > 0 ? digitsOnly : null;
}

export function normalizeName(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

