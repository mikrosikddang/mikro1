"use client";

import { useState, useRef, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { VariantTree, ColorGroup, SizeRow } from "@/lib/variantTransform";
import { variantsFlatToTree, variantsTreeToFlat } from "@/lib/variantTransform";
import { validateVariantTree, formatValidationErrors } from "@/lib/variantValidation";
import BulkPasteModal from "@/components/BulkPasteModal";
import CategoryPickerSheet from "@/components/CategoryPickerSheet";
import ColorPickerSheet from "@/components/ColorPickerSheet";
import ColorImageManager, { type ColorImageData } from "@/components/ColorImageManager";
import { getCategoryBreadcrumb, validateCategory } from "@/lib/categories";
import { getColorByKey, isLightColor } from "@/lib/colors";
import { resizeImage } from "@/lib/imageResize";

// Browser-compatible UUID generation
function generateId() {
  return crypto.randomUUID();
}

const CATEGORIES = ["아우터", "반팔티", "긴팔티", "니트", "셔츠", "바지", "원피스", "스커트"];
const MAX_MAIN = 10;
const MAX_CONTENT = 20;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

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
  salePriceKrw?: number | null;
  category: string; // DEPRECATED
  categoryMain?: string | null;
  categoryMid?: string | null;
  categorySub?: string | null;
  description: string;
  descriptionJson?: any;
  mainImages: string[];
  contentImages: string[];
  variants: { id?: string; color?: string; sizeLabel: string; stock: number }[];
  colorImages?: { colorKey: string; url: string }[];
};

function urlToSlot(url: string): ImageSlot {
  return { preview: url, status: "done", progress: 100, publicUrl: url };
}

