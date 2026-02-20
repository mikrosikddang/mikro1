"use client";

import { useEffect, useState } from "react";
import { getHomeFeedViewMode, setHomeFeedViewMode, type HomeFeedViewMode } from "@/lib/uiPrefs";

type HomeFeedViewToggleProps = {
  onModeChange?: (mode: HomeFeedViewMode) => void;
};

export default function HomeFeedViewToggle({ onModeChange }: HomeFeedViewToggleProps) {
  const [viewMode, setViewMode] = useState<HomeFeedViewMode>("feed");
  const [mounted, setMounted] = useState(false);

  // Initialize from localStorage after mount (avoid hydration mismatch)
  useEffect(() => {
    setViewMode(getHomeFeedViewMode());
    setMounted(true);
  }, []);

  const handleModeChange = (mode: HomeFeedViewMode) => {
    setViewMode(mode);
    setHomeFeedViewMode(mode);
    onModeChange?.(mode);

    // Trigger custom event for home page to listen
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("homeFeedViewModeChange", { detail: { mode } }));
    }
  };

  // Don't render until mounted to avoid hydration mismatch
  if (!mounted) {
    return (
      <div className="px-6 pt-4 pb-3">
        <div className="h-9 bg-gray-100 rounded-full" />
      </div>
    );
  }

  return (
    <div className="px-6 pt-4 pb-3">
      {/* Segmented control */}
      <div className="relative flex items-center bg-gray-100 rounded-full p-0.5 h-9">
        <button
          type="button"
          onClick={() => handleModeChange("feed")}
          className={`flex-1 h-full rounded-full text-[13px] font-medium transition-all relative z-10 ${
            viewMode === "feed"
              ? "text-gray-900 font-semibold"
              : "text-gray-500"
          }`}
          aria-pressed={viewMode === "feed"}
        >
          피드
        </button>
        <button
          type="button"
          onClick={() => handleModeChange("carrot")}
          className={`flex-1 h-full rounded-full text-[13px] font-medium transition-all relative z-10 ${
            viewMode === "carrot"
              ? "text-gray-900 font-semibold"
              : "text-gray-500"
          }`}
          aria-pressed={viewMode === "carrot"}
        >
          리스트
        </button>

        {/* Sliding background */}
        <div
          className="absolute top-0.5 bottom-0.5 w-[calc(50%-2px)] bg-white rounded-full shadow-sm transition-transform duration-200 ease-out"
          style={{
            transform: viewMode === "carrot" ? "translateX(calc(100% + 4px))" : "translateX(0)",
          }}
        />
      </div>
    </div>
  );
}
