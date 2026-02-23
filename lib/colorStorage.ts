/**
 * 색상 관련 localStorage 관리
 * - 즐겨찾는 색상
 * - 최근 선택한 색상
 * - 최근 검색어
 */

const FAVORITE_COLORS_KEY = "mikro.favoriteColors";
const RECENT_COLORS_KEY = "mikro.recentColors";
const RECENT_SEARCHES_KEY = "mikro.recentColorSearches";

const MAX_RECENT_COLORS = 8;
const MAX_RECENT_SEARCHES = 10;

/**
 * 즐겨찾는 색상
 */
export function getFavoriteColors(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(FAVORITE_COLORS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function toggleFavoriteColor(colorKey: string): boolean {
  if (typeof window === "undefined") return false;

  try {
    const favorites = getFavoriteColors();
    const index = favorites.indexOf(colorKey);

    if (index > -1) {
      // 이미 즐겨찾기에 있으면 제거
      favorites.splice(index, 1);
      localStorage.setItem(FAVORITE_COLORS_KEY, JSON.stringify(favorites));
      return false;
    } else {
      // 없으면 추가
      favorites.push(colorKey);
      localStorage.setItem(FAVORITE_COLORS_KEY, JSON.stringify(favorites));
      return true;
    }
  } catch (error) {
    console.error("Failed to toggle favorite color:", error);
    return false;
  }
}

export function isFavoriteColor(colorKey: string): boolean {
  return getFavoriteColors().includes(colorKey);
}

/**
 * 최근 선택한 색상
 */
export function getRecentColors(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(RECENT_COLORS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function pushRecentColor(colorKey: string): void {
  if (typeof window === "undefined") return;

  try {
    const recent = getRecentColors();
    // 중복 제거
    const filtered = recent.filter((c) => c !== colorKey);

    // 최신 항목을 맨 앞에 추가
    const updated = [colorKey, ...filtered].slice(0, MAX_RECENT_COLORS);

    localStorage.setItem(RECENT_COLORS_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error("Failed to save recent color:", error);
  }
}

/**
 * 최근 검색어
 */
export function getRecentSearches(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function pushRecentSearch(query: string): void {
  if (typeof window === "undefined") return;
  if (!query.trim()) return;

  try {
    const recent = getRecentSearches();
    // 중복 제거
    const filtered = recent.filter((q) => q !== query);

    // 최신 항목을 맨 앞에 추가
    const updated = [query, ...filtered].slice(0, MAX_RECENT_SEARCHES);

    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error("Failed to save recent search:", error);
  }
}

export function removeRecentSearch(query: string): void {
  if (typeof window === "undefined") return;

  try {
    const recent = getRecentSearches();
    const filtered = recent.filter((q) => q !== query);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error("Failed to remove recent search:", error);
  }
}

export function clearRecentSearches(): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.removeItem(RECENT_SEARCHES_KEY);
  } catch (error) {
    console.error("Failed to clear recent searches:", error);
  }
}
