"use client";

import { useEffect, useState } from "react";
import { getHomeFeedViewMode, setHomeFeedViewMode, type HomeFeedViewMode } from "@/lib/uiPrefs";

type HomeFeedViewToggleProps = {
  onModeChange?: (mode: HomeFeedViewMode) => void;
  compact?: boolean;
};

export default function HomeFeedViewToggle({ onModeChange, compact }: HomeFeedViewToggleProps) {
  const [viewMode, setViewMode] = useState<HomeFeedViewMode>(getHomeFeedViewMode());
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

  const isFeedMode = viewMode === "feed";

  const toggleSwitch = () => {
    const newMode = isFeedMode ? "carrot" : "feed";
    handleModeChange(newMode);
  };

  // Don't render until mounted to avoid hydration mismatch
  if (!mounted) {
    return (
      <div className={`mx-4 mt-2 ${compact ? "mb-1" : "mb-3"}`}>
        <div className="h-10 px-3 rounded-2xl bg-gray-50 border border-gray-100" />
      </div>
    );
  }

  return (
    <div className={`mx-4 mt-2 ${compact ? "mb-1" : "mb-3"}`}>
      <button
        type="button"
        onClick={toggleSwitch}
        className="w-full h-10 px-3 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-between active:bg-gray-100 transition-colors"
      >
        <span className="text-[14px] font-medium text-gray-700">피드형 보기</span>

        {/* Switch */}
        <div
          className={`relative w-9 h-5 rounded-full transition-colors ${
            isFeedMode ? "bg-black" : "bg-gray-300"
          }`}
        >
          <div
            className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
              isFeedMode ? "translate-x-[18px]" : "translate-x-0.5"
            }`}
          />
        </div>
      </button>
    </div>
  );
}
