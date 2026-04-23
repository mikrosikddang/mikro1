"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface OrderClaimButtonProps {
  orderId: string;
  totalPayKrw: number;
  hasActiveClaim: boolean;
}

const ROUND_TRIP_FEE_KRW = 6000;

type ClaimType = "REFUND" | "EXCHANGE";
type ClaimReason = "CHANGED_MIND" | "DEFECT" | "WRONG_ITEM" | "DAMAGED_DELIVERY" | "OTHER";

const REASON_OPTIONS: { value: ClaimReason; label: string; description: string }[] = [
  {
    value: "CHANGED_MIND",
    label: "단순 변심",
    description: "사이즈/색상/마음이 바뀜 — 자동 승인되며 왕복배송비가 환불액에서 차감됩니다.",
  },
  {
    value: "DEFECT",
    label: "상품 하자",
    description: "오염, 손상 등 상품 자체에 문제가 있음. 셀러 검토 후 처리됩니다.",
  },
  {
    value: "WRONG_ITEM",
    label: "오배송",
    description: "주문한 상품과 다른 상품을 받았음. 셀러 검토 후 처리됩니다.",
  },
  {
    value: "DAMAGED_DELIVERY",
    label: "배송 중 파손",
    description: "포장/배송 과정에서 파손됨. 셀러 검토 후 처리됩니다.",
  },
  {
    value: "OTHER",
    label: "기타",
    description: "그 외 사유. 셀러 검토 후 처리됩니다.",
  },
];

export default function OrderClaimButton({
  orderId,
  totalPayKrw,
  hasActiveClaim,
}: OrderClaimButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<ClaimType>("REFUND");
  const [reason, setReason] = useState<ClaimReason>("CHANGED_MIND");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAutoApprove = reason === "CHANGED_MIND";
  const refundAmount = isAutoApprove
    ? Math.max(0, totalPayKrw - ROUND_TRIP_FEE_KRW)
    : totalPayKrw;

  const reasonInfo = REASON_OPTIONS.find((r) => r.value === reason)!;

  const submit = async () => {
    if (submitting) return;

    if (!isAutoApprove && message.trim().length < 5) {
      setError("사유를 5자 이상 입력해주세요.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/orders/${orderId}/claims`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          reason,
          message: message.trim() || null,
          photoUrls: [],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "신청에 실패했습니다");

      setOpen(false);
      setMessage("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "신청에 실패했습니다");
    } finally {
      setSubmitting(false);
    }
  };

  if (hasActiveClaim) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-800">
        이미 진행 중인 환불/교환 신청이 있습니다. 아래 내역을 확인해주세요.
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full rounded-xl border border-gray-300 bg-white px-6 py-3 text-[15px] font-semibold text-gray-900 transition-colors hover:bg-gray-50"
      >
        환불 / 교환 신청
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
          onClick={() => !submitting && setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-t-2xl bg-white p-5 sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-[17px] font-bold text-black">환불 / 교환 신청</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={submitting}
                className="text-[14px] text-gray-500"
              >
                닫기
              </button>
            </div>

            {/* 타입 */}
            <div className="mb-4">
              <p className="mb-2 text-[13px] font-medium text-gray-700">처리 유형</p>
              <div className="flex gap-2">
                {([
                  { value: "REFUND", label: "환불" },
                  { value: "EXCHANGE", label: "교환" },
                ] as const).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setType(opt.value)}
                    className={`flex-1 rounded-lg py-2 text-[13px] font-semibold transition-colors ${
                      type === opt.value
                        ? "bg-gray-900 text-white"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 사유 */}
            <div className="mb-4">
              <p className="mb-2 text-[13px] font-medium text-gray-700">신청 사유</p>
              <div className="space-y-2">
                {REASON_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                      reason === opt.value
                        ? "border-black bg-gray-50"
                        : "border-gray-200 bg-white"
                    }`}
                  >
                    <input
                      type="radio"
                      name="claim-reason"
                      value={opt.value}
                      checked={reason === opt.value}
                      onChange={() => setReason(opt.value)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <p className="text-[13px] font-semibold text-black">{opt.label}</p>
                      <p className="mt-0.5 text-[12px] text-gray-600">{opt.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* 사유 메시지 (단순변심 외 필수) */}
            <div className="mb-4">
              <label className="mb-1 block text-[13px] font-medium text-gray-700">
                상세 사유 {!isAutoApprove && <span className="text-red-500">*</span>}
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                maxLength={1000}
                placeholder={
                  isAutoApprove
                    ? "추가 메시지 (선택)"
                    : "발견하신 문제와 상황을 구체적으로 적어주세요."
                }
                className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-[14px] focus:border-black focus:outline-none"
              />
              <p className="mt-1 text-[11px] text-gray-400">
                * 사진 첨부는 셀러와의 채팅으로 전달해주세요.
              </p>
            </div>

            {/* 환불 안내 */}
            <div className="mb-4 rounded-lg bg-gray-50 p-3 text-[12px] text-gray-700">
              <p className="font-semibold text-gray-900">{reasonInfo.label}</p>
              <p className="mt-1">{reasonInfo.description}</p>
              {type === "REFUND" && (
                <div className="mt-2 space-y-0.5 border-t border-gray-200 pt-2">
                  <div className="flex justify-between">
                    <span>주문 결제 금액</span>
                    <span className="font-medium">{totalPayKrw.toLocaleString("ko-KR")}원</span>
                  </div>
                  {isAutoApprove && (
                    <div className="flex justify-between text-amber-700">
                      <span>왕복배송비 차감</span>
                      <span>-{ROUND_TRIP_FEE_KRW.toLocaleString("ko-KR")}원</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-gray-200 pt-1">
                    <span className="font-semibold text-black">예상 환불 금액</span>
                    <span className="font-bold text-black">
                      {refundAmount.toLocaleString("ko-KR")}원
                    </span>
                  </div>
                </div>
              )}
            </div>

            {error && (
              <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-[13px] text-red-600">
                {error}
              </div>
            )}

            <button
              type="button"
              onClick={submit}
              disabled={submitting}
              className="w-full rounded-xl bg-black py-3 text-[15px] font-bold text-white transition-colors disabled:bg-gray-300"
            >
              {submitting ? "신청 중..." : "신청하기"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
