export function formatKrw(amount: number): string {
  return `${amount.toLocaleString("ko-KR")}원`;
}

const KST = "Asia/Seoul";

/** 한국시간 기준 날짜+시간 (예: 2026.04.04 14:23) */
export function formatKstDateTime(value: Date | string | number): string {
  return new Date(value).toLocaleString("ko-KR", {
    timeZone: KST,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/** 한국시간 기준 날짜만 (예: 2026.04.04) */
export function formatKstDate(value: Date | string | number): string {
  return new Date(value).toLocaleDateString("ko-KR", {
    timeZone: KST,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

/** 한국시간 기준 시간만 (예: 14:23) */
export function formatKstTime(value: Date | string | number): string {
  return new Date(value).toLocaleTimeString("ko-KR", {
    timeZone: KST,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/** 채팅 등에서 쓰는 상대시간 (오늘이면 시간만, 그외 날짜) */
export function formatKstRelative(value: Date | string | number): string {
  const date = new Date(value);
  const now = new Date();
  const todayKst = formatKstDate(now);
  const dateKst = formatKstDate(date);
  if (todayKst === dateKst) return formatKstTime(date);
  return formatKstDate(date);
}
