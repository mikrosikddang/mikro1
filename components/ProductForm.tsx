"use client";

import { useState, useRef, useMemo, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { VariantTree, ColorGroup, SizeRow } from "@/lib/variantTransform";
import type { DescriptionBlock } from "@/lib/descriptionSchema";
import { variantsFlatToTree, variantsTreeToFlat } from "@/lib/variantTransform";
import { validateVariantTree, formatValidationErrors } from "@/lib/variantValidation";
import BulkPasteModal from "@/components/BulkPasteModal";
import CategoryPickerSheet from "@/components/CategoryPickerSheet";
import ColorPickerSheet from "@/components/ColorPickerSheet";
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
        priceAddonKrw: 0,
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
  colorKey?: string | null;
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
  mainImages: { url: string; colorKey?: string | null }[];
  contentImages: string[];
  variants: { id?: string; color?: string; sizeLabel: string; stock: number; priceAddonKrw?: number }[];
};

function urlToSlot(url: string, colorKey?: string | null): ImageSlot {
  return { preview: url, status: "done", progress: 100, publicUrl: url, colorKey: colorKey ?? null };
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
    initialValues?.mainImages.map((img) => urlToSlot(img.url, img.colorKey)) ?? [],
  );
  const [contentImages, setContentImages] = useState<ImageSlot[]>(
    initialValues?.contentImages.map((url) => urlToSlot(url)) ?? [],
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
          priceAddonKrw: v.priceAddonKrw ?? 0,
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

  // V2 block editor state
  const [descBlocks, setDescBlocks] = useState<(DescriptionBlock & { _id: string })[]>(() => {
    if (initialValues?.descriptionJson?.v === 2 && Array.isArray(initialValues.descriptionJson.blocks)) {
      return initialValues.descriptionJson.blocks.map((b: DescriptionBlock) => ({ ...b, _id: generateId() }));
    }
    // Migrate from V1: content images + detail text → blocks
    const blocks: (DescriptionBlock & { _id: string })[] = [];
    if (initialValues?.descriptionJson?.detail || initialValues?.description) {
      blocks.push({ _id: generateId(), type: "text", content: initialValues?.descriptionJson?.detail || initialValues?.description || "" });
    }
    if (initialValues?.contentImages?.length) {
      for (const url of initialValues.contentImages) {
        blocks.push({ _id: generateId(), type: "image", url });
      }
    }
    return blocks;
  });
  const blockImageInputRef = useRef<HTMLInputElement>(null);
  const [uploadingBlockIndex, setUploadingBlockIndex] = useState<number | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isActive, setIsActive] = useState(initialIsActive ?? true);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [bulkPasteModal, setBulkPasteModal] = useState<{ groupIndex: number; colorName: string } | null>(null);
  const [stockBulkInput, setStockBulkInput] = useState<Record<number, string>>({});

  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [colorPickerTargetGroup, setColorPickerTargetGroup] = useState<number | null>(null);
  const [draftRestored, setDraftRestored] = useState(false);

  // ---- Auto-save (localStorage draft) ----
  const draftKey = editProductId ? `product-draft-${editProductId}` : "product-draft-new";

  // Restore draft on mount
  useEffect(() => {
    if (initialValues && editProductId) return; // editing existing product — skip draft
    try {
      const raw = localStorage.getItem(draftKey);
      if (!raw) return;
      const draft = JSON.parse(raw);
      if (!draft || !draft._ts) return;
      // Only restore if draft is less than 24h old
      if (Date.now() - draft._ts > 24 * 60 * 60 * 1000) {
        localStorage.removeItem(draftKey);
        return;
      }
      setDraftRestored(true);
    } catch { /* ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function restoreDraft() {
    try {
      const raw = localStorage.getItem(draftKey);
      if (!raw) return;
      const d = JSON.parse(raw);
      if (d.title) setTitle(d.title);
      if (d.priceKrw) setPriceKrw(d.priceKrw);
      if (d.salePriceKrw) setSalePriceKrw(d.salePriceKrw);
      if (d.categoryMain) setCategoryMain(d.categoryMain);
      if (d.categoryMid) setCategoryMid(d.categoryMid);
      if (d.categorySub) setCategorySub(d.categorySub);
      if (d.detailText) setDetailText(d.detailText);
      if (d.specMeasurements) setSpecMeasurements(d.specMeasurements);
      if (d.specModelInfo) setSpecModelInfo(d.specModelInfo);
      if (d.specMaterial) setSpecMaterial(d.specMaterial);
      if (d.specOrigin) setSpecOrigin(d.specOrigin);
      if (d.specFit) setSpecFit(d.specFit);
      if (d.variantTree) setVariantTree(d.variantTree);
      if (d.descBlocks?.length) {
        setDescBlocks(d.descBlocks.map((b: DescriptionBlock) => ({ ...b, _id: generateId() })));
      }
      if (d.mainImageUrls?.length) {
        setMainImages(d.mainImageUrls.map((img: any) => urlToSlot(img.url, img.colorKey)));
      }
      if (d.contentImageUrls?.length) {
        setContentImages(d.contentImageUrls.map((url: string) => urlToSlot(url)));
      }
    } catch { /* ignore */ }
    setDraftRestored(false);
  }

  function dismissDraft() {
    localStorage.removeItem(draftKey);
    setDraftRestored(false);
  }

  // Save draft (debounced 2s)
  const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    draftTimerRef.current = setTimeout(() => {
      try {
        const doneMainImages = mainImages.filter((s) => s.status === "done" && s.publicUrl);
        const doneContentImages = contentImages.filter((s) => s.status === "done" && s.publicUrl);
        const draft = {
          _ts: Date.now(),
          title,
          priceKrw,
          salePriceKrw,
          categoryMain,
          categoryMid,
          categorySub,
          detailText,
          specMeasurements,
          specModelInfo,
          specMaterial,
          specOrigin,
          specFit,
          variantTree,
          descBlocks: descBlocks.map(({ _id, ...rest }) => rest),
          mainImageUrls: doneMainImages.map((s) => ({ url: s.publicUrl, colorKey: s.colorKey })),
          contentImageUrls: doneContentImages.map((s) => s.publicUrl),
        };
        localStorage.setItem(draftKey, JSON.stringify(draft));
      } catch { /* quota exceeded, etc. */ }
    }, 2000);
    return () => { if (draftTimerRef.current) clearTimeout(draftTimerRef.current); };
  }, [title, priceKrw, salePriceKrw, categoryMain, categoryMid, categorySub, detailText, specMeasurements, specModelInfo, specMaterial, specOrigin, specFit, variantTree, mainImages, contentImages, descBlocks, draftKey]);

  // Clear draft on successful submit
  function clearDraft() {
    try { localStorage.removeItem(draftKey); } catch {}
  }

  // ---- Block editor helpers ----
  function addTextBlock() {
    setDescBlocks((prev) => [...prev, { _id: generateId(), type: "text", content: "" }]);
  }

  function removeBlock(index: number) {
    setDescBlocks((prev) => prev.filter((_, i) => i !== index));
  }

  function moveBlock(index: number, direction: -1 | 1) {
    setDescBlocks((prev) => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function updateBlockText(index: number, content: string) {
    setDescBlocks((prev) => {
      const next = [...prev];
      if (next[index]?.type === "text") {
        next[index] = { ...next[index], content } as any;
      }
      return next;
    });
  }

  function updateBlockCaption(index: number, caption: string) {
    setDescBlocks((prev) => {
      const next = [...prev];
      if (next[index]?.type === "image") {
        next[index] = { ...next[index], caption } as any;
      }
      return next;
    });
  }

  async function handleBlockImagePick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;
    e.target.value = "";

    for (const file of Array.from(files)) {
      if (!ALLOWED_TYPES.has(file.type)) continue;
      try {
        const resized = await resizeImage(file);
        const uploadContentType = resized instanceof File ? resized.type : "image/jpeg";
        const uploadSize = resized.size;
        // Get presigned URL (API expects fileName, not filename)
        const presignRes = await fetch("/api/uploads/presign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: file.name,
            contentType: uploadContentType,
            fileSize: uploadSize,
          }),
        });
        if (!presignRes.ok) continue;
        const { uploadUrl, publicUrl } = await presignRes.json();

        // Upload to S3
        const uploadRes = await fetch(uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": uploadContentType },
          body: resized,
        });
        if (!uploadRes.ok) continue;

        setDescBlocks((prev) => [
          ...prev,
          { _id: generateId(), type: "image", url: publicUrl },
        ]);
      } catch {
        // skip failed uploads
      }
    }
  }

  // Auto-extract colors from variantTree + existing image tags
  const selectedColors = useMemo(() => {
    const fromVariants = variantTree
      .map((group) => group.color)
      .filter((color) => color !== "FREE" && color !== "");
    const fromImages = mainImages
      .map((s) => s.colorKey)
      .filter(Boolean) as string[];
    return Array.from(new Set([...fromVariants, ...fromImages]));
  }, [variantTree, mainImages]);

  // ---------- Color helpers ----------
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

  // ---------- Color tag on main images ----------
  function handleColorTag(index: number, colorKey: string | null) {
    setMainImages((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], colorKey };
      return next;
    });
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
        sizes: [{ clientId: generateId(), sizeLabel: "FREE", stock: 0, priceAddonKrw: 0 }],
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
          { clientId: generateId(), sizeLabel: "FREE", stock: 0, priceAddonKrw: 0 },
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
              priceAddonKrw: 0,
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

    if (mainImages.length === 0) errs.mainImages = "대표 이미지를 1장 이상 올려주세요";
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

      // Build V2 blocks from block editor (images already uploaded)
      const cleanBlocks: DescriptionBlock[] = descBlocks
        .map((b) => {
          if (b.type === "text") return { type: "text" as const, content: b.content.trim() };
          if (b.type === "image") return { type: "image" as const, url: b.url, ...(b.caption ? { caption: b.caption } : {}) };
          return null;
        })
        .filter((b): b is DescriptionBlock => b !== null && (b.type !== "text" || b.content !== ""));

      // Build content images from blocks for backward compat
      const contentUrls = cleanBlocks.filter((b) => b.type === "image").map((b) => (b as any).url as string);

      // Build structured description (V2)
      const descriptionJson = {
        v: 2 as const,
        spec: {
          measurements: specMeasurements.trim() || undefined,
          modelInfo: specModelInfo.trim() || undefined,
          material: specMaterial.trim() || undefined,
          origin: specOrigin.trim() || undefined,
          fit: specFit.trim() || undefined,
        },
        blocks: cleanBlocks,
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
        mainImages: mainImages.map((slot, i) => ({
          url: slot.publicUrl || mainUrls[i],
          colorKey: slot.colorKey || null,
        })),
        contentImages: contentUrls.length > 0 ? contentUrls : undefined,
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

      clearDraft();
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
    <form onSubmit={handleSubmit} className="py-6" style={{ overscrollBehaviorX: "none" }}>
      {/* Draft restore banner */}
      {draftRestored && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm text-amber-800">작성 중이던 내용이 있습니다. 이어서 작성하시겠습니까?</p>
          <div className="flex gap-2">
            <button type="button" onClick={restoreDraft} className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700">
              복구하기
            </button>
            <button type="button" onClick={dismissDraft} className="rounded-lg border border-amber-300 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100">
              무시
            </button>
          </div>
        </div>
      )}

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

      {/* 이미지 컬러 지정 */}
      {mainImages.length >= 2 && (
        <section className="-mt-2 mb-6">
          <h3 className="text-[14px] font-medium text-gray-700 mb-2">
            이미지 컬러 지정 <span className="text-gray-400 font-normal">(선택)</span>
          </h3>
          {selectedColors.length > 0 ? (
            <>
              <p className="text-[12px] text-gray-500 mb-3">
                각 이미지가 어떤 컬러 상품인지 지정할 수 있습니다. 지정하지 않으면 모든 컬러에 공통으로 표시됩니다.
              </p>
              <div className="space-y-2">
                {mainImages.map((slot, i) => (
                  <div key={i} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-200 shrink-0">
                      <img src={slot.preview || slot.publicUrl} alt="" className="w-full h-full object-cover" />
                    </div>
                    <span className="text-[13px] text-gray-500 shrink-0">{i + 1}번</span>
                    <select
                      value={slot.colorKey || ""}
                      onChange={(e) => handleColorTag(i, e.target.value || null)}
                      className="flex-1 h-9 px-3 rounded-lg border border-gray-200 text-[13px] bg-white"
                    >
                      <option value="">공통 (모든 컬러)</option>
                      {selectedColors.map((ck) => {
                        const color = getColorByKey(ck);
                        return <option key={ck} value={ck}>{color?.labelKo || ck}</option>;
                      })}
                    </select>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-[12px] text-gray-400">
              아래 바리언트에서 컬러를 추가하면 이미지별 컬러를 지정할 수 있습니다.
            </p>
          )}
        </section>
      )}

      {/* ===== Content Images ===== */}
      {/* ===== Description Block Editor (V2) ===== */}
      <section className="mb-6">
        <label className="block text-[14px] font-medium text-gray-700 mb-2">
          상세 설명 블록
          <span className="text-[12px] text-gray-400 ml-2 font-normal">사진과 글을 자유롭게 배치하세요</span>
        </label>

        <div className="space-y-3">
          {descBlocks.map((block, i) => (
            <div key={block._id} className="relative group rounded-xl border border-gray-200 bg-white overflow-hidden">
              {/* Block controls */}
              <div className="absolute top-2 right-2 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {i > 0 && (
                  <button type="button" onClick={() => moveBlock(i, -1)} className="w-7 h-7 rounded-lg bg-white/90 border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 text-xs" disabled={submitting}>
                    &#8593;
                  </button>
                )}
                {i < descBlocks.length - 1 && (
                  <button type="button" onClick={() => moveBlock(i, 1)} className="w-7 h-7 rounded-lg bg-white/90 border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 text-xs" disabled={submitting}>
                    &#8595;
                  </button>
                )}
                <button type="button" onClick={() => removeBlock(i)} className="w-7 h-7 rounded-lg bg-white/90 border border-gray-200 flex items-center justify-center text-red-400 hover:bg-red-50 text-xs" disabled={submitting}>
                  &#10005;
                </button>
              </div>
              <div className="absolute top-2 left-2 z-10">
                <span className="text-[11px] text-gray-400 bg-white/80 px-1.5 py-0.5 rounded">
                  {block.type === "text" ? "글" : "사진"} {i + 1}
                </span>
              </div>

              {block.type === "text" ? (
                <textarea
                  value={block.content}
                  onChange={(e) => updateBlockText(i, e.target.value)}
                  placeholder="설명을 입력하세요"
                  rows={4}
                  className="w-full px-4 pt-8 pb-3 text-[14px] placeholder:text-gray-400 focus:outline-none resize-none border-none"
                  disabled={submitting}
                />
              ) : (
                <div className="pt-8 pb-3 px-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={block.url} alt={block.caption || `상세 이미지 ${i + 1}`} className="w-full rounded-lg object-contain max-h-[400px]" />
                  <input
                    type="text"
                    value={block.caption || ""}
                    onChange={(e) => updateBlockCaption(i, e.target.value)}
                    placeholder="이미지 설명 (선택)"
                    className="w-full mt-2 px-3 py-1.5 text-[13px] border border-gray-100 rounded-lg focus:outline-none focus:border-gray-300 placeholder:text-gray-300"
                    disabled={submitting}
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Add block buttons */}
        <div className="flex gap-2 mt-3">
          <button
            type="button"
            onClick={addTextBlock}
            className="flex-1 py-2.5 rounded-xl border-2 border-dashed border-gray-300 text-[13px] text-gray-500 hover:bg-gray-50 transition-colors"
            disabled={submitting || descBlocks.length >= MAX_CONTENT}
          >
            + 글 추가
          </button>
          <button
            type="button"
            onClick={() => blockImageInputRef.current?.click()}
            className="flex-1 py-2.5 rounded-xl border-2 border-dashed border-gray-300 text-[13px] text-gray-500 hover:bg-gray-50 transition-colors"
            disabled={submitting || descBlocks.length >= MAX_CONTENT}
          >
            + 사진 추가
          </button>
          <input
            ref={blockImageInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={handleBlockImagePick}
            multiple
          />
        </div>
      </section>

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
                          <input
                            type="number"
                            inputMode="numeric"
                            value={size.priceAddonKrw || ""}
                            onChange={(e) => { updateSize(groupIndex, sizeIndex, "priceAddonKrw", Math.max(0, parseInt(e.target.value) || 0)); setFieldErrors(prev => { const next = {...prev}; delete next[`addon-${groupIndex}-${sizeIndex}`]; return next; }); }}
                            placeholder="추가금"
                            className={`w-24 h-10 px-3 rounded-lg border text-[14px] text-center focus:outline-none focus:border-black bg-white ${fieldErrors[`addon-${groupIndex}-${sizeIndex}`] ? "border-red-400" : "border-gray-200"}`}
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
                        {fieldErrors[`addon-${groupIndex}-${sizeIndex}`] && (
                          <p className="text-[12px] text-red-500 mt-0.5 ml-1">{fieldErrors[`addon-${groupIndex}-${sizeIndex}`]}</p>
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
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[15px] text-gray-400">원</span>
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
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[15px] text-gray-400">원</span>
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

        {/* Section 2: Detail — now handled by block editor above */}

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

      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      el.style.left = `${origLeft + dx}px`;
      el.style.top = `${origTop + dy}px`;

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
          onMove(currentIdx, (i - currentIdx) as -1 | 1);
          dragIdxRef.current = i;
          setImgDragIndex(i);
          break;
        }
      }
    };

    const handleUp = () => {
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

    longPressTimerRef.current = setTimeout(() => {
      longPressTimerRef.current = null;
      startDrag(index, startX, startY);
    }, 300);

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

      <div ref={listRef} className="flex gap-2 overflow-x-auto pb-2" style={{ touchAction: "pan-y", overscrollBehaviorX: "none", WebkitOverflowScrolling: "touch" }}>
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
          const colorInfo = slot.colorKey ? getColorByKey(slot.colorKey) : null;

          return (
            <div
              key={i}
              className={`shrink-0 w-20 h-20 relative rounded-xl bg-gray-100 transition-all ${
                isDragging ? "overflow-visible" : "overflow-hidden"
              }`}
              style={{ touchAction: imgDragIndex !== null ? "none" : "auto" }}
              onPointerDown={(e) => handlePointerDown(e, i)}
            >
              {isDragging ? (
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

                  {/* Color dot overlay */}
                  {colorInfo && (
                    <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex items-center gap-0.5">
                      <span
                        className={`w-3 h-3 rounded-full border border-white shadow-sm ${isLightColor(colorInfo.hex) ? "border-gray-300" : ""}`}
                        style={{ backgroundColor: colorInfo.hex }}
                      />
                    </div>
                  )}

                  {/* Done check */}
                  {slot.status === "done" && !colorInfo && (
                    <div className="absolute bottom-0.5 right-0.5 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                      <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}

                  {/* Upload overlay */}
                  {slot.status === "uploading" && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <div className="w-8 h-8 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    </div>
                  )}

                  {/* Controls */}
                  {!submitting && (
                    <div className="absolute top-0.5 right-0.5 flex gap-0.5">
                      {i > 0 && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); onMove(i, -1); }}
                          className="w-5 h-5 bg-black/60 rounded-full flex items-center justify-center text-white text-[10px]"
                        >
                          ←
                        </button>
                      )}
                      {i < images.length - 1 && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); onMove(i, 1); }}
                          className="w-5 h-5 bg-black/60 rounded-full flex items-center justify-center text-white text-[10px]"
                        >
                          →
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onRemove(i); }}
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
