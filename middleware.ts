import { NextRequest, NextResponse } from "next/server";
import {
  slidingWindow,
  getClientIp,
  rateLimitResponse,
} from "@/lib/rateLimit";
import {
  ATTRIBUTION_COOKIE_KEYS,
  buildAttributionCookieValues,
} from "@/lib/attributionShared";
import { CANONICAL_HOST, getCanonicalOrigin, isLocalHost } from "@/lib/siteUrl";

/** Route-specific rate limit rules (matched in order, first match wins) */
const RATE_RULES: {
  pattern: RegExp;
  method: string;
  limit: number;
  windowMs: number;
  keyPrefix: string;
}[] = [
  // Auth — strict IP-based limits
  {
    pattern: /^\/api\/auth\/login$/,
    method: "POST",
    limit: 5,
    windowMs: 60_000,
    keyPrefix: "login",
  },
  {
    pattern: /^\/api\/auth\/signup$/,
    method: "POST",
    limit: 3,
    windowMs: 60_000,
    keyPrefix: "signup",
  },
  // Cart — per-IP
  {
    pattern: /^\/api\/cart/,
    method: "POST",
    limit: 30,
    windowMs: 60_000,
    keyPrefix: "cart",
  },
  // Orders — per-IP
  {
    pattern: /^\/api\/orders/,
    method: "POST",
    limit: 10,
    windowMs: 60_000,
    keyPrefix: "orders",
  },
  {
    pattern: /^\/api\/checkout/,
    method: "POST",
    limit: 10,
    windowMs: 60_000,
    keyPrefix: "checkout",
  },
  // Uploads — per-IP
  {
    pattern: /^\/api\/uploads/,
    method: "POST",
    limit: 20,
    windowMs: 60_000,
    keyPrefix: "uploads",
  },
  // Chat messages — per-IP
  {
    pattern: /^\/api\/chat\/rooms\/[^/]+\/messages$/,
    method: "POST",
    limit: 60,
    windowMs: 60_000,
    keyPrefix: "chat-msg",
  },
];

/** Default mutation limit for any unmatched POST/PATCH/DELETE */
const DEFAULT_MUTATION_LIMIT = 60;
const DEFAULT_MUTATION_WINDOW_MS = 60_000;

/** CORS allowed origins */
const ALLOWED_ORIGINS = [
  getCanonicalOrigin(),
  process.env.NEXT_PUBLIC_APP_URL,
  "http://localhost:3000",
  "http://localhost:3001",
].filter(Boolean) as string[];

function corsHeaders(origin: string | null) {
  const headers = new Headers();
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
  }
  headers.set("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  headers.set("Access-Control-Max-Age", "86400");
  return headers;
}

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  const method = request.method;
  const origin = request.headers.get("origin");
  const isApiRoute = pathname.startsWith("/api/");
  const requestHost = request.nextUrl.host;

  if (
    process.env.NODE_ENV === "production" &&
    !isLocalHost(requestHost) &&
    requestHost !== CANONICAL_HOST &&
    (method === "GET" || method === "HEAD")
  ) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.protocol = "https:";
    redirectUrl.host = CANONICAL_HOST;
    return NextResponse.redirect(redirectUrl, 308);
  }

  const response = NextResponse.next();
  const existingSessionKey =
    request.cookies.get(ATTRIBUTION_COOKIE_KEYS.sessionKey)?.value ?? null;

  if (!isApiRoute && method === "GET" && !existingSessionKey) {
    response.cookies.set(
      ATTRIBUTION_COOKIE_KEYS.sessionKey,
      crypto.randomUUID(),
      {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
      },
    );
  }

  const attribution = buildAttributionCookieValues(searchParams);
  if (!isApiRoute && method === "GET" && attribution.hasAny) {
    const nowIso = new Date().toISOString();
    const firstTouchedAt =
      request.cookies.get(ATTRIBUTION_COOKIE_KEYS.firstTouchedAt)?.value ?? nowIso;
    const sessionKey =
      existingSessionKey ?? crypto.randomUUID();

    response.cookies.set(ATTRIBUTION_COOKIE_KEYS.sessionKey, sessionKey, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    response.cookies.set(ATTRIBUTION_COOKIE_KEYS.firstTouchedAt, firstTouchedAt, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    response.cookies.set(ATTRIBUTION_COOKIE_KEYS.lastTouchedAt, nowIso, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    response.cookies.set(
      ATTRIBUTION_COOKIE_KEYS.landingPath,
      `${pathname}${request.nextUrl.search}`,
      {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
      },
    );

    if (attribution.refCode) {
      response.cookies.set(ATTRIBUTION_COOKIE_KEYS.ref, attribution.refCode, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
      });
    }
    if (attribution.campaignKey) {
      response.cookies.set(
        ATTRIBUTION_COOKIE_KEYS.campaign,
        attribution.campaignKey,
        {
          httpOnly: true,
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
          path: "/",
          maxAge: 60 * 60 * 24 * 30,
        },
      );
    }
    if (attribution.utmSource) {
      response.cookies.set(
        ATTRIBUTION_COOKIE_KEYS.utmSource,
        attribution.utmSource,
        {
          httpOnly: true,
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
          path: "/",
          maxAge: 60 * 60 * 24 * 30,
        },
      );
    }
    if (attribution.utmMedium) {
      response.cookies.set(
        ATTRIBUTION_COOKIE_KEYS.utmMedium,
        attribution.utmMedium,
        {
          httpOnly: true,
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
          path: "/",
          maxAge: 60 * 60 * 24 * 30,
        },
      );
    }
    if (attribution.utmCampaign) {
      response.cookies.set(
        ATTRIBUTION_COOKIE_KEYS.utmCampaign,
        attribution.utmCampaign,
        {
          httpOnly: true,
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
          path: "/",
          maxAge: 60 * 60 * 24 * 30,
        },
      );
    }
  }

  // Handle CORS preflight
  if (isApiRoute && method === "OPTIONS") {
    return new NextResponse(null, { status: 204, headers: corsHeaders(origin) });
  }

  // Only rate-limit mutation methods on API routes
  if (
    !isApiRoute ||
    !["POST", "PATCH", "PUT", "DELETE"].includes(method)
  ) {
    // Add CORS headers to all API responses
    if (isApiRoute && origin && ALLOWED_ORIGINS.includes(origin)) {
      response.headers.set("Access-Control-Allow-Origin", origin);
    }
    return response;
  }

  const ip = getClientIp(request);

  // Find matching rule
  const rule = RATE_RULES.find(
    (r) => r.pattern.test(pathname) && r.method === method
  );

  let key: string;
  let limit: number;
  let windowMs: number;

  if (rule) {
    key = `${rule.keyPrefix}:${ip}`;
    limit = rule.limit;
    windowMs = rule.windowMs;
  } else {
    key = `mutation:${ip}`;
    limit = DEFAULT_MUTATION_LIMIT;
    windowMs = DEFAULT_MUTATION_WINDOW_MS;
  }

  const result = slidingWindow(key, limit, windowMs);

  if (!result.allowed) {
    return rateLimitResponse(result.resetAt);
  }

  // Add rate limit info + CORS headers
  response.headers.set("X-RateLimit-Remaining", String(result.remaining));
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    response.headers.set("Access-Control-Allow-Origin", origin);
  }
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|txt)$).*)",
  ],
};
