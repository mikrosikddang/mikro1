"use client";

import { useState } from "react";
import ImageCarousel from "@/components/ImageCarousel";
import { getColorByKey, isLightColor } from "@/lib/colors";

type ImageItem = { url: string; colorKey?: string | null };

type Props = {
  images: ImageItem[];
  colorKeys: string[];
  hasUntagged: boolean;
  aspect?: string;
};

export default function ColorImageCarousel({
  images,
  colorKeys,
  hasUntagged,
  aspect = "3/4",
}: Props) {
  // Default: "all" if there are untagged images, otherwise first color
  const [selected, setSelected] = useState<string>(
    hasUntagged ? "all" : colorKeys[0]
  );

  const displayImages =
    selected === "all"
      ? images
      : images.filter((i) => i.colorKey === selected);

  return (
    <div>
      <ImageCarousel
        key={selected}
        images={displayImages.map((i) => ({ url: i.url }))}
        aspect={aspect}
      />

      {/* Color tabs */}
      <div className="flex gap-2 px-4 py-2 overflow-x-auto scrollbar-hide">
        <button
          type="button"
          onClick={() => setSelected("all")}
          className={`shrink-0 px-3 py-1 rounded-full text-[12px] font-medium transition-colors ${
            selected === "all"
              ? "bg-black text-white"
              : "bg-gray-100 text-gray-600"
          }`}
        >
          전체
        </button>
        {colorKeys.map((key) => {
          const colorData = getColorByKey(key);
          return (
            <button
              key={key}
              type="button"
              onClick={() => setSelected(key)}
              className={`shrink-0 px-3 py-1 rounded-full text-[12px] font-medium transition-colors flex items-center gap-1.5 ${
                selected === key
                  ? "bg-black text-white"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {colorData && (
                <span
                  className={`w-3 h-3 rounded-full ${
                    selected === key
                      ? isLightColor(colorData.hex) ? "border border-white/50" : ""
                      : isLightColor(colorData.hex) ? "border border-gray-300" : ""
                  }`}
                  style={{ backgroundColor: colorData.hex }}
                />
              )}
              {colorData?.labelKo || key}
            </button>
          );
        })}
      </div>
    </div>
  );
}
