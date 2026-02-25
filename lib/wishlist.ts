const STORAGE_KEY = "mikro_wishlist";

// ─── LocalStorage (비로그인용) ───

export function getWishlist(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function isWishlisted(id: string): boolean {
  return getWishlist().includes(id);
}

export function toggleWishlist(id: string): string[] {
  const list = getWishlist();
  const idx = list.indexOf(id);
  if (idx >= 0) {
    list.splice(idx, 1);
  } else {
    list.unshift(id);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  window.dispatchEvent(new Event("wishlist-change"));
  return list;
}

// ─── DB API (로그인용) ───

export async function addWishlistDB(productId: string): Promise<boolean> {
  try {
    const res = await fetch("/api/wishlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId }),
    });
    if (res.ok) {
      window.dispatchEvent(new Event("wishlist-change"));
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export async function removeWishlistDB(productId: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/wishlist/${productId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      window.dispatchEvent(new Event("wishlist-change"));
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export async function checkWishlistDB(productIds: string[]): Promise<Record<string, boolean>> {
  if (productIds.length === 0) return {};
  try {
    const res = await fetch(`/api/wishlist/check?productIds=${productIds.join(",")}`);
    if (!res.ok) return {};
    const data = await res.json();
    return data.wishlisted ?? {};
  } catch {
    return {};
  }
}