export default function ProductForm({
  initialValues,
  editProductId,
  isActive: initialIsActive,
}: {
  initialValues?: ProductFormInitialValues;
  editProductId?: string;
  isActive?: boolean;
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
  const [salePriceKrw, setSalePriceKrw] = useState(
    initialValues?.salePriceKrw ? initialValues.salePriceKrw.toLocaleString("ko-KR") : "",
  );
  const [category, setCategory] = useState(initialValues?.category ?? ""); // DEPRECATED
  const [categoryMain, setCategoryMain] = useState<string | null>(initialValues?.categoryMain ?? null);
  const [categoryMid, setCategoryMid] = useState<string | null>(initialValues?.categoryMid ?? null);
  const [categorySub, setCategorySub] = useState<string | null>(initialValues?.categorySub ?? null);
  const [categoryPickerOpen, setCategoryPickerOpen] = useState(false);
  const [description, setDescription] = useState(initialValues?.description ?? "");

  // Structured description fields
  const [specMeasurements, setSpecMeasurements] = useState(initialValues?.descriptionJson?.spec?.measurements ?? "");
  const [specModelInfo, setSpecModelInfo] = useState(initialValues?.descriptionJson?.spec?.modelInfo ?? "");
  const [specMaterial, setSpecMaterial] = useState(initialValues?.descriptionJson?.spec?.material ?? "");
  const [specOrigin, setSpecOrigin] = useState(initialValues?.descriptionJson?.spec?.origin ?? "");
  const [specFit, setSpecFit] = useState(initialValues?.descriptionJson?.spec?.fit ?? "");
  const [detailText, setDetailText] = useState(initialValues?.descriptionJson?.detail ?? initialValues?.description ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isActive, setIsActive] = useState(initialIsActive ?? true);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [bulkPasteModal, setBulkPasteModal] = useState<{ groupIndex: number; colorName: string } | null>(null);
  const [stockBulkInput, setStockBulkInput] = useState<Record<number, string>>({});

  // Color images (auto-synced from variantTree)
  const [colorImages, setColorImages] = useState<ColorImageData[]>(() => {
    if (initialValues?.colorImages && initialValues.colorImages.length > 0) {
      // Group flat {colorKey, url}[] into ColorImageData[] ({colorKey, images[]})
      const map = new Map<string, string[]>();
      for (const ci of initialValues.colorImages) {
        if (!map.has(ci.colorKey)) map.set(ci.colorKey, []);
        map.get(ci.colorKey)!.push(ci.url);
      }
      return Array.from(map.entries()).map(([colorKey, images]) => ({ colorKey, images }));
    }
    return [];
  });
  const [colorImageManagerOpen, setColorImageManagerOpen] = useState(false);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [colorPickerTargetGroup, setColorPickerTargetGroup] = useState<number | null>(null);

  // Auto-extract colors from variantTree
  const selectedColors = useMemo(() => {
    const colors = variantTree
      .map((group) => group.color)
      .filter((color) => color !== "FREE" && color !== "");
    return Array.from(new Set(colors)); // deduplicate
  }, [variantTree]);

  // ---------- Color helpers ----------
  function handleColorImageseSave(newColorImages: ColorImageData[]) {
    setColorImages(newColorImages);
    setColorImageManagerOpen(false);
  }

  function openColorPickerForGroup(groupIndex: number) {
    setColorPickerTargetGroup(groupIndex);
    setColorPickerOpen(true);
  }

  function handleColorPickerSelect(colorKey: string) {
    if (colorPickerTargetGroup !== null) {
      updateColorGroupColor(colorPickerTargetGroup, colorKey);
    }
    setColorPickerOpen(false);
    setColorPickerTargetGroup(null);
  }

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

    // Resize image before upload (max 1080×1350, JPEG 80%)
    const resized = await resizeImage(file);
    const uploadContentType = resized instanceof File ? file.type : "image/jpeg";
    const uploadSize = resized.size;

    const presignRes = await fetch("/api/uploads/presign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileName: file.name,
        contentType: uploadContentType,
        fileSize: uploadSize,
      }),
    });
    if (!presignRes.ok) {
      const data = await presignRes.json().catch(() => ({}));
      throw new Error(data.error || "이미지 업로드 준비에 실패했습니다. 다시 시도해주세요.");
    }
    const { uploadUrl, publicUrl } = await presignRes.json();

    setter((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], progress: 30 };
      return copy;
    });

    const putRes = await fetch(uploadUrl, {
      method: "PUT",
      body: resized,
      headers: { "Content-Type": uploadContentType },
    });
    if (!putRes.ok) throw new Error("이미지 업로드에 실패했습니다. 다시 시도해주세요.");

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
        sizes: [{ clientId: generateId(), sizeLabel: "FREE", stock: 0 }],
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
          { clientId: generateId(), sizeLabel: "FREE", stock: 0 },
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

  // Stock quick actions
  const setAllStockToZero = useCallback((groupIndex: number) => {
    setVariantTree((prev) => {
      const copy = [...prev];
      copy[groupIndex] = {
        ...copy[groupIndex],
        sizes: copy[groupIndex].sizes.map((s) => ({ ...s, stock: 0 })),
      };
      return copy;
    });
  }, []);

  const setAllStockToValue = useCallback((groupIndex: number, value: number) => {
    setVariantTree((prev) => {
      const copy = [...prev];
      copy[groupIndex] = {
        ...copy[groupIndex],
        sizes: copy[groupIndex].sizes.map((s) => ({ ...s, stock: value })),
      };
      return copy;
    });
    setStockBulkInput((prev) => ({ ...prev, [groupIndex]: "" }));
  }, []);

  // Bulk paste handler
  const handleBulkPasteApply = useCallback(
    (groupIndex: number, parsedSizes: { sizeLabel: string; stock: number }[]) => {
      setVariantTree((prev) => {
        const copy = [...prev];
        const existingSizes = copy[groupIndex].sizes;
        const sizeMap = new Map(
          existingSizes.map((s) => [s.sizeLabel.toUpperCase(), s])
        );

        // Merge or add sizes
        for (const parsed of parsedSizes) {
          const key = parsed.sizeLabel.toUpperCase();
          if (sizeMap.has(key)) {
            // Update existing
            const existing = sizeMap.get(key)!;
            existing.stock = parsed.stock;
          } else {
            // Add new
            existingSizes.push({
              clientId: generateId(),
              sizeLabel: parsed.sizeLabel,
              stock: parsed.stock,
            });
            sizeMap.set(key, existingSizes[existingSizes.length - 1]);
          }
        }

        copy[groupIndex] = { ...copy[groupIndex], sizes: existingSizes };
        return copy;
      });
      setBulkPasteModal(null);
    },
    []
  );

  // Check for duplicate colors
  const getDuplicateColors = useMemo(() => {
    const seen = new Set<string>();
    const dupes = new Set<number>();
    variantTree.forEach((group, idx) => {
      const normalized = group.color.trim().toUpperCase();
      if (normalized && seen.has(normalized)) {
        dupes.add(idx);
      }
      if (normalized) seen.add(normalized);
    });
    return dupes;
  }, [variantTree]);

  // Check for duplicate sizes within a color group
  const getDuplicateSizes = useMemo(() => {
    const dupesMap = new Map<number, Set<number>>();
    variantTree.forEach((group, groupIdx) => {
      const seen = new Set<string>();
      const dupes = new Set<number>();
      group.sizes.forEach((size, sizeIdx) => {
        const normalized = size.sizeLabel.trim().toUpperCase();
        if (normalized && seen.has(normalized)) {
          dupes.add(sizeIdx);
        }
        if (normalized) seen.add(normalized);
      });
      if (dupes.size > 0) {
        dupesMap.set(groupIdx, dupes);
      }
    });
    return dupesMap;
  }, [variantTree]);

  // ---------- Submit ----------
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    const errs: Record<string, string> = {};

    const hasColorImages = colorImages && colorImages.some(c => c.images.length > 0);
    if (mainImages.length === 0 && !hasColorImages) errs.mainImages = "대표 이미지 또는 색상별 이미지를 1장 이상 올려주세요";
    if (!title.trim()) errs.title = "상품명을 입력해주세요";

    const price = parseInt(priceKrw.replace(/,/g, ""), 10);
    if (isNaN(price) || price < 0) errs.price = "가격을 올바르게 입력해주세요";

    // Validate sale price
    let salePrice: number | null = null;
    if (salePriceKrw.trim()) {
      salePrice = parseInt(salePriceKrw.replace(/,/g, ""), 10);
      if (isNaN(salePrice) || salePrice < 0) {
        errs.salePrice = "할인가를 올바르게 입력해주세요";
      } else if (!isNaN(price) && salePrice >= price) {
        errs.salePrice = "할인가는 정가보다 낮아야 합니다";
      }
    }

    // Validate category (3-depth required)
    if (!validateCategory(categoryMain, categoryMid, categorySub)) {
      errs.category = "카테고리를 선택해주세요";
    }

    // Validate variant tree
    const validationErrors = validateVariantTree(variantTree);
    for (const ve of validationErrors) {
      errs[ve.field] = ve.message;
    }

    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      setError("입력 내용을 확인해주세요");
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

      // Build color images payload (with colorKey)
      const colorImagesPayload = colorImages.map((ci) => ({
        colorKey: ci.colorKey,
        urls: ci.images,
      }));

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
      };

      // Convert tree to flat variants
      const flatVariants = variantsTreeToFlat(variantTree);

      // Create or update product
      const payload = {
        title: title.trim(),
        priceKrw: price,
        salePriceKrw: salePrice,
        category: category || undefined, // DEPRECATED
        categoryMain: categoryMain,
        categoryMid: categoryMid,
        categorySub: categorySub,
        description: description.trim() || undefined,
        descriptionJson,
        mainImages: mainUrls,
        contentImages: contentUrls.length > 0 ? contentUrls : undefined,
        colorImages: colorImagesPayload.length > 0 ? colorImagesPayload : undefined,
        variants: flatVariants,
      };

      const res = editProductId
        ? await fetch(`/api/seller/products/${editProductId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/seller/products", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || (editProductId ? "수정 실패" : "등록 실패"));
      }

      router.push("/seller");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : (editProductId ? "상품 수정에 실패했습니다" : "상품 등록에 실패했습니다"));
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

  function handleSalePriceChange(value: string) {
    const digits = value.replace(/[^0-9]/g, "");
    if (digits === "") {
      setSalePriceKrw("");
      return;
    }
    setSalePriceKrw(Number(digits).toLocaleString("ko-KR"));
  }

  return (
    <form onSubmit={handleSubmit} className="py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[22px] font-bold text-black">
          {editProductId ? "상품 수정" : initialValues ? "상품 복제 등록" : "상품 올리기"}
        </h1>
        {editProductId && (
          <button
            type="button"
            onClick={() => {
              fetch(`/api/seller/products/${editProductId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isActive: !isActive }),
              }).then(() => setIsActive(!isActive));
            }}
            className={`px-3 py-1.5 rounded-lg text-[12px] font-medium ${
              isActive
                ? "bg-black text-white"
                : "bg-gray-200 text-gray-500"
            }`}
          >
            {isActive ? "판매중" : "숨김"}
          </button>
        )}
      </div>

      {/* ===== Main Images ===== */}
      <ImagePickerSection
        label="대표 이미지"
        required
        images={mainImages}
        max={MAX_MAIN}
        inputRef={mainInputRef}
        onPick={(e) => { handleFilePick(e, setMainImages, MAX_MAIN, mainImages); setFieldErrors(prev => { const next = {...prev}; delete next['mainImages']; return next; }); }}
        onRemove={(i) => removeImage(i, setMainImages)}
        onMove={(i, d) => moveImage(i, d, setMainImages)}
        submitting={submitting}
        showMainBadge
      />
      {fieldErrors.mainImages && <p className="-mt-4 mb-4 text-[12px] text-red-500">{fieldErrors.mainImages}</p>}

      {/* ===== Color-Specific Images ===== */}
      {selectedColors.length > 0 && (
        <section className="mb-6">
          <label className="block text-[14px] font-medium text-gray-700 mb-2">
            색상별 이미지 (선택)
          </label>
          <p className="text-[12px] text-gray-500 mb-3">
            아래 옵션에서 선택한 색상별로 다른 이미지를 설정할 수 있습니다. 최대 5장까지 등록 가능합니다.
          </p>

          {/* Selected colors display */}
          <div className="mb-3 flex flex-wrap gap-2">
            {selectedColors.map((colorKey) => {
              const color = getColorByKey(colorKey);
              const colorImageData = colorImages.find((ci) => ci.colorKey === colorKey);
              const imageCount = colorImageData?.images.length || 0;

              return (
                <div
                  key={colorKey}
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg"
                >
                  <div
                    className={`w-4 h-4 rounded-full ${isLightColor(color?.hex || "#ccc") ? "border border-gray-300" : ""}`}
                    style={{ backgroundColor: color?.hex || "#ccc" }}
                  />
                  <span className="text-[13px] font-medium text-gray-900">
                    {color?.labelKo || colorKey}
                  </span>
                  {imageCount > 0 && (
                    <span className="text-[11px] text-gray-500">({imageCount}장)</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Action button */}
          <button
            type="button"
            onClick={() => setColorImageManagerOpen(true)}
            disabled={submitting}
            className="w-full h-10 px-4 rounded-lg bg-black text-white text-[14px] font-medium hover:bg-gray-800 active:bg-gray-700 transition-colors disabled:opacity-50"
          >
            색상별 이미지 설정
          </button>
        </section>
      )}

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
          {variantTree.map((colorGroup, groupIndex) => {
            const hasDuplicateColor = getDuplicateColors.has(groupIndex);
            const duplicateSizes = getDuplicateSizes.get(groupIndex);

            return (
              <div key={colorGroup.clientId} className="p-4 bg-gray-50 rounded-xl space-y-3">
                {/* Color Group Header */}
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-medium text-gray-600">
                    컬러 그룹 {groupIndex + 1}
                  </span>
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
                  <button
                    type="button"
                    onClick={() => { openColorPickerForGroup(groupIndex); setFieldErrors(prev => { const next = {...prev}; delete next[`color-${groupIndex}`]; return next; }); }}
                    disabled={submitting}
                    className={`w-full h-10 px-3 rounded-lg border text-[14px] bg-white hover:bg-gray-50 active:bg-gray-100 transition-colors flex items-center justify-between disabled:opacity-50 ${fieldErrors[`color-${groupIndex}`] ? "border-red-400" : "border-gray-200"}`}
                  >
                    {colorGroup.color ? (
                      <span className="flex items-center gap-2">
                        {(() => {
                          const colorData = getColorByKey(colorGroup.color);
                          if (colorData) {
                            return (
                              <>
                                <span
                                  className={`w-4 h-4 rounded-full ${isLightColor(colorData.hex) ? "border border-gray-300" : ""}`}
                                  style={{ backgroundColor: colorData.hex }}
                                />
                                <span>{colorData.labelKo}</span>
                              </>
                            );
                          }
                          return <span>{colorGroup.color}</span>;
                        })()}
                      </span>
                    ) : (
                      <span className="text-gray-400">색상 선택...</span>
                    )}
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {hasDuplicateColor && (
                    <p className="text-[12px] text-red-500 mt-1">중복된 컬러입니다</p>
                  )}
                  {!hasDuplicateColor && fieldErrors[`color-${groupIndex}`] && (
                    <p className="text-[12px] text-red-500 mt-1">{fieldErrors[`color-${groupIndex}`]}</p>
                  )}
                </div>

                {/* Stock Quick Actions */}
                <div className="flex gap-2 items-center flex-wrap">
                  <button
                    type="button"
                    onClick={() => setAllStockToZero(groupIndex)}
                    className="px-3 py-1.5 text-[12px] bg-white border border-gray-200 rounded-lg hover:bg-gray-100 active:bg-gray-200"
                    disabled={submitting}
                  >
                    전체 재고 0
                  </button>
                  <div className="flex gap-1 items-center">
                    <input
                      type="number"
                      inputMode="numeric"
                      value={stockBulkInput[groupIndex] || ""}
                      onChange={(e) => setStockBulkInput((prev) => ({ ...prev, [groupIndex]: e.target.value }))}
                      placeholder="수량"
                      className="w-16 h-8 px-2 text-[12px] border border-gray-200 rounded-lg text-center focus:outline-none focus:border-black"
                      disabled={submitting}
                      min={0}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const val = parseInt(stockBulkInput[groupIndex] || "0", 10);
                        if (!isNaN(val) && val >= 0) {
                          setAllStockToValue(groupIndex, val);
                        }
                      }}
                      className="px-3 py-1.5 text-[12px] bg-white border border-gray-200 rounded-lg hover:bg-gray-100 active:bg-gray-200"
                      disabled={submitting}
                    >
                      전체 적용
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setBulkPasteModal({
                        groupIndex,
                        colorName: colorGroup.color || "컬러 미지정",
                      })
                    }
                    className="px-3 py-1.5 text-[12px] bg-white border border-gray-200 rounded-lg hover:bg-gray-100 active:bg-gray-200"
                    disabled={submitting}
                  >
                    일괄 입력
                  </button>
                </div>

                {/* Size List */}
                <div className="space-y-2">
                  <label className="block text-[12px] text-gray-600 mb-1">사이즈</label>
                  {colorGroup.sizes.map((size, sizeIndex) => {
                    const hasDuplicateSize = duplicateSizes?.has(sizeIndex);
                    return (
                      <div key={size.clientId}>
                        <div className="flex gap-2 items-center">
                          <input
                            type="text"
                            value={size.sizeLabel}
                            onChange={(e) => { updateSize(groupIndex, sizeIndex, "sizeLabel", e.target.value); setFieldErrors(prev => { const next = {...prev}; delete next[`size-${groupIndex}-${sizeIndex}`]; return next; }); }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                addSizeToGroup(groupIndex);
                              }
                              // Backspace on empty sizeLabel deletes row
                              if (
                                e.key === "Backspace" &&
                                size.sizeLabel === "" &&
                                colorGroup.sizes.length > 1
                              ) {
                                e.preventDefault();
                                removeSizeFromGroup(groupIndex, sizeIndex);
                              }
                            }}
                            placeholder="사이즈명"
                            className={`flex-1 h-10 px-3 rounded-lg border text-[14px] focus:outline-none focus:border-black bg-white ${
                              hasDuplicateSize || fieldErrors[`size-${groupIndex}-${sizeIndex}`] ? "border-red-400" : "border-gray-200"
                            }`}
                            disabled={submitting}
                          />
                          <input
                            type="number"
                            inputMode="numeric"
                            value={size.stock}
                            onChange={(e) => { updateSize(groupIndex, sizeIndex, "stock", Math.max(0, parseInt(e.target.value) || 0)); setFieldErrors(prev => { const next = {...prev}; delete next[`stock-${groupIndex}-${sizeIndex}`]; return next; }); }}
                            placeholder="재고"
                            className={`w-20 h-10 px-3 rounded-lg border text-[14px] text-center focus:outline-none focus:border-black bg-white ${fieldErrors[`stock-${groupIndex}-${sizeIndex}`] ? "border-red-400" : "border-gray-200"}`}
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
                        {hasDuplicateSize && (
                          <p className="text-[11px] text-red-500 mt-0.5 ml-1">중복된 사이즈</p>
                        )}
                        {!hasDuplicateSize && fieldErrors[`size-${groupIndex}-${sizeIndex}`] && (
                          <p className="text-[12px] text-red-500 mt-0.5 ml-1">{fieldErrors[`size-${groupIndex}-${sizeIndex}`]}</p>
                        )}
                        {fieldErrors[`stock-${groupIndex}-${sizeIndex}`] && (
                          <p className="text-[12px] text-red-500 mt-0.5 ml-1">{fieldErrors[`stock-${groupIndex}-${sizeIndex}`]}</p>
                        )}
                      </div>
                    );
                  })}
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
            );
          })}
        </div>

        {/* Add Color Group */}
        <div className="mt-3">
          <button
            type="button"
            onClick={() => {
              addColorGroup();
              // Open ColorPickerSheet for the newly added group (will be last index)
              setColorPickerTargetGroup(variantTree.length);
              setColorPickerOpen(true);
            }}
            className="w-full h-10 text-[14px] text-gray-600 border border-dashed border-gray-300 rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-colors"
            disabled={submitting}
          >
            + 컬러 추가
          </button>
        </div>
      </section>

      {/* Bulk Paste Modal */}
      {bulkPasteModal && (
        <BulkPasteModal
          colorName={bulkPasteModal.colorName}
          onApply={(sizes) => handleBulkPasteApply(bulkPasteModal.groupIndex, sizes)}
          onClose={() => setBulkPasteModal(null)}
        />
      )}

      {/* ===== Title ===== */}
      <section className="mb-5">
        <label htmlFor="title" className="block text-[14px] font-medium text-gray-700 mb-1.5">
          상품명 <span className="text-red-500">*</span>
        </label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => { setTitle(e.target.value); setFieldErrors(prev => { const next = {...prev}; delete next['title']; return next; }); }}
          placeholder="예: 미니멀 오버핏 자켓"
          className={`w-full h-12 px-4 rounded-xl border text-[15px] placeholder:text-gray-400 focus:outline-none focus:border-black transition-colors ${fieldErrors.title ? "border-red-400" : "border-gray-200"}`}
          maxLength={100}
          disabled={submitting}
        />
        {fieldErrors.title && <p className="mt-1 text-[12px] text-red-500">{fieldErrors.title}</p>}
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
            onChange={(e) => { handlePriceChange(e.target.value); setFieldErrors(prev => { const next = {...prev}; delete next['price']; return next; }); }}
            placeholder="0"
            className={`w-full h-12 pl-9 pr-4 rounded-xl border text-[15px] placeholder:text-gray-400 focus:outline-none focus:border-black transition-colors ${fieldErrors.price ? "border-red-400" : "border-gray-200"}`}
            disabled={submitting}
          />
        </div>
        {fieldErrors.price && <p className="mt-1 text-[12px] text-red-500">{fieldErrors.price}</p>}
      </section>

      {/* ===== Sale Price ===== */}
      <section className="mb-5">
        <label htmlFor="salePrice" className="block text-[14px] font-medium text-gray-700 mb-1.5">
          할인가 (원) <span className="text-gray-400">(선택)</span>
        </label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[15px] text-gray-400">₩</span>
          <input
            id="salePrice"
            type="text"
            inputMode="numeric"
            value={salePriceKrw}
            onChange={(e) => { handleSalePriceChange(e.target.value); setFieldErrors(prev => { const next = {...prev}; delete next['salePrice']; return next; }); }}
            placeholder="0"
            className={`w-full h-12 pl-9 pr-4 rounded-xl border text-[15px] placeholder:text-gray-400 focus:outline-none focus:border-black transition-colors ${fieldErrors.salePrice ? "border-red-400" : "border-gray-200"}`}
            disabled={submitting}
          />
        </div>
        {salePriceKrw && priceKrw && (() => {
          const sp = parseInt(salePriceKrw.replace(/,/g, ""), 10);
          const op = parseInt(priceKrw.replace(/,/g, ""), 10);
          if (!isNaN(sp) && !isNaN(op) && sp < op) {
            return (
              <p className="mt-1 text-[12px] text-red-500 font-medium">
                {Math.round((1 - sp / op) * 100)}% 할인
              </p>
            );
          }
          if (!isNaN(sp) && !isNaN(op) && sp >= op) {
            return (
              <p className="mt-1 text-[12px] text-red-500">
                할인가는 정가보다 낮아야 합니다
              </p>
            );
          }
          return null;
        })()}
        {fieldErrors.salePrice && <p className="mt-1 text-[12px] text-red-500">{fieldErrors.salePrice}</p>}
      </section>

      {/* ===== Category (3-Depth) ===== */}
      <section className="mb-5">
        <label className="block text-[14px] font-medium text-gray-700 mb-1.5">
          카테고리 <span className="text-red-500">*</span>
        </label>
        <button
          type="button"
          onClick={() => { setCategoryPickerOpen(true); setFieldErrors(prev => { const next = {...prev}; delete next['category']; return next; }); }}
          disabled={submitting}
          className={`w-full h-12 px-4 rounded-xl border text-[15px] bg-white focus:outline-none focus:border-black transition-colors text-left flex items-center justify-between ${fieldErrors.category ? "border-red-400" : "border-gray-200"}`}
        >
          <span className={categoryMain && categoryMid && categorySub ? "text-gray-900" : "text-gray-400"}>
            {getCategoryBreadcrumb(categoryMain, categoryMid, categorySub)}
          </span>
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {fieldErrors.category && <p className="mt-1 text-[12px] text-red-500">{fieldErrors.category}</p>}
      </section>

      {/* Category Picker Sheet */}
      <CategoryPickerSheet
        open={categoryPickerOpen}
        onClose={() => setCategoryPickerOpen(false)}
        initialMain={categoryMain}
        initialMid={categoryMid}
        initialSub={categorySub}
        onChange={(selected) => {
          setCategoryMain(selected.main);
          setCategoryMid(selected.mid ?? null);
          setCategorySub(selected.sub ?? null);
        }}
        autoCloseOnSub
      />

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

      </section>

      {/* Error message */}
      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 rounded-xl text-[14px] text-red-600">
          {error}
        </div>
      )}

      {/* Action buttons */}
      {editProductId ? (
        <div className="flex gap-3">
          <button
            type="button"
            onClick={async () => {
              if (!confirm("정말로 이 상품을 삭제하시겠습니까?")) return;
              setDeleting(true);
              try {
                const res = await fetch(`/api/seller/products/${editProductId}`, { method: "DELETE" });
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
            }}
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
      ) : (
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
      )}

      {/* Color Picker Sheet */}
      <ColorPickerSheet
        open={colorPickerOpen}
        onClose={() => {
          // 방금 추가한 그룹의 color가 비어있으면 제거
          if (colorPickerTargetGroup !== null) {
            setVariantTree(prev => {
              const target = prev[colorPickerTargetGroup];
              if (target && !target.color.trim()) {
                return prev.filter((_, i) => i !== colorPickerTargetGroup);
              }
              return prev;
            });
          }
          setColorPickerOpen(false);
          setColorPickerTargetGroup(null);
        }}
        onSelectColor={handleColorPickerSelect}
      />

      {/* Color Image Manager */}
      {colorImageManagerOpen && (
        <ColorImageManager
          colors={selectedColors}
          initialColorImages={colorImages}
          onSave={handleColorImageseSave}
          onCancel={() => setColorImageManagerOpen(false)}
        />
      )}
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
  const listRef = useRef<HTMLDivElement>(null);
  const dragIdxRef = useRef<number | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [imgDragIndex, setImgDragIndex] = useState<number | null>(null);

  const startDrag = (index: number, pointerX: number, pointerY: number) => {
    if (!listRef.current) return;
    const allChildren = Array.from(listRef.current.children);
    const offset = images.length < max ? 1 : 0;
    const el = allChildren[offset + index] as HTMLElement | undefined;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const origLeft = rect.left;
    const origTop = rect.top;
    const startX = pointerX;
    const startY = pointerY;

    // Switch to fixed position so element follows pointer
    el.style.position = "fixed";
    el.style.left = `${origLeft}px`;
    el.style.top = `${origTop}px`;
    el.style.width = `${rect.width}px`;
    el.style.height = `${rect.height}px`;
    el.style.zIndex = "50";
    el.style.pointerEvents = "none";

    dragIdxRef.current = index;
    setImgDragIndex(index);

    const handleMove = (ev: PointerEvent) => {
      if (dragIdxRef.current === null || !listRef.current) return;

      // Move element with pointer
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      el.style.left = `${origLeft + dx}px`;
      el.style.top = `${origTop + dy}px`;

      // Calculate swap target
      const currentIdx = dragIdxRef.current;
      const thumbChildren = Array.from(listRef.current.children).slice(
        images.length < max ? 1 : 0
      );

      for (let i = 0; i < thumbChildren.length; i++) {
        if (i === currentIdx) continue;
        const childRect = thumbChildren[i].getBoundingClientRect();
        const midX = childRect.left + childRect.width / 2;

        if (
          (currentIdx < i && ev.clientX > midX) ||
          (currentIdx > i && ev.clientX < midX)
        ) {
          // Swap and update fixed position origin for new index
          onMove(currentIdx, (i - currentIdx) as -1 | 1);
          dragIdxRef.current = i;
          setImgDragIndex(i);
          break;
        }
      }
    };

    const handleUp = () => {
      // Restore styles
      el.style.position = "";
      el.style.left = "";
      el.style.top = "";
      el.style.width = "";
      el.style.height = "";
      el.style.zIndex = "";
      el.style.pointerEvents = "";

      dragIdxRef.current = null;
      setImgDragIndex(null);
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
  };

  const handlePointerDown = (e: React.PointerEvent, index: number) => {
    if (submitting || images.length <= 1) return;
    const startX = e.clientX;
    const startY = e.clientY;

    // Long-press: 300ms threshold
    longPressTimerRef.current = setTimeout(() => {
      longPressTimerRef.current = null;
      startDrag(index, startX, startY);
    }, 300);

    // Cancel long-press if pointer moves too much (allows normal scroll)
    const cancelOnMove = (ev: PointerEvent) => {
      const dx = Math.abs(ev.clientX - startX);
      const dy = Math.abs(ev.clientY - startY);
      if (dx > 8 || dy > 8) {
        if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
        }
        window.removeEventListener("pointermove", cancelOnMove);
      }
    };

    const cancelOnUp = () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
      window.removeEventListener("pointermove", cancelOnMove);
      window.removeEventListener("pointerup", cancelOnUp);
    };

    window.addEventListener("pointermove", cancelOnMove);
    window.addEventListener("pointerup", cancelOnUp);
  };

  return (
    <section className="mb-6">
      <label className="block text-[14px] font-medium text-gray-700 mb-2">
        {label} ({images.length}/{max})
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>

      <div ref={listRef} className="flex gap-2 overflow-x-auto pb-2">
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
        {images.map((slot, i) => {
          const isDragging = imgDragIndex === i;

          return (
            <div
              key={i}
              className={`shrink-0 w-20 h-20 relative rounded-xl bg-gray-100 transition-all ${
                isDragging
                  ? "overflow-visible"
                  : "overflow-hidden"
              }`}
              style={{ touchAction: imgDragIndex !== null ? "none" : "auto" }}
              onPointerDown={(e) => handlePointerDown(e, i)}
            >
              {isDragging ? (
                /* Placeholder at original position + floating content via fixed style */
                <>
                  <div className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-300 bg-gray-100" />
                  <div className="opacity-90 shadow-lg scale-105 rounded-xl overflow-hidden">
                    <img src={slot.preview} alt="" className="w-full h-full object-cover" />
                    {showMainBadge && i === 0 && (
                      <span className="absolute top-0.5 left-0.5 bg-black text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                        대표
                      </span>
                    )}
                  </div>
                </>
              ) : (
                <>
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
                </>
              )}
            </div>
          );
        })}
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
