/**
 * Canonical Role Helpers
 * Single source of truth for role checking throughout the application.
 * Safe for both client and server usage.
 */

import { UserRole } from "@prisma/client";

// Re-export UserRole for convenience
export { UserRole };

/**
 * Seller-like roles (can access seller features)
 */
export type SellerRole = "SELLER_PENDING" | "SELLER_ACTIVE";

/**
 * Check if a role is CUSTOMER
 */
export function isCustomer(role: UserRole): boolean {
  return role === "CUSTOMER";
}

/**
 * Check if a role is any seller role (SELLER_PENDING or SELLER_ACTIVE)
 * Note: ADMIN is NOT considered a seller role by default
 */
export function isSeller(role: UserRole): boolean {
  return role === "SELLER_PENDING" || role === "SELLER_ACTIVE";
}

/**
 * Check if a role is specifically SELLER_ACTIVE (approved seller)
 */
export function isSellerActive(role: UserRole): boolean {
  return role === "SELLER_ACTIVE";
}

/**
 * Check if a role is ADMIN
 */
export function isAdmin(role: UserRole): boolean {
  return role === "ADMIN";
}

/**
 * Check if a role can access seller features
 * (Includes both seller roles and admin)
 */
export function canAccessSellerFeatures(role: UserRole): boolean {
  return isSeller(role) || isAdmin(role);
}

/**
 * Check if a role can purchase (buyer features)
 * Per Phase 2: All authenticated users can purchase, including sellers
 */
export function canPurchase(role: UserRole): boolean {
  return true; // All authenticated users can purchase
}
