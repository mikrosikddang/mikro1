"use client";

import { useState } from "react";
import ActionSheet from "@/components/ActionSheet";

interface ReviewWriteSheetProps {
  open: boolean;
  onClose: () => void;
  orderItemId: string;
  productId: string;
  productTitle: string;
}

export default function ReviewWriteSheet({
  open,
  onClose,
  orderItemId,
  productId,
  productTitle,
}: ReviewWriteSheetProps) {
  const [rating, setRating] = useState(5);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (rating < 1 || rating > 5) {
      setError("별점을 선택해주세요");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderItemId,
          productId,
          rating,
          content: content.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "리뷰 작성에 실패했습니다");
      }

      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "리뷰 작성에 실패했습니다");
      setSubmitting(false);
    }
  };

  return (
    <ActionSheet open={open} onClose={onClose} title="리뷰 작성">
      <div className="px-3 pb-4">
        {/* Product title */}
        <p className="text-[14px] text-gray-500 mb-6 truncate">{productTitle}</p>

        {/* Star Rating */}
        <div className="mb-6">
          <label className="block text-[14px] font-medium text-gray-700 mb-2">
            별점
          </label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                className="text-[28px] transition-colors"
                disabled={submitting}
              >
                <span className={star <= rating ? "text-yellow-400" : "text-gray-300"}>
                  ★
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="mb-6">
          <label className="block text-[14px] font-medium text-gray-700 mb-2">
            리뷰 내용 <span className="text-gray-400">(선택)</span>
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="상품에 대한 솔직한 리뷰를 작성해주세요"
            rows={4}
            maxLength={500}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-[15px] placeholder:text-gray-400 focus:outline-none focus:border-black transition-colors resize-none"
            disabled={submitting}
          />
          <p className="text-right text-[12px] text-gray-400 mt-1">
            {content.length}/500
          </p>
        </div>

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
            disabled={submitting}
            className="flex-1 h-12 bg-black text-white rounded-lg text-[15px] font-semibold active:bg-gray-800 transition-colors disabled:opacity-50"
          >
            {submitting ? "작성 중..." : "리뷰 등록"}
          </button>
        </div>
      </div>
    </ActionSheet>
  );
}
