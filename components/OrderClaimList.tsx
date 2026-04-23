"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { OrderClaim } from "@prisma/client";
import { formatKstDateTime, formatKrw } from "@/lib/format";

interface Props {
  claims: OrderClaim[];
  isBuyer: boolean;
  isSeller: boolean;
}

const TYPE_LABEL: Record<string, string> = { REFUND: "환불", EXCHANGE: "교환" };
const REASON_LABEL: Record<string, string> = {
  CHANGED_MIND: "단순 변심",
  DEFECT: "상품 하자",
  WRONG_ITEM: "오배송",
  DAMAGED_DELIVERY: "배송 중 파손",
  OTHER: "기타",
};
const STATUS_LABEL: Record<string, string> = {
  REQUESTED: "신청 (셀러 검토 대기)",
  APPROVED: "승인됨",
  REJECTED: "반려됨",
  COMPLETED: "처리 완료",
  CANCELLED: "신청 취소됨",
};
const STATUS_COLOR: Record<string, string> = {
  REQUESTED: "bg-amber-50 text-amber-800",
  APPROVED: "bg-blue-50 text-blue-800",
  REJECTED: "bg-red-50 text-red-700",
  COMPLETED: "bg-green-50 text-green-800",
  CANCELLED: "bg-gray-100 text-gray-600",
};

export default function OrderClaimList({ claims, isBuyer, isSeller }: Props) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [responseDraft, setResponseDraft] = useState<Record<string, string>>({});

  if (claims.length === 0) return null;

  const act = async (claimId: string, status: string, sellerResponse?: string) => {
    if (busyId) return;
    setBusyId(claimId);
    setError(null);
    try {
      const res = await fetch(`/api/claims/${claimId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, sellerResponse }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "처리에 실패했습니다");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "처리에 실패했습니다");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-3">
      <h3 className="text-[15px] font-bold text-black">환불 / 교환 신청 내역</h3>
      {error && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-[13px] text-red-600">{error}</div>
      )}
      {claims.map((claim) => (
        <div key={claim.id} className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                STATUS_COLOR[claim.status] ?? ""
              }`}
            >
              {STATUS_LABEL[claim.status] ?? claim.status}
            </span>
            <span className="text-[11px] text-gray-400">
              {formatKstDateTime(claim.createdAt)}
            </span>
          </div>
          <p className="text-[14px] font-semibold text-black">
            {TYPE_LABEL[claim.type] ?? claim.type} · {REASON_LABEL[claim.reason] ?? claim.reason}
          </p>
          {claim.message && (
            <p className="mt-1 whitespace-pre-wrap text-[13px] text-gray-700">{claim.message}</p>
          )}

          {claim.refundAmountKrw > 0 && (
            <div className="mt-2 rounded-lg bg-gray-50 p-2 text-[12px] text-gray-700">
              {claim.buyerBurdenKrw > 0 && (
                <div className="flex justify-between">
                  <span>왕복배송비 차감</span>
                  <span className="text-amber-700">
                    -{formatKrw(claim.buyerBurdenKrw)}
                  </span>
                </div>
              )}
              <div className="flex justify-between font-semibold text-black">
                <span>환불 예정 금액</span>
                <span>{formatKrw(claim.refundAmountKrw)}</span>
              </div>
            </div>
          )}

          {claim.sellerResponse && (
            <div className="mt-2 rounded-lg bg-gray-50 p-2 text-[12px] text-gray-800">
              <p className="font-semibold text-gray-900">셀러 응답</p>
              <p className="mt-0.5 whitespace-pre-wrap">{claim.sellerResponse}</p>
            </div>
          )}

          {/* 액션 버튼 */}
          <div className="mt-3 flex flex-wrap gap-2">
            {isBuyer && claim.status === "REQUESTED" && (
              <button
                type="button"
                onClick={() => act(claim.id, "CANCELLED")}
                disabled={busyId === claim.id}
                className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-[12px] font-medium text-gray-700"
              >
                {busyId === claim.id ? "처리중..." : "신청 취소"}
              </button>
            )}

            {isSeller && claim.status === "REQUESTED" && (
              <div className="flex w-full flex-col gap-2">
                <textarea
                  rows={2}
                  value={responseDraft[claim.id] ?? ""}
                  onChange={(e) =>
                    setResponseDraft((prev) => ({ ...prev, [claim.id]: e.target.value }))
                  }
                  placeholder="응답/반려 사유 (반려 시 필수)"
                  className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-[13px] focus:border-black focus:outline-none"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => act(claim.id, "APPROVED", responseDraft[claim.id])}
                    disabled={busyId === claim.id}
                    className="flex-1 rounded-lg bg-black px-3 py-2 text-[13px] font-semibold text-white disabled:bg-gray-300"
                  >
                    {busyId === claim.id ? "처리중..." : "승인"}
                  </button>
                  <button
                    type="button"
                    onClick={() => act(claim.id, "REJECTED", responseDraft[claim.id])}
                    disabled={busyId === claim.id}
                    className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-[13px] font-semibold text-gray-700 disabled:opacity-50"
                  >
                    반려
                  </button>
                </div>
              </div>
            )}

            {isSeller && claim.status === "APPROVED" && (
              <button
                type="button"
                onClick={() => act(claim.id, "COMPLETED")}
                disabled={busyId === claim.id}
                className="rounded-lg bg-black px-3 py-1.5 text-[12px] font-semibold text-white disabled:bg-gray-300"
              >
                {busyId === claim.id ? "처리중..." : "처리 완료"}
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
