"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

const CATEGORIES = ["아우터", "반팔티", "긴팔티", "니트", "셔츠", "바지", "원피스", "스커트"];
const MAX_IMAGES = 5;

type ImageSlot = {
  file: File;
  preview: string;
  status: "pending" | "uploading" | "done" | "error";
  progress: number;
  publicUrl?: string;
};

export default function NewProductPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [images, setImages] = useState<ImageSlot[]>([]);
  const [title, setTitle] = useState("");
  const [priceKrw, setPriceKrw] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ---------- Image picker ----------
  function handleFilePick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;

    const remaining = MAX_IMAGES - images.length;
    const picked = Array.from(files).slice(0, remaining);

    const newSlots: ImageSlot[] = picked.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      status: "pending",
      progress: 0,
    }));

    setImages((prev) => [...prev, ...newSlots]);
    // Reset input so same file can be re-selected
    e.target.value = "";
  }

  function removeImage(index: number) {
    setImages((prev) => {
      const copy = [...prev];
      URL.revokeObjectURL(copy[index].preview);
      copy.splice(index, 1);
      return copy;
    });
  }

  // ---------- S3 upload ----------
  async function uploadImage(slot: ImageSlot, index: number): Promise<string> {
    // Update status
    setImages((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], status: "uploading", progress: 10 };
      return copy;
    });

    // 1. Get presigned URL
    const presignRes = await fetch("/api/uploads/presign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileName: slot.file.name,
        contentType: slot.file.type,
      }),
    });

    if (!presignRes.ok) throw new Error("Presign failed");
    const { uploadUrl, publicUrl } = await presignRes.json();

    setImages((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], progress: 30 };
      return copy;
    });

    // 2. PUT to S3
    const putRes = await fetch(uploadUrl, {
      method: "PUT",
      body: slot.file,
      headers: { "Content-Type": slot.file.type },
    });

    if (!putRes.ok) throw new Error("S3 upload failed");

    setImages((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], status: "done", progress: 100, publicUrl };
      return copy;
    });

    return publicUrl;
  }

  // ---------- Submit ----------
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Validation
    if (images.length === 0) {
      setError("이미지를 1장 이상 올려주세요");
      return;
    }
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
      // Upload all images
      const imageUrls: string[] = [];
      for (let i = 0; i < images.length; i++) {
        const slot = images[i];
        if (slot.publicUrl) {
          imageUrls.push(slot.publicUrl);
        } else {
          const url = await uploadImage(slot, i);
          imageUrls.push(url);
        }
      }

      // Create product
      const res = await fetch("/api/seller/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          priceKrw: price,
          category: category || undefined,
          description: description.trim() || undefined,
          imageUrls,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "등록 실패");
      }

      router.push("/seller");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "상품 등록에 실패했습니다");
      setSubmitting(false);
    }
  }

  // ---------- Price formatting ----------
  function handlePriceChange(value: string) {
    const digits = value.replace(/[^0-9]/g, "");
    if (digits === "") {
      setPriceKrw("");
      return;
    }
    setPriceKrw(Number(digits).toLocaleString("ko-KR"));
  }

  return (
    <form onSubmit={handleSubmit} className="py-6">
      <h1 className="text-[22px] font-bold text-black mb-6">상품 올리기</h1>

      {/* Image picker */}
      <section className="mb-6">
        <label className="block text-[14px] font-medium text-gray-700 mb-2">
          상품 이미지 ({images.length}/{MAX_IMAGES})
        </label>

        <div className="flex gap-2 overflow-x-auto pb-2">
          {/* Add button */}
          {images.length < MAX_IMAGES && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="shrink-0 w-20 h-20 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 active:bg-gray-50 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="text-[11px] mt-0.5">추가</span>
            </button>
          )}

          {/* Thumbnails */}
          {images.map((slot, i) => (
            <div key={i} className="shrink-0 w-20 h-20 relative rounded-xl overflow-hidden bg-gray-100">
              <img
                src={slot.preview}
                alt=""
                className="w-full h-full object-cover"
              />

              {/* Upload progress overlay */}
              {slot.status === "uploading" && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <div className="w-10 h-10 rounded-full border-3 border-white/30 border-t-white animate-spin" />
                </div>
              )}

              {/* Done check */}
              {slot.status === "done" && (
                <div className="absolute bottom-1 right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}

              {/* Error */}
              {slot.status === "error" && (
                <div className="absolute inset-0 bg-red-500/40 flex items-center justify-center">
                  <span className="text-white text-[11px] font-bold">실패</span>
                </div>
              )}

              {/* Remove button */}
              {!submitting && (
                <button
                  type="button"
                  onClick={() => removeImage(i)}
                  className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center"
                >
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFilePick}
          className="hidden"
        />
      </section>

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

      {/* Category */}
      <section className="mb-5">
        <label htmlFor="category" className="block text-[14px] font-medium text-gray-700 mb-1.5">
          카테고리
        </label>
        <select
          id="category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full h-12 px-4 rounded-xl border border-gray-200 text-[15px] text-gray-900 bg-white focus:outline-none focus:border-black transition-colors appearance-none"
          disabled={submitting}
        >
          <option value="">선택안함</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
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

      {/* Submit button */}
      <button
        type="submit"
        disabled={submitting}
        className="w-full h-[52px] bg-black text-white rounded-xl text-[16px] font-bold active:bg-gray-800 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
      >
        {submitting ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
            등록 중...
          </span>
        ) : (
          "등록"
        )}
      </button>
    </form>
  );
}
