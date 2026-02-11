export function formatKrw(amount: number): string {
  return `₩${amount.toLocaleString("ko-KR")}`;
}
