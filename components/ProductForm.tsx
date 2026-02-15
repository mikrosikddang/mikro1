"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import type { VariantTree, ColorGroup, SizeRow } from "@/lib/variantTransform";
import { variantsFlatToTree, variantsTreeToFlat } from "@/lib/variantTransform";
import { validateVariantTree, formatValidationErrors } from "@/lib/variantValidation";

// Browser-compatible UUID generation
function generateId() {
  return crypto.randomUUID();
}

const CATEGORIES = ["아우터", "반팔티", "긴팔티", "니트", "셔츠", "바지", "원피스", "스커트"];
const MAX_MAIN = 10;
const MAX_CONTENT = 20;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

const PRESET_COLORS = ["BLACK", "CHARCOAL", "GRAY", "BEIGE", "WHITE"];

// Default: Single FREE color with single FREE size
const DEFAULT_TREE: VariantTree = [
  {
    clientId: generateId(),
    color: "FREE",
    sizes: [
      {
        clientId: generateId(),
        sizeLabel: "FREE",
        stock: 0,
      },
    ],
  },
];

type ImageSlot = {
  file?: File;
  preview: string;
  status: "pending" | "uploading" | "done" | "error";
  progress: number;
  publicUrl?: string;
};

export type ProductFormInitialValues = {
  title: string;
  priceKrw: number;
  category: string;
  description: string;
  descriptionJson?: any;
  mainImages: string[];
  contentImages: string[];
  variants: { id?: string; color?: string; sizeLabel: string; stock: number }[];
};

function urlToSlot(url: string): ImageSlot {
  return { preview: url, status: "done", progress: 100, publicUrl: url };
}

