"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatKrw } from "@/lib/format";

type Props = {
  beneficiaryUserId: string;
  amountKrw: number;
};

export default function PayoutRequestButton({
  beneficiaryUserId,
  amountKrw,
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const handleRequest = async () => {
    const ok = confirm(
      `${formatKrw(amountKrw)}을 토스 지급대행으로 즉시 요청하시겠습니까?\n\n` +
        `EXPRESS(바로지급)는 영업일 08:00~15:00 사이에만 처리됩니다.`,
    );
    if (!ok) return;

    setBusy(true);
    try {
      const res = await fetch("/api/admin/payouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          beneficiaryUserId,
          scheduleType: "EXPRESS",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(
          `지급대행 요청 실패\n\n${data.message ?? data.error ?? "알 수 없는 오류"}${
            data.detail ? `\n\n상세: ${data.detail}` : ""
          }`,
        );
        return;
      }
      alert("지급대행 요청 완료. 토스페이먼츠에서 처리 중입니다.");
      router.refresh();
    } catch (err) {
      alert(`지급대행 요청 중 오류: ${err instanceof Error ? err.message : "UNKNOWN"}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      disabled={busy}
      onClick={handleRequest}
      className="rounded-md bg-black px-3 py-1.5 text-xs font-medium text-white disabled:bg-gray-300"
    >
      {busy ? "처리중..." : "지급 요청"}
    </button>
  );
}
