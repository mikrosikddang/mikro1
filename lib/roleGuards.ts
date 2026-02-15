/**
 * Role Guards - Centralized role-based access control
 *
 * This module provides helpers to check permissions based on user roles.
 * All role checks should go through these helpers for consistency.
 */

import { NextResponse } from "next/server";
import type { Session } from "./authTypes";
import type { UserRole } from "@prisma/client";
import { canAccessSellerFeatures as canAccessSellerFeaturesRole, isSeller } from "./roles";

/**
 * Check if a user can use buyer features (cart, checkout, orders).
 * Per Phase 2: Both CUSTOMER and SELLER roles can buy.
 *
 * @param session - Current user session (or null if not logged in)
 * @returns true if user can use buyer features
 */
export function canUseBuyerFeatures(session: Session | null): boolean {
  if (!session) return false;

  // Any authenticated user can use buyer features
  // This includes: CUSTOMER, SELLER_PENDING, SELLER_ACTIVE, ADMIN
  return true;
}

/**
 * Check if a user has seller privileges (access to /seller pages).
 *
 * @param session - Current user session (or null if not logged in)
 * @returns true if user has seller privileges
 */
export function canAccessSellerFeatures(session: Session | null): boolean {
  if (!session) return false;

  return canAccessSellerFeaturesRole(session.role);
}

/**
 * Require buyer features access. Throws NextResponse 401/403 if not allowed.
 * Use this in API route handlers that require buyer access.
 *
 * @param session - Current user session (or null)
 * @returns The session if valid, or throws a NextResponse
 */
export function requireBuyerFeatures(session: Session | null): Session {
  if (!session) {
    throw NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  if (!canUseBuyerFeatures(session)) {
    throw NextResponse.json(
      { error: "Forbidden: Buyer features not accessible" },
      { status: 403 }
    );
  }

  return session;
}

/**
 * Require seller privileges. Throws NextResponse 401/403 if not allowed.
 * Use this in API route handlers that require seller access.
 *
 * @param session - Current user session (or null)
 * @returns The session if valid, or throws a NextResponse
 */
export function requireSeller(session: Session | null): Session {
  if (!session) {
    throw NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  if (!canAccessSellerFeatures(session)) {
    throw NextResponse.json(
      { error: "Forbidden: Seller access required" },
      { status: 403 }
    );
  }

  return session;
}

/**
 * Check if a user can access a specific resource based on ownership.
 * This is a generic helper for ownership checks.
 *
 * @param session - Current user session
 * @param ownerId - The user ID that owns the resource
 * @returns true if user can access the resource
 */
export function canAccessOwnResource(
  session: Session | null,
  ownerId: string
): boolean {
  if (!session) return false;
  return session.userId === ownerId;
}

/**
 * Check if a seller can access their own orders.
 * Seller can only see orders where order.sellerId === session.userId
 *
 * @param session - Current user session
 * @param sellerId - The seller ID from the order
 * @returns true if seller can access this order
 */
export function canSellerAccessOrder(
  session: Session | null,
  sellerId: string
): boolean {
  if (!session || !isSeller(session.role)) return false;
  return session.userId === sellerId;
}

/**
 * Check if a buyer can access their own orders.
 * Buyer can only see orders where order.buyerId === session.userId
 *
 * @param session - Current user session
 * @param buyerId - The buyer ID from the order
 * @returns true if buyer can access this order
 */
export function canBuyerAccessOrder(
  session: Session | null,
  buyerId: string
): boolean {
  if (!session) return false;
  return session.userId === buyerId;
}
