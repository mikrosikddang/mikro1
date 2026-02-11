/**
 * MVP auth — deterministic login with signed HttpOnly cookie.
 *
 * Credentials:
 *   customer: id="1" pw="1"  → CUSTOMER
 *   seller:   id="s" pw="s"  → SELLER (userId = MVP_SELLER_ID)
 *
 * Session is HMAC-SHA256 signed, stored in HttpOnly cookie "mikro_session".
 */

import { cookies } from "next/headers";
import { createHmac } from "crypto";

/* ---------- types ---------- */

export type Role = "CUSTOMER" | "SELLER";

export interface Session {
  userId: string;
  role: Role;
  issuedAt: number;
}

/* ---------- config ---------- */

const COOKIE_NAME = "mikro_session";
const AUTH_SECRET =
  process.env.AUTH_SECRET || "mikro-dev-secret-must-be-32-chars!!";

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

/* ---------- API guard ---------- */

/**
 * Check session has the required role. For use in API route handlers.
 * Returns the Session on success, or null (caller should return 401).
 */
export async function requireRole(
  requiredRole: Role,
): Promise<Session | null> {
  const session = await getSession();
  if (!session) return null;
  if (requiredRole === "SELLER" && session.role !== "SELLER") return null;
  // CUSTOMER role: any logged-in user (sellers can also be customers)
  return session;
}

export { COOKIE_NAME };
