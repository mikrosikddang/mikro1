"use client";

import { useState } from "react";
import ReviewWriteSheet from "@/components/ReviewWriteSheet";

interface ReviewButtonProps {
  orderItemId: string;
  productId: string;
  productTitle: string;
  hasReview?: boolean;
}

export default function ReviewButton({
  orderItemId,
  productId,
  productTitle,
  hasReview = false,
}: ReviewButtonProps) {
  const [open, setOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (hasReview || submitted) {
    return (
      <span className="inline-block px-3 py-1 text-[13px] text-gray-400">
        작성 완료
      </span>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="px-3 py-1 text-[13px] text-gray-600 border border-gray-200 rounded-lg active:bg-gray-50 transition-colors"
      >
        리뷰 작성
      </button>

      <ReviewWriteSheet
        open={open}
        onClose={() => {
          setOpen(false);
          setSubmitted(true);
        }}
        orderItemId={orderItemId}
        productId={productId}
        productTitle={productTitle}
      />
    </>
  );
}
