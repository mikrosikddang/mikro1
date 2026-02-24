"use client";

import { useState, useRef, useEffect } from "react";
import { getColorByKey } from "@/lib/colors";
import { normalizeColorKey } from "@/lib/colors";

const MAX_IMAGES_PER_COLOR = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

type ImageSlot = {
  file?: File;
  preview: string;
  status: "pending" | "uploading" | "done" | "error";
  progress: number;
  publicUrl?: string;
};

export type ColorImageData = {
  colorKey: string;
  images: string[];
};

type ColorImageManagerProps = {
  colors: string[]; // 색상 key 배열 (예: ["블랙", "퍼플", "연베이지"])
  initialColorImages?: ColorImageData[];
  onSave: (colorImages: ColorImageData[]) => void;
  onCancel: () => void;
};

export default function ColorImageManager({
  colors,
  initialColorImages = [],
  onSave,
  onCancel,
}: ColorImageManagerProps) {
  const [selectedColorKey, setSelectedColorKey] = useState<string>(
    colors[0] || ""
  );

  // Map: colorKey -> ImageSlot[]
  const [colorImagesMap, setColorImagesMap] = useState<Map<string, ImageSlot[]>>(
    () => {
      const map = new Map<string, ImageSlot[]>();

      // Initialize with initial data
      initialColorImages.forEach((item) => {
        const slots = item.images.map((url) => ({
          preview: url,
          status: "done" as const,
          progress: 100,
          publicUrl: url,
        }));
        map.set(item.colorKey, slots);
      });

      // Ensure all colors have empty array if not present
      colors.forEach((color) => {
        if (!map.has(color)) {
          map.set(color, []);
        }
      });

      return map;
    }
  );

  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentImages = colorImagesMap.get(selectedColorKey) || [];

  // 이미지 업로드 함수 (ProductForm의 uploadImage와 동일)
  async function uploadImage(
    slot: ImageSlot,
    colorKey: string,
    index: number
  ): Promise<string> {
    const file = slot.file!;

    // Update status to uploading
    setColorImagesMap((prev) => {
      const newMap = new Map(prev);
      const slots = [...(newMap.get(colorKey) || [])];
      slots[index] = { ...slots[index], status: "uploading", progress: 10 };
      newMap.set(colorKey, slots);
      return newMap;
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

    // Update progress
    setColorImagesMap((prev) => {
      const newMap = new Map(prev);
      const slots = [...(newMap.get(colorKey) || [])];
      slots[index] = { ...slots[index], progress: 30 };
      newMap.set(colorKey, slots);
      return newMap;
    });

    const putRes = await fetch(uploadUrl, {
      method: "PUT",
      body: file,
      headers: { "Content-Type": file.type },
    });

    if (!putRes.ok) throw new Error("S3 upload failed");

    // Update to done
    setColorImagesMap((prev) => {
      const newMap = new Map(prev);
      const slots = [...(newMap.get(colorKey) || [])];
      slots[index] = { ...slots[index], status: "done", progress: 100, publicUrl };
      newMap.set(colorKey, slots);
      return newMap;
    });

    return publicUrl;
  }

  // 파일 선택 핸들러
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const currentCount = currentImages.length;
    const remainingSlots = MAX_IMAGES_PER_COLOR - currentCount;

    if (remainingSlots <= 0) {
      alert(`색상당 최대 ${MAX_IMAGES_PER_COLOR}장까지 업로드 가능합니다.`);
      return;
    }

    const filesToAdd = files.slice(0, remainingSlots);

    // Validate
    for (const file of filesToAdd) {
      if (!ALLOWED_TYPES.has(file.type)) {
        alert(`허용되지 않은 파일 형식: ${file.name}`);
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        alert(`파일 크기 초과 (최대 10MB): ${file.name}`);
        return;
      }
    }

    // Create slots
    const newSlots: ImageSlot[] = filesToAdd.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      status: "pending",
      progress: 0,
    }));

    // Add to map
    setColorImagesMap((prev) => {
      const newMap = new Map(prev);
      const existing = newMap.get(selectedColorKey) || [];
      newMap.set(selectedColorKey, [...existing, ...newSlots]);
      return newMap;
    });

    // Upload all
    const updatedSlots = [...currentImages, ...newSlots];
    const startIndex = currentImages.length;

    for (let i = 0; i < newSlots.length; i++) {
      try {
        await uploadImage(newSlots[i], selectedColorKey, startIndex + i);
      } catch (error) {
        console.error("Upload failed:", error);
        // Mark as error
        setColorImagesMap((prev) => {
          const newMap = new Map(prev);
          const slots = [...(newMap.get(selectedColorKey) || [])];
          slots[startIndex + i] = { ...slots[startIndex + i], status: "error" };
          newMap.set(selectedColorKey, slots);
          return newMap;
        });
      }
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // 이미지 삭제
  const handleRemoveImage = (index: number) => {
    setColorImagesMap((prev) => {
      const newMap = new Map(prev);
      const slots = [...(newMap.get(selectedColorKey) || [])];
      slots.splice(index, 1);
      newMap.set(selectedColorKey, slots);
      return newMap;
    });
  };

  // 완료 버튼
  const handleComplete = () => {
    const result: ColorImageData[] = [];

    colorImagesMap.forEach((slots, colorKey) => {
      const images = slots
        .filter((s) => s.status === "done" && s.publicUrl)
        .map((s) => s.publicUrl!);

      if (images.length > 0) {
        result.push({ colorKey, images });
      }
    });

    onSave(result);
  };

  const canUploadMore = currentImages.length < MAX_IMAGES_PER_COLOR;

  return (
    <div className="px-4 py-6 min-h-screen bg-white">
      {/* 설명 */}
      <div className="mb-6">
        <h1 className="text-lg font-bold text-black mb-2">
          색상별 이미지 설정
        </h1>
        <p className="text-sm text-gray-600">
          색상별 이미지를 선택해주세요. 1개의 색상에 최대 {MAX_IMAGES_PER_COLOR}장의
          이미지를 선택할 수 있습니다.
        </p>
      </div>

      {/* 색상 탭 */}
      <div className="flex gap-2 overflow-x-auto pb-3 mb-6 scrollbar-hide border-b border-gray-200">
        {colors.map((colorKey) => {
          const color = getColorByKey(colorKey);
          const displayName = color?.labelKo || colorKey;

          return (
            <button
              key={colorKey}
              type="button"
              onClick={() => setSelectedColorKey(colorKey)}
              className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                selectedColorKey === colorKey
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {displayName}
            </button>
          );
        })}
      </div>

      {/* 이미지 그리드 */}
      <div className="mb-6">
        <div className="grid grid-cols-3 gap-3">
          {currentImages.map((slot, index) => (
            <div key={index} className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden">
              {slot.status === "uploading" ? (
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                  <div className="text-white text-xs">{slot.progress}%</div>
                </div>
              ) : slot.status === "error" ? (
                <div className="absolute inset-0 flex items-center justify-center bg-red-100">
                  <p className="text-xs text-red-600">실패</p>
                </div>
              ) : (
                <>
                  <img
                    src={slot.preview}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(index)}
                    className="absolute top-1 right-1 w-6 h-6 bg-black bg-opacity-60 rounded-full flex items-center justify-center text-white hover:bg-opacity-80"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </>
              )}
            </div>
          ))}

          {/* 업로드 버튼 */}
          {canUploadMore && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="aspect-square bg-gray-100 rounded-lg flex flex-col items-center justify-center text-gray-400 hover:bg-gray-200 transition-colors"
            >
              <svg
                className="w-8 h-8 mb-1"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 4v16m8-8H4"
                />
              </svg>
              <span className="text-xs">
                {currentImages.length}/{MAX_IMAGES_PER_COLOR}
              </span>
            </button>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {/* 완료 CTA */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200">
        <div className="max-w-[420px] mx-auto flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 h-[52px] bg-gray-100 text-gray-700 rounded-lg text-base font-medium"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleComplete}
            className="flex-1 h-[52px] bg-black text-white rounded-lg text-base font-bold"
          >
            색상별 이미지 설정 완료
          </button>
        </div>
      </div>
    </div>
  );
}
