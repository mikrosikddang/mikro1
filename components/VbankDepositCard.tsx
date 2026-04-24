"use client";

import { useEffect, useState } from "react";
import { formatKrw, formatKstDateTime } from "@/lib/format";

type Props = {
  bank: string | null;
  accountNumber: string | null;
  holder: string | null;
  amountKrw: number;
  dueDate: Date | string | null;
};

export default function VbankDepositCard({
  bank,
  accountNumber,
  holder,
  amountKrw,
  dueDate,
}: Props) {
  const [copied, setCopied] = useState(false);
  const [remaining, setRemaining] = useState<string | null>(null);

  // 입금 기한 카운트다운
  useEffect(() => {
    if (!dueDate) {
      setRemaining(null);
      return;
    }
    const due = new Date(dueDate).getTime();
    const tick = () => {
      const diff = due - Date.now();
      if (diff <= 0) {
        setRemaining("입금 기한이 만료되었습니다");
        return;
      }
      const hours = Math.floor(diff / 3_600_000);
      const minutes = Math.floor((diff % 3_600_000) / 60_000);
      if (hours >= 24) {
        const days = Math.floor(hours / 24);
        setRemaining(`${days}일 ${hours % 24}시간 남음`);
      } else {
        setRemaining(`${hours}시간 ${minutes}분 남음`);
      }
    };
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, [dueDate]);

  const handleCopy = async () => {
    if (!accountNumber) return;
    try {
      await navigator.clipboard.writeText(accountNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert("복사에 실패했습니다. 직접 선택해 복사해주세요.");
    }
  };

  return (
    <div className="mb-6 rounded-xl border-2 border-amber-300 bg-amber-50 p-5">
      <div className="mb-3 flex items-center gap-2">
        <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[11px] font-bold text-white">
          입금 대기
        </span>
        <h2 className="text-[16px] font-bold text-amber-900">아래 계좌로 입금해주세요</h2>
      </div>

      <p className="mb-4 text-[13px] text-amber-800">
        입금이 확인되면 자동으로 주문이 확정되고 알림톡이 전송됩니다.
        입금자명이 다르면 확인이 지연될 수 있습니다.
      </p>

      <div className="space-y-3 rounded-lg bg-white p-4">
        <Row label="입금 은행" value={bank ?? "-"} />
        <Row
          label="계좌번호"
          value={accountNumber ?? "-"}
          action={
            accountNumber ? (
              <button
                type="button"
                onClick={handleCopy}
                className="rounded-md bg-black px-3 py-1 text-[12px] font-medium text-white"
              >
                {copied ? "복사됨" : "복사"}
              </button>
            ) : null
          }
          mono
        />
        <Row label="예금주" value={holder ?? "-"} />
        <Row label="입금 금액" value={formatKrw(amountKrw)} bold />
        {dueDate && (
          <Row
            label="입금 기한"
            value={
              <span>
                <span className="block">{formatKstDateTime(new Date(dueDate))}</span>
                {remaining && (
                  <span className="mt-0.5 block text-[12px] font-medium text-amber-700">
                    {remaining}
                  </span>
                )}
              </span>
            }
          />
        )}
      </div>

      <p className="mt-4 text-[12px] text-amber-700">
        ※ 입금 기한 내 입금하지 않으면 주문이 자동 취소됩니다.
      </p>
    </div>
  );
}

function Row({
  label,
  value,
  action,
  bold,
  mono,
}: {
  label: string;
  value: React.ReactNode;
  action?: React.ReactNode;
  bold?: boolean;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="shrink-0 text-[13px] text-gray-500">{label}</span>
      <div className="flex items-center gap-2">
        <span
          className={`text-right text-[14px] text-gray-900 ${
            bold ? "font-bold" : ""
          } ${mono ? "font-mono tracking-wider" : ""}`}
        >
          {value}
        </span>
        {action}
      </div>
    </div>
  );
}
