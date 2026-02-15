/**
 * MVP auth — deterministic login with signed HttpOnly cookie.
 *
 * MVP Credentials (map to real DB users):
 *   customer: id="1" pw="1"  → CUSTOMER (email: mvp1@mikro.local, id: mvp-customer-1)
 *   seller:   id="s" pw="s"  → SELLER (email: seller1@mikro.local, id: mvp-seller-1)
 *
 * Session is HMAC-SHA256 signed, stored in HttpOnly cookie "mikro_session".
 */

import { cookies } from "next/headers";
import { createHmac } from "crypto";
import type { Role, Session } from "./authTypes";
import { canAccessSellerFeatures } from "./roles";

// Re-export types and helpers for convenience
export type { Role, Session };
export { UserRole } from "@prisma/client";
export * from "./roles";

/* ---------- config ---------- */

const COOKIE_NAME = "mikro_session";

// Get auth secret - allows fallback for build/dev, runtime will validate
const AUTH_SECRET =
  process.env.COOKIE_SECRET ||
  process.env.AUTH_SECRET ||
  "mikro-dev-secret-must-be-32-chars!!";

/* ---------- sign / verify ---------- */

function hmac(payload: string): string {
  return createHmac("sha256", AUTH_SECRET).update(payload).digest("hex");
}

/** Encode a session into a signed token string. */
export function signSession(session: Session): string {
  const json = JSON.stringify(session);
  const encoded = Buffer.from(json).toString("base64url");
  return `${encoded}.${hmac(json)}`;
}

/** Decode + verify a token. Returns null if invalid/tampered. */
export function verifySession(token: string): Session | null {
  try {
    const dotIdx = token.indexOf(".");
    if (dotIdx < 1) return null;

    const encoded = token.slice(0, dotIdx);
    const sig = token.slice(dotIdx + 1);
    const json = Buffer.from(encoded, "base64url").toString("utf-8");

    if (sig !== hmac(json)) return null;

    const session = JSON.parse(json) as Session;
    if (!session.userId || !session.role || !session.issuedAt) return null;

    return session;
  } catch {
    return null;
  }
}

/* ---------- server helpers (next/headers) ---------- */

/**
 * Read session from request cookies (Server Components / Route Handlers).
 * Returns null if not logged in or token invalid.
 */
export async function getSession(): Promise<Session | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySession(token);
}

/** Cookie options builder for Set-Cookie. */
export function buildCookieOptions(token: string) {
  return {
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  };
}

/** Cookie deletion options. */
export function buildDeleteCookieOptions() {
  return {
    name: COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  };
}

/* ---------- Exports ---------- */

export { COOKIE_NAME };
