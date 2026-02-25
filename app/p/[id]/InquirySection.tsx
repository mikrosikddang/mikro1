"use client";

import { useState, useEffect, useCallback } from "react";
import InquiryWriteSheet from "./InquiryWriteSheet";

interface Inquiry {
  id: string;
  question: string;
  answer: string | null;
  answeredAt: string | null;
  isSecret: boolean;
  isMine: boolean;
  userName: string;
  createdAt: string;
}

export default function InquirySection({ productId }: { productId: string }) {
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [allInquiries, setAllInquiries] = useState<Inquiry[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [showWrite, setShowWrite] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadInquiries = useCallback(async (cursor?: string | null) => {
    try {
      const params = new URLSearchParams({ limit: "5" });
      if (cursor) params.set("cursor", cursor);
      const res = await fetch(`/api/products/${productId}/inquiries?${params}`);
      if (!res.ok) return;
      const json = await res.json();
      setTotalCount(json.totalCount ?? 0);
      if (!cursor) {
        setAllInquiries(json.inquiries || []);
      } else {
        setAllInquiries((prev) => [...prev, ...(json.inquiries || [])]);
      }
      setNextCursor(json.nextCursor);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    loadInquiries();
  }, [loadInquiries]);

  const handleWriteComplete = () => {
    setShowWrite(false);
    setLoading(true);
    loadInquiries();
  };

  const handleDelete = async (inquiryId: string) => {
    if (!confirm("문의를 삭제하시겠습니까?")) return;

    setDeletingId(inquiryId);
    try {
      const res = await fetch(`/api/inquiries/${inquiryId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "삭제에 실패했습니다");
        return;
      }
      // Reload
      setLoading(true);
      loadInquiries();
    } catch {
      alert("삭제에 실패했습니다");
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) return null;

  return (
    <div className="mt-6 pt-5 border-t border-gray-100">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[18px] font-semibold text-black">
          상품 문의 ({totalCount})
        </h3>
        <button
          type="button"
          onClick={() => setShowWrite(true)}
          className="border border-gray-200 rounded-lg px-4 py-2 text-[14px] text-gray-700 active:bg-gray-50 transition-colors"
        >
          문의하기
        </button>
      </div>

      {/* Inquiry List */}
      {totalCount === 0 ? (
        <p className="text-[14px] text-gray-400 text-center py-6">
          아직 문의가 없습니다
        </p>
      ) : (
        <div className="space-y-4">
          {allInquiries.map((inquiry) => (
            <div key={inquiry.id} className="pb-4 border-b border-gray-50 last:border-0">
              {/* Question */}
              <div className="flex items-start gap-2">
                <span className="text-[14px] font-bold text-black shrink-0">Q</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-1">
                    {inquiry.isSecret && (
                      <span className="text-[12px] text-gray-400 shrink-0 mt-0.5">🔒</span>
                    )}
                    <p className="text-[14px] text-gray-800 leading-relaxed">
                      {inquiry.question}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[12px] text-gray-400">
                      {inquiry.userName}
                    </span>
                    <span className="text-[12px] text-gray-300">·</span>
                    <span className="text-[12px] text-gray-400">
                      {new Date(inquiry.createdAt).toLocaleDateString("ko-KR")}
                    </span>
                    {inquiry.isMine && !inquiry.answer && (
                      <>
                        <span className="text-[12px] text-gray-300">·</span>
                        <button
                          type="button"
                          onClick={() => handleDelete(inquiry.id)}
                          disabled={deletingId === inquiry.id}
                          className="text-[12px] text-red-400 active:text-red-600 disabled:opacity-50"
                        >
                          삭제
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Answer */}
              {inquiry.answer ? (
                <div className="flex items-start gap-2 mt-3 ml-4 pl-3 border-l-2 border-gray-200">
                  <span className="text-[14px] font-bold text-blue-600 shrink-0">A</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] text-gray-700 leading-relaxed">
                      {inquiry.answer}
                    </p>
                    {inquiry.answeredAt && (
                      <span className="text-[12px] text-gray-400 mt-1 block">
                        {new Date(inquiry.answeredAt).toLocaleDateString("ko-KR")}
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-gray-400 text-[12px] mt-2 ml-6">답변 대기중</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Load More */}
      {nextCursor && (
        <button
          type="button"
          onClick={() => loadInquiries(nextCursor)}
          className="w-full mt-4 py-3 text-[14px] font-medium text-gray-600 bg-gray-50 rounded-xl active:bg-gray-100 transition-colors"
        >
          문의 더보기
        </button>
      )}

      {/* Write Sheet */}
      <InquiryWriteSheet
        open={showWrite}
        onClose={() => setShowWrite(false)}
        onSubmitted={handleWriteComplete}
        productId={productId}
      />
    </div>
  );
}
