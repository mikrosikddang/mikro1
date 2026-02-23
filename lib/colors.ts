/**
 * 색상 데이터 및 그룹 정의
 */

export interface Color {
  key: string;
  labelKo: string;
  hex: string;
}

export type ColorGroup =
  | "그레이"
  | "옐로우/베이지"
  | "오렌지"
  | "레드/핑크"
  | "그린"
  | "블루"
  | "퍼플"
  | "브라운"
  | "블랙/화이트";

export const COLOR_GROUPS: ColorGroup[] = [
  "그레이",
  "옐로우/베이지",
  "오렌지",
  "레드/핑크",
  "그린",
  "블루",
  "퍼플",
  "브라운",
  "블랙/화이트",
];

/**
 * 전체 색상 데이터
 */
export const COLORS: Record<ColorGroup, Color[]> = {
  그레이: [
    { key: "화이트", labelKo: "화이트", hex: "#FFFFFF" },
    { key: "연그레이", labelKo: "연그레이", hex: "#E5E5E5" },
    { key: "그레이", labelKo: "그레이", hex: "#9E9E9E" },
    { key: "백멜란지", labelKo: "백멜란지", hex: "#D4D4D4" },
    { key: "멜란지그레이", labelKo: "멜란지그레이", hex: "#BDBDBD" },
    { key: "블루그레이", labelKo: "블루그레이", hex: "#90A4AE" },
    { key: "진그레이", labelKo: "진그레이", hex: "#616161" },
    { key: "차콜", labelKo: "차콜", hex: "#424242" },
    { key: "먹색", labelKo: "먹색", hex: "#1A1A1A" },
  ],
  "옐로우/베이지": [
    { key: "아이보리", labelKo: "아이보리", hex: "#FFFFF0" },
    { key: "크림", labelKo: "크림", hex: "#FFFDD0" },
    { key: "연베이지", labelKo: "연베이지", hex: "#F5F5DC" },
    { key: "베이지", labelKo: "베이지", hex: "#F5DEB3" },
    { key: "오트밀", labelKo: "오트밀", hex: "#E8D5B7" },
    { key: "버터", labelKo: "버터", hex: "#FFFF99" },
    { key: "머스타드", labelKo: "머스타드", hex: "#FFDB58" },
    { key: "옐로우", labelKo: "옐로우", hex: "#FFD700" },
  ],
  오렌지: [
    { key: "살구", labelKo: "살구", hex: "#FBCEB1" },
    { key: "피치", labelKo: "피치", hex: "#FFE5B4" },
    { key: "코랄", labelKo: "코랄", hex: "#FF7F50" },
    { key: "오렌지", labelKo: "오렌지", hex: "#FFA500" },
    { key: "테라코타", labelKo: "테라코타", hex: "#E2725B" },
  ],
  "레드/핑크": [
    { key: "연핑크", labelKo: "연핑크", hex: "#FFB6C1" },
    { key: "핑크", labelKo: "핑크", hex: "#FFC0CB" },
    { key: "핫핑크", labelKo: "핫핑크", hex: "#FF69B4" },
    { key: "로즈", labelKo: "로즈", hex: "#FF007F" },
    { key: "버건디", labelKo: "버건디", hex: "#800020" },
    { key: "레드", labelKo: "레드", hex: "#FF0000" },
  ],
  그린: [
    { key: "민트", labelKo: "민트", hex: "#98FF98" },
    { key: "라임", labelKo: "라임", hex: "#00FF00" },
    { key: "그린", labelKo: "그린", hex: "#008000" },
    { key: "올리브", labelKo: "올리브", hex: "#808000" },
    { key: "카키", labelKo: "카키", hex: "#C3B091" },
    { key: "딥그린", labelKo: "딥그린", hex: "#013220" },
  ],
  블루: [
    { key: "스카이블루", labelKo: "스카이블루", hex: "#87CEEB" },
    { key: "블루", labelKo: "블루", hex: "#0000FF" },
    { key: "네이비", labelKo: "네이비", hex: "#000080" },
    { key: "코발트", labelKo: "코발트", hex: "#0047AB" },
    { key: "청록", labelKo: "청록", hex: "#008080" },
  ],
  퍼플: [
    { key: "라벤더", labelKo: "라벤더", hex: "#E6E6FA" },
    { key: "퍼플", labelKo: "퍼플", hex: "#800080" },
    { key: "네온퍼플", labelKo: "네온퍼플", hex: "#BC13FE" },
    { key: "딥퍼플", labelKo: "딥퍼플", hex: "#4B0082" },
  ],
  브라운: [
    { key: "라이트브라운", labelKo: "라이트브라운", hex: "#D2691E" },
    { key: "브라운", labelKo: "브라운", hex: "#A52A2A" },
    { key: "모카", labelKo: "모카", hex: "#967969" },
    { key: "밤색", labelKo: "밤색", hex: "#954535" },
    { key: "초코", labelKo: "초코", hex: "#7B3F00" },
    { key: "카멜", labelKo: "카멜", hex: "#C19A6B" },
  ],
  "블랙/화이트": [
    { key: "블랙", labelKo: "블랙", hex: "#000000" },
    { key: "오프화이트", labelKo: "오프화이트", hex: "#FAF9F6" },
    { key: "화이트", labelKo: "화이트", hex: "#FFFFFF" },
  ],
};

/**
 * 모든 색상을 flat array로 반환
 */
export function getAllColors(): Color[] {
  return Object.values(COLORS).flat();
}

/**
 * key로 색상 검색
 */
export function getColorByKey(key: string): Color | undefined {
  return getAllColors().find((c) => c.key === key);
}

/**
 * 색상 검색 (텍스트 매칭)
 */
export function searchColors(query: string): Color[] {
  if (!query.trim()) return [];

  const lowerQuery = query.toLowerCase().trim();
  return getAllColors().filter((c) =>
    c.labelKo.toLowerCase().includes(lowerQuery)
  );
}

/**
 * 색상 키 정규화 (저장용)
 * - trim + 공백 collapse + 대소문자 유지
 */
export function normalizeColorKey(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}
