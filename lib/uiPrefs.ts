/**
 * UI Preferences - Client-side localStorage management
 * Safe for SSR (checks typeof window)
 */

export type HomeFeedViewMode = "feed" | "carrot";
export type SellerMode = "buyer" | "seller";

const STORAGE_KEYS = {
  HOME_FEED_VIEW_MODE: "homeFeedViewMode",
  SELLER_MODE: "sellerMode",
};

const DEFAULT_VIEW_MODE: HomeFeedViewMode = "carrot";

/**
 * Get current home feed view mode
 */
export function getHomeFeedViewMode(): HomeFeedViewMode {
  if (typeof window === "undefined") return DEFAULT_VIEW_MODE;

  try {
    const stored = localStorage.getItem(STORAGE_KEYS.HOME_FEED_VIEW_MODE);
    if (stored === "feed" || stored === "carrot") {
      return stored;
    }
  } catch (error) {
    console.error("Failed to read viewMode from localStorage:", error);
  }

  return DEFAULT_VIEW_MODE;
}

/**
 * Set home feed view mode
 */
export function setHomeFeedViewMode(mode: HomeFeedViewMode): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(STORAGE_KEYS.HOME_FEED_VIEW_MODE, mode);
  } catch (error) {
    console.error("Failed to save viewMode to localStorage:", error);
  }
}

/**
 * Get current seller mode
 */
export function getSellerMode(): SellerMode {
  if (typeof window === "undefined") return "buyer";

  try {
    const stored = localStorage.getItem(STORAGE_KEYS.SELLER_MODE);
    if (stored === "buyer" || stored === "seller") {
      return stored;
    }
  } catch (error) {
    console.error("Failed to read sellerMode from localStorage:", error);
  }

  return "buyer";
}

/**
 * Set seller mode
 */
export function setSellerMode(mode: SellerMode): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(STORAGE_KEYS.SELLER_MODE, mode);
  } catch (error) {
    console.error("Failed to save sellerMode to localStorage:", error);
  }
}
