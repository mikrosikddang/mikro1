export const ATTRIBUTION_COOKIE_KEYS = {
  ref: "mk_ref",
  campaign: "mk_campaign",
  utmSource: "mk_utm_source",
  utmMedium: "mk_utm_medium",
  utmCampaign: "mk_utm_campaign",
  landingPath: "mk_landing_path",
  firstTouchedAt: "mk_first_touch_at",
  lastTouchedAt: "mk_last_touch_at",
  sessionKey: "mk_attr_session",
} as const;

export function sanitizeAttributionValue(value: string | null | undefined) {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed.slice(0, 120) : null;
}

export function buildAttributionCookieValues(searchParams: URLSearchParams) {
  const refCode = sanitizeAttributionValue(
    searchParams.get("ref") ?? searchParams.get("refCode"),
  );
  const campaignKey = sanitizeAttributionValue(
    searchParams.get("campaign") ?? searchParams.get("campaignId"),
  );
  const utmSource = sanitizeAttributionValue(searchParams.get("utm_source"));
  const utmMedium = sanitizeAttributionValue(searchParams.get("utm_medium"));
  const utmCampaign = sanitizeAttributionValue(searchParams.get("utm_campaign"));
  const hasAny =
    Boolean(refCode) ||
    Boolean(campaignKey) ||
    Boolean(utmSource) ||
    Boolean(utmMedium) ||
    Boolean(utmCampaign);

  return {
    hasAny,
    refCode,
    campaignKey,
    utmSource,
    utmMedium,
    utmCampaign,
  };
}
