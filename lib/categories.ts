/**
 * 3-Depth 카테고리 구조 (여성의류 / 남성의류 / 가구·소품)
 * 아동 카테고리는 제외
 */

export type CategoryMain = "여성의류" | "남성의류" | "가구/소품";

export interface CategoryStructure {
  [midCategory: string]: string[]; // { "상의": ["티셔츠", "셔츠", ...] }
}

export interface CategoryTree {
  [mainCategory: string]: CategoryStructure;
}

/**
 * 전체 카테고리 트리
 */
export const CATEGORY_TREE: CategoryTree = {
  여성의류: {
    상의: [
      "티셔츠",
      "셔츠/블라우스",
      "니트/스웨터",
      "후드/맨투맨",
      "민소매/나시",
    ],
    아우터: [
      "자켓",
      "코트",
      "패딩/다운",
      "가디건",
      "점퍼/바람막이",
      "베스트",
    ],
    하의: [
      "데님",
      "슬랙스",
      "트레이닝/조거",
      "숏팬츠",
      "레깅스",
    ],
    스커트: [
      "미니",
      "미디",
      "롱",
    ],
    원피스: [
      "미니",
      "미디",
      "롱",
      "점프수트/올인원",
    ],
    "언더웨어/홈웨어": [
      "브라",
      "팬티",
      "세트",
      "잠옷/라운지",
    ],
    비치웨어: [
      "비키니",
      "원피스수영복",
      "래쉬가드",
    ],
    신발: [
      "스니커즈",
      "로퍼",
      "힐",
      "부츠",
      "샌들/슬리퍼",
    ],
    가방: [
      "토트",
      "숄더",
      "크로스",
      "백팩",
      "클러치",
    ],
    액세서리: [
      "주얼리",
      "모자",
      "벨트",
      "머플러/스카프",
      "양말",
      "선글라스/안경",
    ],
  },
  남성의류: {
    상의: [
      "티셔츠",
      "셔츠",
      "니트/스웨터",
      "후드/맨투맨",
      "민소매",
    ],
    아우터: [
      "자켓",
      "코트",
      "패딩/다운",
      "점퍼/바람막이",
      "베스트",
    ],
    하의: [
      "데님",
      "슬랙스",
      "트레이닝/조거",
      "숏팬츠",
    ],
    "수트/셋업": [
      "수트",
      "셋업",
    ],
    언더웨어: [
      "드로즈/팬티",
      "이너웨어",
    ],
    신발: [
      "스니커즈",
      "로퍼",
      "부츠",
      "샌들/슬리퍼",
    ],
    가방: [
      "백팩",
      "크로스",
      "토트",
    ],
    액세서리: [
      "시계",
      "모자",
      "벨트",
      "양말",
      "선글라스/안경",
    ],
  },
  "가구/소품": {
    가구: ["테이블/책상", "의자/스툴", "소파", "침대/매트리스", "수납/선반"],
    조명: ["스탠드", "펜던트/천장등", "무드등/캔들홀더"],
    패브릭: ["커튼/블라인드", "쿠션/방석", "러그/매트", "침구/이불"],
    인테리어소품: ["액자/포스터", "캔들/디퓨저", "화분/플랜트", "오브제/장식", "시계"],
  },
};

/**
 * Main 카테고리 목록
 */
export const MAIN_CATEGORIES: CategoryMain[] = ["여성의류", "남성의류", "가구/소품"];

/**
 * Mid 카테고리 목록 가져오기
 */
export function getMidCategories(main: CategoryMain): string[] {
  return Object.keys(CATEGORY_TREE[main] || {});
}

/**
 * Sub 카테고리 목록 가져오기
 */
export function getSubCategories(main: CategoryMain, mid: string): string[] {
  return CATEGORY_TREE[main]?.[mid] || [];
}

/**
 * Breadcrumb 생성
 */
export function getCategoryBreadcrumb(
  main?: string | null,
  mid?: string | null,
  sub?: string | null
): string {
  const parts = [main, mid, sub].filter(Boolean);
  return parts.length > 0 ? parts.join(" > ") : "카테고리 선택";
}

/**
 * 카테고리 유효성 검사
 */
export function validateCategory(
  main?: string | null,
  mid?: string | null,
  sub?: string | null
): boolean {
  if (!main || !mid || !sub) return false;

  const validMain = MAIN_CATEGORIES.includes(main as CategoryMain);
  if (!validMain) return false;

  const midCategories = getMidCategories(main as CategoryMain);
  if (!midCategories.includes(mid)) return false;

  const subCategories = getSubCategories(main as CategoryMain, mid);
  return subCategories.includes(sub);
}

/**
 * 최근 선택 카테고리 저장/조회 (localStorage)
 */
const RECENT_CATEGORIES_KEY = "mikro.recentCategories";
const MAX_RECENT_CATEGORIES = 6;

export interface RecentCategory {
  main: string;
  mid: string;
  sub: string;
  timestamp: number;
}

export function getRecentCategories(): RecentCategory[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(RECENT_CATEGORIES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function pushRecentCategory(main: string, mid: string, sub: string): void {
  if (typeof window === "undefined") return;

  try {
    const recent = getRecentCategories();
    // 중복 제거 (같은 main+mid+sub)
    const filtered = recent.filter(
      (r) => !(r.main === main && r.mid === mid && r.sub === sub)
    );

    // 최신 항목을 맨 앞에 추가
    const updated = [
      { main, mid, sub, timestamp: Date.now() },
      ...filtered,
    ].slice(0, MAX_RECENT_CATEGORIES);

    localStorage.setItem(RECENT_CATEGORIES_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error("Failed to save recent category:", error);
  }
}
