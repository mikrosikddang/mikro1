export const CANONICAL_HOST = "www.mikrobrand.kr";
export const CANONICAL_ORIGIN = `https://${CANONICAL_HOST}`;

export function isLocalHost(host: string | null | undefined) {
  if (!host) return false;
  const hostname = host.split(":")[0]?.toLowerCase() ?? "";
  return hostname === "localhost" || hostname === "127.0.0.1";
}

export function getCanonicalOrigin() {
  if (process.env.NODE_ENV !== "production") {
    const devBaseUrl = process.env.NEXT_PUBLIC_BASE_URL?.trim();
    return (devBaseUrl && devBaseUrl.replace(/\/+$/, "")) || "http://localhost:3000";
  }
  return CANONICAL_ORIGIN;
}

export function buildCanonicalUrl(path: string) {
  const pathname = path.startsWith("/") ? path : `/${path}`;
  return new URL(pathname, getCanonicalOrigin()).toString();
}