export default function ProductForm({
  initialValues,
}: {
  initialValues?: ProductFormInitialValues;
}) {
  const router = useRouter();
  const mainInputRef = useRef<HTMLInputElement>(null);
  const contentInputRef = useRef<HTMLInputElement>(null);

  const [mainImages, setMainImages] = useState<ImageSlot[]>(
    initialValues?.mainImages.map(urlToSlot) ?? [],
  );
  const [contentImages, setContentImages] = useState<ImageSlot[]>(
    initialValues?.contentImages.map(urlToSlot) ?? [],
  );

  // NEW: Tree-based variant state
  const [variantTree, setVariantTree] = useState<VariantTree>(() => {
    if (initialValues?.variants && initialValues.variants.length > 0) {
      return variantsFlatToTree(
        initialValues.variants.map((v) => ({
          id: v.id,
          color: v.color || "FREE",
          sizeLabel: v.sizeLabel,
          stock: v.stock,
        }))
      );
    }
    return DEFAULT_TREE;
  });

  const [title, setTitle] = useState(initialValues?.title ?? "");
  const [priceKrw, setPriceKrw] = useState(
    initialValues?.priceKrw ? initialValues.priceKrw.toLocaleString("ko-KR") : "",
  );
  const [category, setCategory] = useState(initialValues?.category ?? "");
  const [description, setDescription] = useState(initialValues?.description ?? "");

  // Structured description fields
  const [specMeasurements, setSpecMeasurements] = useState(initialValues?.descriptionJson?.spec?.measurements ?? "");
  const [specModelInfo, setSpecModelInfo] = useState(initialValues?.descriptionJson?.spec?.modelInfo ?? "");
  const [specMaterial, setSpecMaterial] = useState(initialValues?.descriptionJson?.spec?.material ?? "");
  const [specOrigin, setSpecOrigin] = useState(initialValues?.descriptionJson?.spec?.origin ?? "");
  const [specFit, setSpecFit] = useState(initialValues?.descriptionJson?.spec?.fit ?? "");
  const [detailText, setDetailText] = useState(initialValues?.descriptionJson?.detail ?? initialValues?.description ?? "");
  const [csCourier, setCsCourier] = useState(initialValues?.descriptionJson?.csShipping?.courier ?? "");
  const [csPhone, setCsPhone] = useState(initialValues?.descriptionJson?.csShipping?.csPhone ?? "");
  const [csEmail, setCsEmail] = useState(initialValues?.descriptionJson?.csShipping?.csEmail ?? "");
  const [csReturnAddress, setCsReturnAddress] = useState(initialValues?.descriptionJson?.csShipping?.returnAddress ?? "");
  const [csNote, setCsNote] = useState(initialValues?.descriptionJson?.csShipping?.note ?? "");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    const file = slot.file!;
    setter((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], status: "uploading", progress: 10 };
      return copy;
    });

    const presignRes = await fetch("/api/uploads/presign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileName: file.name,
        contentType: file.type,
        fileSize: file.size,
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
      body: file,
      headers: { "Content-Type": file.type },
    });
    if (!putRes.ok) throw new Error("S3 upload failed");

    setter((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], status: "done", progress: 100, publicUrl };
      return copy;
    });

    return publicUrl;
  }

  // ---------- Variant Tree Helpers ----------
  function addColorGroup() {
    setVariantTree((prev) => [
      ...prev,
      {
        clientId: generateId(),
        color: "",
        sizes: [{ clientId: generateId(), sizeLabel: "", stock: 0 }],
      },
    ]);
  }

  function removeColorGroup(groupIndex: number) {
    if (variantTree.length <= 1) {
      setError("최소 1개의 컬러 그룹이 필요합니다");
      return;
    }
    setVariantTree((prev) => prev.filter((_, i) => i !== groupIndex));
  }

  function updateColorGroupColor(groupIndex: number, color: string) {
    setVariantTree((prev) => {
      const copy = [...prev];
      copy[groupIndex] = { ...copy[groupIndex], color };
      return copy;
    });
  }

  function addSizeToGroup(groupIndex: number) {
    setVariantTree((prev) => {
      const copy = [...prev];
      copy[groupIndex] = {
        ...copy[groupIndex],
        sizes: [
          ...copy[groupIndex].sizes,
          { clientId: generateId(), sizeLabel: "", stock: 0 },
        ],
      };
      return copy;
    });
  }

  function removeSizeFromGroup(groupIndex: number, sizeIndex: number) {
    const group = variantTree[groupIndex];
    if (group.sizes.length <= 1) {
      setError("최소 1개의 사이즈가 필요합니다");
      return;
    }
    setVariantTree((prev) => {
      const copy = [...prev];
      copy[groupIndex] = {
        ...copy[groupIndex],
        sizes: copy[groupIndex].sizes.filter((_, i) => i !== sizeIndex),
      };
      return copy;
    });
  }

  function updateSize(groupIndex: number, sizeIndex: number, field: keyof SizeRow, value: string | number) {
    setVariantTree((prev) => {
      const copy = [...prev];
      const sizes = [...copy[groupIndex].sizes];
      sizes[sizeIndex] = { ...sizes[sizeIndex], [field]: value };
      copy[groupIndex] = { ...copy[groupIndex], sizes };
      return copy;
    });
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

    // Validate variant tree
    const validationErrors = validateVariantTree(variantTree);
    if (validationErrors.length > 0) {
      setError(formatValidationErrors(validationErrors));
      return;
    }

    setSubmitting(true);

    try {
      // Upload main images
      const mainUrls: string[] = [];
      for (let i = 0; i < mainImages.length; i++) {
        const slot = mainImages[i];
        if (slot.publicUrl) {
          mainUrls.push(slot.publicUrl);
        } else {
          const url = await uploadImage(slot, i, setMainImages);
          mainUrls.push(url);
        }
      }

      // Upload content images
      const contentUrls: string[] = [];
      for (let i = 0; i < contentImages.length; i++) {
        const slot = contentImages[i];
        if (slot.publicUrl) {
          contentUrls.push(slot.publicUrl);
        } else {
          const url = await uploadImage(slot, i, setContentImages);
          contentUrls.push(url);
        }
      }

      // Build structured description
      const descriptionJson = {
        v: 1,
        spec: {
          measurements: specMeasurements.trim() || undefined,
          modelInfo: specModelInfo.trim() || undefined,
          material: specMaterial.trim() || undefined,
          origin: specOrigin.trim() || undefined,
          fit: specFit.trim() || undefined,
        },
        detail: detailText.trim() || undefined,
        csShipping: {
          courier: csCourier.trim() || undefined,
          csPhone: csPhone.trim() || undefined,
          csEmail: csEmail.trim() || undefined,
          returnAddress: csReturnAddress.trim() || undefined,
          note: csNote.trim() || undefined,
        },
      };

      // Convert tree to flat variants
      const flatVariants = variantsTreeToFlat(variantTree);

      // Create product
      const res = await fetch("/api/seller/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          priceKrw: price,
          category: category || undefined,
          description: description.trim() || undefined,
          descriptionJson,
          mainImages: mainUrls,
          contentImages: contentUrls.length > 0 ? contentUrls : undefined,
          variants: flatVariants,
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
      <h1 className="text-[22px] font-bold text-black mb-6">
        {initialValues ? "상품 복제 등록" : "상품 올리기"}
      </h1>

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

      {/* ===== Variants (Color Groups) ===== */}
      <section className="mb-6">
        <label className="block text-[14px] font-medium text-gray-700 mb-2">
          옵션 (컬러/사이즈/재고) <span className="text-red-500">*</span>
        </label>

        <div className="space-y-4">
          {variantTree.map((colorGroup, groupIndex) => (
            <div key={colorGroup.clientId} className="p-4 bg-gray-50 rounded-xl space-y-3">
              {/* Color Group Header */}
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-medium text-gray-600">컬러 그룹 {groupIndex + 1}</span>
                {variantTree.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeColorGroup(groupIndex)}
                    className="text-[12px] text-red-500 hover:text-red-600"
                    disabled={submitting}
                  >
                    그룹 삭제
                  </button>
                )}
              </div>

              {/* Color Selection */}
              <div>
                <label className="block text-[12px] text-gray-600 mb-1.5">컬러</label>
                <div className="flex gap-2 flex-wrap mb-2">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => updateColorGroupColor(groupIndex, color)}
                      className={`px-3 py-1.5 text-[12px] rounded-lg border transition-colors ${
                        colorGroup.color === color
                          ? "bg-black text-white border-black"
                          : "bg-white text-gray-700 border-gray-200 hover:border-gray-400"
                      }`}
                      disabled={submitting}
                    >
                      {color}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      if (colorGroup.color && !PRESET_COLORS.includes(colorGroup.color)) return;
                      const customColor = prompt("컬러를 입력하세요 (예: NAVY, BROWN)");
                      if (customColor) {
                        updateColorGroupColor(groupIndex, customColor.trim().toUpperCase());
                      }
                    }}
                    className={`px-3 py-1.5 text-[12px] rounded-lg border transition-colors ${
                      colorGroup.color && !PRESET_COLORS.includes(colorGroup.color)
                        ? "bg-black text-white border-black"
                        : "bg-white text-gray-700 border-gray-200 hover:border-gray-400"
                    }`}
                    disabled={submitting}
                  >
                    {colorGroup.color && !PRESET_COLORS.includes(colorGroup.color) ? colorGroup.color : "그외컬러"}
                  </button>
                </div>
              </div>

              {/* Size List */}
              <div className="space-y-2">
                <label className="block text-[12px] text-gray-600 mb-1">사이즈</label>
                {colorGroup.sizes.map((size, sizeIndex) => (
                  <div key={size.clientId} className="flex gap-2 items-center">
                    <input
                      type="text"
                      value={size.sizeLabel}
                      onChange={(e) => updateSize(groupIndex, sizeIndex, "sizeLabel", e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addSizeToGroup(groupIndex);
                        }
                      }}
                      placeholder="사이즈명"
                      className="flex-1 h-10 px-3 rounded-lg border border-gray-200 text-[14px] focus:outline-none focus:border-black bg-white"
                      disabled={submitting}
                    />
                    <input
                      type="number"
                      inputMode="numeric"
                      value={size.stock}
                      onChange={(e) => updateSize(groupIndex, sizeIndex, "stock", Math.max(0, parseInt(e.target.value) || 0))}
                      placeholder="재고"
                      className="w-20 h-10 px-3 rounded-lg border border-gray-200 text-[14px] text-center focus:outline-none focus:border-black bg-white"
                      min={0}
                      disabled={submitting}
                    />
                    {colorGroup.sizes.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeSizeFromGroup(groupIndex, sizeIndex)}
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
                <button
                  type="button"
                  onClick={() => addSizeToGroup(groupIndex)}
                  className="w-full h-9 text-[13px] text-gray-600 border border-dashed border-gray-300 rounded-lg hover:bg-white"
                  disabled={submitting}
                >
                  + 사이즈 추가
                </button>
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={addColorGroup}
          className="mt-3 w-full h-11 text-[14px] text-gray-700 font-medium border border-dashed border-gray-300 rounded-xl hover:bg-gray-50"
          disabled={submitting}
        >
          + 컬러 추가
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

      {/* ===== Structured Description ===== */}
      <section className="mb-8 space-y-6">
        <h3 className="text-[16px] font-bold text-gray-900">상품 설명</h3>

        {/* Section 1: Spec */}
        <div className="p-4 bg-gray-50 rounded-xl space-y-3">
          <h4 className="text-[14px] font-medium text-gray-700 mb-2">사양 정보</h4>
          <div className="grid grid-cols-1 gap-3">
            <input
              type="text"
              placeholder="사이즈 (예: 총장 70cm, 가슴 50cm)"
              value={specMeasurements}
              onChange={(e) => setSpecMeasurements(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-[14px] focus:outline-none focus:border-black transition-colors"
              disabled={submitting}
            />
            <input
              type="text"
              placeholder="모델 정보 (예: 키 175cm, 60kg 착용)"
              value={specModelInfo}
              onChange={(e) => setSpecModelInfo(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-[14px] focus:outline-none focus:border-black transition-colors"
              disabled={submitting}
            />
            <input
              type="text"
              placeholder="소재 (예: 면 100%)"
              value={specMaterial}
              onChange={(e) => setSpecMaterial(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-[14px] focus:outline-none focus:border-black transition-colors"
              disabled={submitting}
            />
            <input
              type="text"
              placeholder="원산지 (예: 한국)"
              value={specOrigin}
              onChange={(e) => setSpecOrigin(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-[14px] focus:outline-none focus:border-black transition-colors"
              disabled={submitting}
            />
            <input
              type="text"
              placeholder="핏 (예: 오버핏, 레귤러핏)"
              value={specFit}
              onChange={(e) => setSpecFit(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-[14px] focus:outline-none focus:border-black transition-colors"
              disabled={submitting}
            />
          </div>
        </div>

        {/* Section 2: Detail */}
        <div className="space-y-2">
          <label className="block text-[14px] font-medium text-gray-700">상세 설명</label>
          <textarea
            value={detailText}
            onChange={(e) => setDetailText(e.target.value)}
            placeholder="색상, 스타일, 코디 팁 등을 자유롭게 적어주세요"
            rows={5}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-[15px] placeholder:text-gray-400 focus:outline-none focus:border-black transition-colors resize-none"
            disabled={submitting}
          />
        </div>

        {/* Section 3: CS & Shipping */}
        <div className="p-4 bg-blue-50 rounded-xl space-y-3">
          <h4 className="text-[14px] font-medium text-gray-700 mb-2">고객센터 & 배송 정보</h4>
          <div className="grid grid-cols-1 gap-3">
            <input
              type="text"
              placeholder="택배사 (예: CJ대한통운)"
              value={csCourier}
              onChange={(e) => setCsCourier(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-[14px] focus:outline-none focus:border-black transition-colors"
              disabled={submitting}
            />
            <input
              type="text"
              placeholder="고객센터 전화 (예: 010-1234-5678)"
              value={csPhone}
              onChange={(e) => setCsPhone(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-[14px] focus:outline-none focus:border-black transition-colors"
              disabled={submitting}
            />
            <input
              type="text"
              placeholder="이메일 (예: shop@example.com)"
              value={csEmail}
              onChange={(e) => setCsEmail(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-[14px] focus:outline-none focus:border-black transition-colors"
              disabled={submitting}
            />
            <input
              type="text"
              placeholder="반품 주소 (예: 서울시 중구 을지로 123)"
              value={csReturnAddress}
              onChange={(e) => setCsReturnAddress(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-[14px] focus:outline-none focus:border-black transition-colors"
              disabled={submitting}
            />
            <textarea
              placeholder="배송 안내 (예: 평일 오후 3시 이전 주문 시 당일 발송)"
              value={csNote}
              onChange={(e) => setCsNote(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-[14px] placeholder:text-gray-400 focus:outline-none focus:border-black transition-colors resize-none"
              disabled={submitting}
            />
          </div>
        </div>
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

/* ================================================================== */
/*  Image Picker Section (shared between main and content)             */
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
        {/* Add button */}
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

        {/* Thumbnails */}
        {images.map((slot, i) => (
          <div key={i} className="shrink-0 w-20 h-20 relative rounded-xl overflow-hidden bg-gray-100">
            <img src={slot.preview} alt="" className="w-full h-full object-cover" />

            {/* Main badge */}
            {showMainBadge && i === 0 && (
              <span className="absolute top-0.5 left-0.5 bg-black text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                대표
              </span>
            )}

            {/* Upload overlay */}
            {slot.status === "uploading" && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <div className="w-8 h-8 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              </div>
            )}

            {/* Done check */}
            {slot.status === "done" && (
              <div className="absolute bottom-0.5 right-0.5 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}

            {/* Controls */}
            {!submitting && (
              <div className="absolute top-0.5 right-0.5 flex gap-0.5">
                {/* Move left */}
                {i > 0 && (
                  <button
                    type="button"
                    onClick={() => onMove(i, -1)}
                    className="w-5 h-5 bg-black/60 rounded-full flex items-center justify-center text-white text-[10px]"
                  >
                    ←
                  </button>
                )}
                {/* Move right */}
                {i < images.length - 1 && (
                  <button
                    type="button"
                    onClick={() => onMove(i, 1)}
                    className="w-5 h-5 bg-black/60 rounded-full flex items-center justify-center text-white text-[10px]"
                  >
                    →
                  </button>
                )}
                {/* Remove */}
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
