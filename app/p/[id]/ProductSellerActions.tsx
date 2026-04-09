"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface ProductSellerActionsProps {
  productId: string;
  postType: "SALE" | "ARCHIVE";
}

export default function ProductSellerActions({
  productId,
  postType,
}: ProductSellerActionsProps) {
  const router = useRouter();
  const [hiding, setHiding] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleHide = async () => {
    setHiding(true);
    setShowConfirm(false);

    try {
      const res = await fetch(`/api/seller/products/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: false }),
      });

      if (!res.ok) {
        throw new Error("상품 숨기기 실패");
      }

      // Redirect to seller products page
      router.push(postType === "ARCHIVE" ? "/space" : "/seller/products");
      router.refresh();
    } catch {
      alert("상품 숨기기에 실패했습니다.");
      setHiding(false);
    }
  };

  return (
    <>
      <div className="mt-4 mb-6 flex gap-2">
        <Link
          href={`/p/${productId}/edit`}
          className="flex-1 h-11 bg-gray-100 text-black rounded-lg text-[15px] font-medium flex items-center justify-center active:bg-gray-200 transition-colors"
        >
          정보 수정
        </Link>
        <button
          type="button"
          onClick={() => setShowConfirm(true)}
          disabled={hiding}
          className="flex-1 h-11 bg-gray-100 text-gray-700 rounded-lg text-[15px] font-medium active:bg-gray-200 transition-colors disabled:opacity-50"
        >
          {hiding ? "숨기는 중..." : "숨기기"}
        </button>
      </div>

      {/* Confirm Modal */}
      {showConfirm && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 z-[100] bg-black/40"
            onClick={() => setShowConfirm(false)}
          />

          {/* Modal */}
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-[280px] w-full overflow-hidden">
              <div className="p-6 text-center">
                <h3 className="text-[17px] font-bold text-gray-900 mb-2">
                  상품을 숨기시겠어요?
                </h3>
                <p className="text-[14px] text-gray-600">
                  숨긴 상품은 고객에게 보이지 않습니다.
                </p>
              </div>

              <div className="grid grid-cols-2 border-t border-gray-200">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="h-12 text-[16px] font-medium text-gray-600 active:bg-gray-50"
                >
                  취소
                </button>
                <button
                  onClick={handleHide}
                  disabled={hiding}
                  className="h-12 text-[16px] font-bold text-red-600 active:bg-gray-50 border-l border-gray-200 disabled:opacity-50"
                >
                  {hiding ? "처리 중..." : "숨기기"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
