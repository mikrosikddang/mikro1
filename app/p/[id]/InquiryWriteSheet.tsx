"use client";

import { useState } from "react";
import ActionSheet from "@/components/ActionSheet";

interface InquiryWriteSheetProps {
  open: boolean;
  onClose: () => void;
  onSubmitted: () => void;
  productId: string;
}

export default function InquiryWriteSheet({
  open,
  onClose,
  onSubmitted,
  productId,
}: InquiryWriteSheetProps) {
  const [question, setQuestion] = useState("");
  const [isSecret, setIsSecret] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    const trimmed = question.trim();
    if (!trimmed) {
      setError("문의 내용을 입력해주세요");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/products/${productId}/inquiries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmed, isSecret }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "문의 작성에 실패했습니다");
      }

      setQuestion("");
      setIsSecret(false);
      onSubmitted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "문의 작성에 실패했습니다");
      setSubmitting(false);
    }
  };

  return (
    <ActionSheet open={open} onClose={onClose} title="상품 문의">
      <div className="px-3 pb-4">
        {/* Textarea */}
        <div className="mb-4">
          <label className="block text-[14px] font-medium text-gray-700 mb-2">
            문의 내용
          </label>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="궁금한 점을 작성해주세요"
            rows={4}
            maxLength={1000}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-[15px] placeholder:text-gray-400 focus:outline-none focus:border-black transition-colors resize-none"
            disabled={submitting}
          />
          <p className="text-right text-[12px] text-gray-400 mt-1">
            {question.length}/1000
          </p>
        </div>

        {/* Secret toggle */}
        <label className="flex items-center gap-2 mb-6 cursor-pointer">
          <input
            type="checkbox"
            checked={isSecret}
            onChange={(e) => setIsSecret(e.target.checked)}
            disabled={submitting}
            className="w-4 h-4 rounded border-gray-300 text-black focus:ring-black"
          />
          <span className="text-[14px] text-gray-600">비밀글로 작성</span>
        </label>

        {/* Error */}
        {error && (
          <p className="text-[13px] text-red-500 text-center mb-4">{error}</p>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="flex-1 h-12 rounded-lg border border-gray-200 text-[15px] font-semibold text-gray-700 active:bg-gray-50 transition-colors disabled:opacity-50"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || question.trim().length === 0}
            className="flex-1 h-12 bg-black text-white rounded-lg text-[15px] font-semibold active:bg-gray-800 transition-colors disabled:opacity-50"
          >
            {submitting ? "등록 중..." : "문의 등록"}
          </button>
        </div>
      </div>
    </ActionSheet>
  );
}
