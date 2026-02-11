"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();

  const [title, setTitle] = useState("");
  const [priceKrw, setPriceKrw] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load current product data
  useEffect(() => {
    fetch(`/api/seller/products/${params.id}`)
      .then((res) => res.json())
      .then((data) => {
        setTitle(data.title ?? "");
        setPriceKrw(data.priceKrw ? Number(data.priceKrw).toLocaleString("ko-KR") : "");
        setDescription(data.description ?? "");
        setLoading(false);
      })
      .catch(() => {
        setError("상품 정보를 불러올 수 없습니다");
        setLoading(false);
      });
  }, [params.id]);

  function handlePriceChange(value: string) {
    const digits = value.replace(/[^0-9]/g, "");
    if (digits === "") {
      setPriceKrw("");
      return;
    }
    setPriceKrw(Number(digits).toLocaleString("ko-KR"));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("상품명을 입력해주세요");
      return;
    }
    const price = parseInt(priceKrw.replace(/,/g, ""), 10);
    if (!price || price < 1) {
      setError("가격을 올바르게 입력해주세요");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch(`/api/seller/products/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          priceKrw: price,
          description: description.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "수정 실패");
      }

      router.push("/seller");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "상품 수정에 실패했습니다");
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="py-20 text-center text-gray-400 text-[14px]">불러오는 중...</div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="py-6">
      <h1 className="text-[22px] font-bold text-black mb-6">상품 수정</h1>

      {/* Title */}
      <section className="mb-5">
        <label htmlFor="title" className="block text-[14px] font-medium text-gray-700 mb-1.5">
          상품명 <span className="text-red-500">*</span>
        </label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="예: 미니멀 오버핏 자켓"
          className="w-full h-12 px-4 rounded-xl border border-gray-200 text-[15px] placeholder:text-gray-400 focus:outline-none focus:border-black transition-colors"
          maxLength={100}
          disabled={submitting}
        />
      </section>

      {/* Price */}
      <section className="mb-5">
        <label htmlFor="price" className="block text-[14px] font-medium text-gray-700 mb-1.5">
          가격 (원) <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[15px] text-gray-400">₩</span>
          <input
            id="price"
            type="text"
            inputMode="numeric"
            value={priceKrw}
            onChange={(e) => handlePriceChange(e.target.value)}
            placeholder="0"
            className="w-full h-12 pl-9 pr-4 rounded-xl border border-gray-200 text-[15px] placeholder:text-gray-400 focus:outline-none focus:border-black transition-colors"
            disabled={submitting}
          />
        </div>
      </section>

      {/* Description */}
      <section className="mb-8">
        <label htmlFor="desc" className="block text-[14px] font-medium text-gray-700 mb-1.5">
          상품 설명
        </label>
        <textarea
          id="desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="색상, 사이즈, 소재 등을 자유롭게 적어주세요"
          rows={4}
          className="w-full px-4 py-3 rounded-xl border border-gray-200 text-[15px] placeholder:text-gray-400 focus:outline-none focus:border-black transition-colors resize-none"
          disabled={submitting}
        />
      </section>

      {/* Error message */}
      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 rounded-xl text-[14px] text-red-600">
          {error}
        </div>
      )}

      {/* Buttons */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          disabled={submitting}
          className="flex-1 h-[52px] rounded-xl border border-gray-200 text-[16px] font-bold text-gray-700 active:bg-gray-50 transition-colors disabled:opacity-50"
        >
          취소
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="flex-1 h-[52px] bg-black text-white rounded-xl text-[16px] font-bold active:bg-gray-800 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {submitting ? "저장 중..." : "저장"}
        </button>
      </div>
    </form>
  );
}
