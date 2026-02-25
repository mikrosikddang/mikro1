import { NextRequest, NextResponse } from "next/server";
import {
  slidingWindow,
  getClientIp,
  rateLimitResponse,
} from "@/lib/rateLimit";

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
];

/** Default mutation limit for any unmatched POST/PATCH/DELETE */
const DEFAULT_MUTATION_LIMIT = 60;
const DEFAULT_MUTATION_WINDOW_MS = 60_000;

/** CORS allowed origins */
const ALLOWED_ORIGINS = [
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
  const { pathname } = request.nextUrl;
  const method = request.method;
  const origin = request.headers.get("origin");

  // Handle CORS preflight
  if (pathname.startsWith("/api/") && method === "OPTIONS") {
    return new NextResponse(null, { status: 204, headers: corsHeaders(origin) });
  }

  // Only rate-limit mutation methods on API routes
  if (
    !pathname.startsWith("/api/") ||
    !["POST", "PATCH", "PUT", "DELETE"].includes(method)
  ) {
    const response = NextResponse.next();
    // Add CORS headers to all API responses
    if (pathname.startsWith("/api/") && origin && ALLOWED_ORIGINS.includes(origin)) {
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
  const response = NextResponse.next();
  response.headers.set("X-RateLimit-Remaining", String(result.remaining));
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    response.headers.set("Access-Control-Allow-Origin", origin);
  }
  return response;
}

export const config = {
  matcher: "/api/:path*",
};
