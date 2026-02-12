"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";

const CATEGORIES = ["아우터", "반팔티", "긴팔티", "니트", "셔츠", "바지", "원피스", "스커트"];
const MAX_MAIN = 10;
const MAX_CONTENT = 20;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

type ImageSlot = {
  file?: File;
  preview: string;
  status: "done" | "pending" | "uploading" | "error";
  progress: number;
  publicUrl?: string;
};

type VariantRow = {
  sizeLabel: string;
  stock: number;
};

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const mainInputRef = useRef<HTMLInputElement>(null);
  const contentInputRef = useRef<HTMLInputElement>(null);

  const [mainImages, setMainImages] = useState<ImageSlot[]>([]);
  const [contentImages, setContentImages] = useState<ImageSlot[]>([]);
  const [variants, setVariants] = useState<VariantRow[]>([]);
  const [title, setTitle] = useState("");
  const [priceKrw, setPriceKrw] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load current product data
  useEffect(() => {
    fetch(`/api/seller/products/${params.id}`)
      .then((res) => res.json())
      .then((data) => {
        setTitle(data.title ?? "");
        setPriceKrw(data.priceKrw ? Number(data.priceKrw).toLocaleString("ko-KR") : "");
        setCategory(data.category ?? "");
        setDescription(data.description ?? "");
        setIsActive(data.isActive ?? true);

        // Load existing main images
        if (data.mainImages) {
          setMainImages(
            data.mainImages.map((img: { url: string }) => ({
              preview: img.url,
              status: "done" as const,
              progress: 100,
              publicUrl: img.url,
            })),
          );
        }

        // Load existing content images
        if (data.contentImages) {
          setContentImages(
            data.contentImages.map((img: { url: string }) => ({
              preview: img.url,
              status: "done" as const,
              progress: 100,
              publicUrl: img.url,
            })),
          );
        }

        // Load existing variants
        if (data.variants && data.variants.length > 0) {
          setVariants(
            data.variants.map((v: { sizeLabel: string; stock: number }) => ({
              sizeLabel: v.sizeLabel,
              stock: v.stock,
            })),
          );
        } else {
          setVariants([{ sizeLabel: "FREE", stock: 0 }]);
        }

        setLoading(false);
      })
      .catch(() => {
        setError("상품 정보를 불러올 수 없습니다");
        setLoading(false);
      });
  }, [params.id]);

  // ---------- Image helpers ----------
  function handleFilePick(
    e: React.ChangeEvent<HTMLInputElement>,
    setter: React.Dispatch<React.SetStateAction<ImageSlot[]>>,
    max: number,
    current: ImageSlot[],
  ) {
    const files = e.target.files;
    if (!files) return;
    const remaining = max - current.length;
    const picked = Array.from(files).slice(0, remaining);

    // Client-side validation
    for (const file of picked) {
      if (!ALLOWED_TYPES.has(file.type)) {
        setError(`허용되지 않는 파일 형식: ${file.name} (jpg, png, webp, gif만 가능)`);
        e.target.value = "";
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        setError(`파일이 너무 큽니다: ${file.name} (최대 10MB)`);
        e.target.value = "";
        return;
      }
    }

    const newSlots: ImageSlot[] = picked.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      status: "pending",
      progress: 0,
    }));
    setter((prev) => [...prev, ...newSlots]);
    e.target.value = "";
  }

  function removeImage(
    index: number,
    setter: React.Dispatch<React.SetStateAction<ImageSlot[]>>,
  ) {
    setter((prev) => {
      const copy = [...prev];
      if (copy[index].file) URL.revokeObjectURL(copy[index].preview);
      copy.splice(index, 1);
      return copy;
    });
  }

  function moveImage(
    index: number,
    direction: -1 | 1,
    setter: React.Dispatch<React.SetStateAction<ImageSlot[]>>,
  ) {
    setter((prev) => {
      const copy = [...prev];
      const target = index + direction;
      if (target < 0 || target >= copy.length) return copy;
      [copy[index], copy[target]] = [copy[target], copy[index]];
      return copy;
    });
  }

  async function uploadImage(
    slot: ImageSlot,
    index: number,
    setter: React.Dispatch<React.SetStateAction<ImageSlot[]>>,
  ): Promise<string> {
    if (slot.publicUrl) return slot.publicUrl;
    if (!slot.file) throw new Error("No file");

    setter((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], status: "uploading", progress: 10 };
      return copy;
    });

    const presignRes = await fetch("/api/uploads/presign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileName: slot.file.name,
        contentType: slot.file.type,
        fileSize: slot.file.size,
      }),
    });
    if (!presignRes.ok) {
      const data = await presignRes.json().catch(() => ({}));
      throw new Error(data.error || "Presign failed");
    }
    const { uploadUrl, publicUrl } = await presignRes.json();

    setter((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], progress: 30 };
      return copy;
    });

    const putRes = await fetch(uploadUrl, {
      method: "PUT",
      body: slot.file,
      headers: { "Content-Type": slot.file.type },
    });
    if (!putRes.ok) throw new Error("S3 upload failed");

    setter((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], status: "done", progress: 100, publicUrl };
      return copy;
    });

    return publicUrl;
  }

  // ---------- Variant helpers ----------
  function updateVariant(index: number, field: keyof VariantRow, value: string | number) {
    setVariants((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  }

  function addVariant() {
    setVariants((prev) => [...prev, { sizeLabel: "", stock: 0 }]);
  }

  function removeVariant(index: number) {
    setVariants((prev) => prev.filter((_, i) => i !== index));
  }

  function handlePriceChange(value: string) {
    const digits = value.replace(/[^0-9]/g, "");
    if (digits === "") {
      setPriceKrw("");
      return;
    }
    setPriceKrw(Number(digits).toLocaleString("ko-KR"));
  }

  // ---------- Submit ----------
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (mainImages.length === 0) {
      setError("대표 이미지를 1장 이상 올려주세요");
      return;
    }
    if (!title.trim()) {
      setError("상품명을 입력해주세요");
      return;
    }
    const price = parseInt(priceKrw.replace(/,/g, ""), 10);
    if (isNaN(price) || price < 0) {
      setError("가격을 올바르게 입력해주세요");
      return;
    }
    if (variants.length === 0) {
      setError("사이즈/재고를 1개 이상 입력해주세요");
      return;
    }
    for (const v of variants) {
      if (!v.sizeLabel.trim()) {
        setError("사이즈명을 입력해주세요");
        return;
      }
    }

    setSubmitting(true);

    try {
      // Upload new images
      const mainUrls: string[] = [];
      for (let i = 0; i < mainImages.length; i++) {
        const url = await uploadImage(mainImages[i], i, setMainImages);
        mainUrls.push(url);
      }

      const contentUrls: string[] = [];
      for (let i = 0; i < contentImages.length; i++) {
        const url = await uploadImage(contentImages[i], i, setContentImages);
        contentUrls.push(url);
      }

      const res = await fetch(`/api/seller/products/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          priceKrw: price,
          category: category || undefined,
          description: description.trim() || undefined,
          mainImages: mainUrls,
          contentImages: contentUrls,
          variants: variants.map((v) => ({
            sizeLabel: v.sizeLabel.trim(),
            stock: v.stock,
          })),
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

  // ---------- Delete ----------
  async function handleDelete() {
    if (!confirm("정말로 이 상품을 삭제하시겠습니까?")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/seller/products/${params.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "삭제 실패");
      }
      router.push("/seller");
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "상품 삭제에 실패했습니다");
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="py-20 text-center text-gray-400 text-[14px]">불러오는 중...</div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[22px] font-bold text-black">상품 수정</h1>
        <button
          type="button"
          onClick={() => {
            // Toggle isActive via separate PATCH
            fetch(`/api/seller/products/${params.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ isActive: !isActive }),
            }).then(() => {
              setIsActive(!isActive);
            });
          }}
          className={`px-3 py-1.5 rounded-lg text-[12px] font-medium ${
            isActive
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-gray-100 text-gray-500 border border-gray-200"
          }`}
        >
          {isActive ? "판매중 ●" : "숨김 ●"}
        </button>
      </div>

      {/* ===== Main Images ===== */}
      <ImagePickerSection
        label="대표 이미지"
        required
        images={mainImages}
        max={MAX_MAIN}
        inputRef={mainInputRef}
        onPick={(e) => handleFilePick(e, setMainImages, MAX_MAIN, mainImages)}
        onRemove={(i) => removeImage(i, setMainImages)}
        onMove={(i, d) => moveImage(i, d, setMainImages)}
        submitting={submitting}
        showMainBadge
      />

      {/* ===== Content Images ===== */}
      <ImagePickerSection
        label="상세 이미지"
        images={contentImages}
        max={MAX_CONTENT}
        inputRef={contentInputRef}
        onPick={(e) => handleFilePick(e, setContentImages, MAX_CONTENT, contentImages)}
        onRemove={(i) => removeImage(i, setContentImages)}
        onMove={(i, d) => moveImage(i, d, setContentImages)}
        submitting={submitting}
      />

      {/* ===== Variants ===== */}
      <section className="mb-6">
        <label className="block text-[14px] font-medium text-gray-700 mb-2">
          사이즈/재고 <span className="text-red-500">*</span>
        </label>
        <div className="space-y-2">
          {variants.map((v, i) => (
            <div key={i} className="flex gap-2 items-center">
              <input
                type="text"
                value={v.sizeLabel}
                onChange={(e) => updateVariant(i, "sizeLabel", e.target.value)}
                placeholder="사이즈"
                className="flex-1 h-10 px-3 rounded-lg border border-gray-200 text-[14px] focus:outline-none focus:border-black"
                disabled={submitting}
              />
              <input
                type="number"
                inputMode="numeric"
                value={v.stock}
                onChange={(e) => updateVariant(i, "stock", Math.max(0, parseInt(e.target.value) || 0))}
                placeholder="재고"
                className="w-20 h-10 px-3 rounded-lg border border-gray-200 text-[14px] text-center focus:outline-none focus:border-black"
                min={0}
                disabled={submitting}
              />
              {variants.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeVariant(i)}
                  className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-500"
                  disabled={submitting}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addVariant}
          className="mt-2 px-4 py-2 text-[13px] text-gray-600 border border-dashed border-gray-300 rounded-lg hover:bg-gray-50"
          disabled={submitting}
        >
          + 사이즈 추가
        </button>
      </section>

      {/* ===== Title ===== */}
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

      {/* ===== Price ===== */}
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

      {/* ===== Category ===== */}
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

      {/* ===== Description ===== */}
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
          onClick={handleDelete}
          disabled={submitting || deleting}
          className="h-[52px] px-5 rounded-xl bg-red-500 text-white text-[16px] font-bold active:bg-red-600 transition-colors disabled:opacity-50"
        >
          {deleting ? "삭제 중..." : "삭제"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          disabled={submitting || deleting}
          className="flex-1 h-[52px] rounded-xl border border-gray-200 text-[16px] font-bold text-gray-700 active:bg-gray-50 transition-colors disabled:opacity-50"
        >
          취소
        </button>
        <button
          type="submit"
          disabled={submitting || deleting}
          className="flex-1 h-[52px] bg-black text-white rounded-xl text-[16px] font-bold active:bg-gray-800 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {submitting ? "저장 중..." : "저장"}
        </button>
      </div>
    </form>
  );
}

/* ================================================================== */
/*  Image Picker Section                                               */
/* ================================================================== */

function ImagePickerSection({
  label,
  required,
  images,
  max,
  inputRef,
  onPick,
  onRemove,
  onMove,
  submitting,
  showMainBadge,
}: {
  label: string;
  required?: boolean;
  images: ImageSlot[];
  max: number;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onPick: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: (i: number) => void;
  onMove: (i: number, d: -1 | 1) => void;
  submitting: boolean;
  showMainBadge?: boolean;
}) {
  return (
    <section className="mb-6">
      <label className="block text-[14px] font-medium text-gray-700 mb-2">
        {label} ({images.length}/{max})
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {images.length < max && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="shrink-0 w-20 h-20 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 active:bg-gray-50 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="text-[11px] mt-0.5">추가</span>
          </button>
        )}

        {images.map((slot, i) => (
          <div key={i} className="shrink-0 w-20 h-20 relative rounded-xl overflow-hidden bg-gray-100">
            <img src={slot.preview} alt="" className="w-full h-full object-cover" />

            {showMainBadge && i === 0 && (
              <span className="absolute top-0.5 left-0.5 bg-black text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                대표
              </span>
            )}

            {slot.status === "uploading" && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <div className="w-8 h-8 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              </div>
            )}

            {!submitting && (
              <div className="absolute top-0.5 right-0.5 flex gap-0.5">
                {i > 0 && (
                  <button
                    type="button"
                    onClick={() => onMove(i, -1)}
                    className="w-5 h-5 bg-black/60 rounded-full flex items-center justify-center text-white text-[10px]"
                  >
                    ←
                  </button>
                )}
                {i < images.length - 1 && (
                  <button
                    type="button"
                    onClick={() => onMove(i, 1)}
                    className="w-5 h-5 bg-black/60 rounded-full flex items-center justify-center text-white text-[10px]"
                  >
                    →
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onRemove(i)}
                  className="w-5 h-5 bg-black/60 rounded-full flex items-center justify-center"
                >
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        onChange={onPick}
        className="hidden"
      />
    </section>
  );
}
