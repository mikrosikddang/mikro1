"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import ActionSheet from "@/components/ActionSheet";

interface SellerInquiry {
  id: string;
  question: string;
  answer: string | null;
  answeredAt: string | null;
  isSecret: boolean;
  userName: string;
  productId: string;
  productTitle: string;
  createdAt: string;
}

type StatusFilter = "all" | "unanswered" | "answered";

export default function SellerInquiriesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialStatus = (searchParams.get("status") as StatusFilter) || "all";

  const [inquiries, setInquiries] = useState<SellerInquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(initialStatus);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [unansweredCount, setUnansweredCount] = useState(0);

  // Answer sheet state
  const [answeringInquiry, setAnsweringInquiry] = useState<SellerInquiry | null>(null);
  const [answerText, setAnswerText] = useState("");
  const [submittingAnswer, setSubmittingAnswer] = useState(false);
  const [answerError, setAnswerError] = useState<string | null>(null);

  const loadInquiries = useCallback(async (status: StatusFilter, cursor?: string | null) => {
    try {
      const params = new URLSearchParams({ status, limit: "10" });
      if (cursor) params.set("cursor", cursor);
      const res = await fetch(`/api/seller/inquiries?${params}`);
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      if (!res.ok) return;
      const json = await res.json();
      if (!cursor) {
        setInquiries(json.inquiries || []);
      } else {
        setInquiries((prev) => [...prev, ...(json.inquiries || [])]);
      }
      setNextCursor(json.nextCursor);
      setTotalCount(json.totalCount ?? 0);
      setUnansweredCount(json.unansweredCount ?? 0);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    setLoading(true);
    setInquiries([]);
    loadInquiries(statusFilter);
  }, [statusFilter, loadInquiries]);

  const handleSubmitAnswer = async () => {
    if (!answeringInquiry) return;
    const trimmed = answerText.trim();
    if (!trimmed) {
      setAnswerError("답변 내용을 입력해주세요");
      return;
    }

    setSubmittingAnswer(true);
    setAnswerError(null);

    try {
      const res = await fetch(`/api/inquiries/${answeringInquiry.id}/answer`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answer: trimmed }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "답변 등록에 실패했습니다");
      }

      setAnsweringInquiry(null);
      setAnswerText("");
      // Reload
      setLoading(true);
      loadInquiries(statusFilter);
    } catch (err) {
      setAnswerError(err instanceof Error ? err.message : "답변 등록에 실패했습니다");
      setSubmittingAnswer(false);
    }
  };

  return (
    <div className="py-4">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-[20px] font-bold text-black mb-1">문의 관리</h1>
        <p className="text-[14px] text-gray-500">
          전체 {totalCount}건 · 미답변 {unansweredCount}건
        </p>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex border-b border-gray-200 mb-4">
        {([
          { value: "all" as const, label: "전체" },
          { value: "unanswered" as const, label: "미답변" },
          { value: "answered" as const, label: "답변완료" },
        ]).map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setStatusFilter(tab.value)}
            className={`flex-1 py-3 text-[14px] font-medium text-center transition-colors ${
              statusFilter === tab.value
                ? "text-black border-b-2 border-black"
                : "text-gray-400"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Inquiry List */}
      {loading ? (
        <div className="py-8 text-center text-gray-400 text-[14px]">
          불러오는 중...
        </div>
      ) : inquiries.length === 0 ? (
        <div className="py-8 text-center text-gray-400 text-[14px]">
          {statusFilter === "unanswered" ? "미답변 문의가 없습니다" : "문의가 없습니다"}
        </div>
      ) : (
        <div className="space-y-3">
          {inquiries.map((inquiry) => (
            <div
              key={inquiry.id}
              className="p-4 bg-white rounded-xl border border-gray-100"
            >
              {/* Product info */}
              <Link
                href={`/p/${inquiry.productId}`}
                className="text-[12px] text-blue-600 font-medium truncate block mb-2"
              >
                {inquiry.productTitle}
              </Link>

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
                    <span className="text-[12px] text-gray-400">{inquiry.userName}</span>
                    <span className="text-[12px] text-gray-300">·</span>
                    <span className="text-[12px] text-gray-400">
                      {new Date(inquiry.createdAt).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Answer or Answer Button */}
              {inquiry.answer ? (
                <div className="flex items-start gap-2 mt-3 ml-4 pl-3 border-l-2 border-gray-200">
                  <span className="text-[14px] font-bold text-blue-600 shrink-0">A</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] text-gray-700 leading-relaxed">
                      {inquiry.answer}
                    </p>
                    {inquiry.answeredAt && (
                      <span className="text-[12px] text-gray-400 mt-1 block">
                        {new Date(inquiry.answeredAt).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" })}
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setAnsweringInquiry(inquiry);
                    setAnswerText("");
                    setAnswerError(null);
                    setSubmittingAnswer(false);
                  }}
                  className="mt-3 px-4 py-2 bg-black text-white rounded-lg text-[13px] font-semibold active:bg-gray-800 transition-colors"
                >
                  답변하기
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Load More */}
      {nextCursor && (
        <button
          type="button"
          onClick={() => loadInquiries(statusFilter, nextCursor)}
          className="w-full mt-4 py-3 text-[14px] font-medium text-gray-600 bg-gray-50 rounded-xl active:bg-gray-100 transition-colors"
        >
          더보기
        </button>
      )}

      {/* Answer Sheet */}
      <ActionSheet
        open={!!answeringInquiry}
        onClose={() => setAnsweringInquiry(null)}
        title="답변 작성"
      >
        <div className="px-3 pb-4">
          {/* Original question preview */}
          {answeringInquiry && (
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-[12px] text-gray-500 mb-1">문의 내용</p>
              <p className="text-[14px] text-gray-800 leading-relaxed">
                {answeringInquiry.question}
              </p>
            </div>
          )}

          {/* Answer textarea */}
          <div className="mb-4">
            <label className="block text-[14px] font-medium text-gray-700 mb-2">
              답변 내용
            </label>
            <textarea
              value={answerText}
              onChange={(e) => setAnswerText(e.target.value)}
              placeholder="답변을 입력해주세요"
              rows={4}
              maxLength={2000}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-[15px] placeholder:text-gray-400 focus:outline-none focus:border-black transition-colors resize-none"
              disabled={submittingAnswer}
            />
            <p className="text-right text-[12px] text-gray-400 mt-1">
              {answerText.length}/2000
            </p>
          </div>

          {/* Error */}
          {answerError && (
            <p className="text-[13px] text-red-500 text-center mb-4">{answerError}</p>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setAnsweringInquiry(null)}
              disabled={submittingAnswer}
              className="flex-1 h-12 rounded-lg border border-gray-200 text-[15px] font-semibold text-gray-700 active:bg-gray-50 transition-colors disabled:opacity-50"
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleSubmitAnswer}
              disabled={submittingAnswer || answerText.trim().length === 0}
              className="flex-1 h-12 bg-black text-white rounded-lg text-[15px] font-semibold active:bg-gray-800 transition-colors disabled:opacity-50"
            >
              {submittingAnswer ? "등록 중..." : "답변 등록"}
            </button>
          </div>
        </div>
      </ActionSheet>
    </div>
  );
}
