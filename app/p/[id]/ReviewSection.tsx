"use client";

import { useState, useEffect, useCallback } from "react";

interface Review {
  id: string;
  rating: number;
  content: string | null;
  createdAt: string;
  userName: string;
}

interface ReviewData {
  averageRating: number | null;
  totalCount: number;
  nextCursor: string | null;
}

function StarRating({ rating }: { rating: number }) {
  return (
    <span className="text-[14px] text-yellow-400">
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i}>{i < rating ? "★" : "☆"}</span>
      ))}
    </span>
  );
}

export default function ReviewSection({ productId }: { productId: string }) {
  const [meta, setMeta] = useState<ReviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [allReviews, setAllReviews] = useState<Review[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  const loadReviews = useCallback(async (cursor?: string | null) => {
    try {
      const params = new URLSearchParams({ limit: "5" });
      if (cursor) params.set("cursor", cursor);
      const res = await fetch(`/api/products/${productId}/reviews?${params}`);
      if (!res.ok) return;
      const json = await res.json();
      setMeta({
        averageRating: json.averageRating,
        totalCount: json.totalCount,
        nextCursor: json.nextCursor,
      });
      if (!cursor) {
        setAllReviews(json.reviews || []);
      } else {
        setAllReviews((prev) => [...prev, ...(json.reviews || [])]);
      }
      setNextCursor(json.nextCursor);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  if (loading) return null;
  if (!meta || meta.totalCount === 0) return null;

  return (
    <div className="mt-6 pt-5 border-t border-gray-100">
      {/* Review Header */}
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-[18px] font-semibold text-black">
          리뷰 ({meta.totalCount})
        </h3>
        {meta.averageRating != null && (
          <div className="flex items-center gap-1">
            <span className="text-[16px] text-yellow-400">★</span>
            <span className="text-[16px] font-bold text-black">
              {meta.averageRating.toFixed(1)}
            </span>
          </div>
        )}
      </div>

      {/* Review List */}
      <div className="space-y-4">
        {allReviews.map((review) => (
          <div key={review.id} className="pb-4 border-b border-gray-50 last:border-0">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <StarRating rating={review.rating} />
                <span className="text-[13px] text-gray-500">
                  {review.userName}
                </span>
              </div>
              <span className="text-[12px] text-gray-400">
                {new Date(review.createdAt).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" })}
              </span>
            </div>
            {review.content && (
              <p className="text-[14px] text-gray-700 leading-relaxed mt-1">
                {review.content}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Load More */}
      {nextCursor && (
        <button
          type="button"
          onClick={() => loadReviews(nextCursor)}
          className="w-full mt-4 py-3 text-[14px] font-medium text-gray-600 bg-gray-50 rounded-xl active:bg-gray-100 transition-colors"
        >
          리뷰 더보기
        </button>
      )}
    </div>
  );
}

/**
 * Compact review summary for product detail header area
 */
export function ReviewSummary({ productId }: { productId: string }) {
  const [data, setData] = useState<{ averageRating: number; totalCount: number } | null>(null);

  useEffect(() => {
    fetch(`/api/products/${productId}/reviews?limit=1`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json && json.totalCount > 0) {
          setData({ averageRating: json.averageRating, totalCount: json.totalCount });
        }
      })
      .catch(() => {});
  }, [productId]);

  if (!data) return null;

  return (
    <div className="flex items-center gap-1 mt-1">
      <span className="text-[14px] text-yellow-400">★</span>
      <span className="text-[14px] font-medium text-gray-700">
        {data.averageRating.toFixed(1)}
      </span>
      <span className="text-[13px] text-gray-400">
        ({data.totalCount}개 리뷰)
      </span>
    </div>
  );
}
