"use client";

import { useState, useEffect } from "react";
import ActionSheet from "@/components/ActionSheet";
import {
  MAIN_CATEGORIES,
  getMidCategories,
  getSubCategories,
  getCategoryBreadcrumb,
  getRecentCategories,
  pushRecentCategory,
  type CategoryMain,
  type RecentCategory,
} from "@/lib/categories";

type CategoryPickerSheetProps = {
  open: boolean;
  onClose: () => void;
  initialMain?: string | null;
  initialMid?: string | null;
  initialSub?: string | null;
  onChange: (category: {
    main: string;
    mid?: string;
    sub?: string;
  }) => void;
};

export default function CategoryPickerSheet({
  open,
  onClose,
  initialMain,
  initialMid,
  initialSub,
  onChange,
}: CategoryPickerSheetProps) {
  const [selectedMain, setSelectedMain] = useState<string | null>(
    initialMain || null
  );
  const [selectedMid, setSelectedMid] = useState<string | null>(
    initialMid || null
  );
  const [selectedSub, setSelectedSub] = useState<string | null>(
    initialSub || null
  );

  const [expandedMid, setExpandedMid] = useState<string | null>(
    initialMid || null
  );

  const [recentCategories, setRecentCategories] = useState<RecentCategory[]>([]);

  // Sync selectedMain/Mid/Sub when initialMain or open changes
  useEffect(() => {
    if (open) {
      setSelectedMain(initialMain || null);
      setSelectedMid(initialMid || null);
      setSelectedSub(initialSub || null);
      // Auto-expand mid categories when initialMain is provided
      setExpandedMid(initialMid || null);
      setRecentCategories(getRecentCategories());
    }
  }, [open, initialMain, initialMid, initialSub]);

  // Main 카테고리 선택
  const handleMainSelect = (main: string) => {
    setSelectedMain(main);
    setSelectedMid(null);
    setSelectedSub(null);
    setExpandedMid(null);
  };

  // Mid 카테고리 선택 — 실시간 필터링 + 펼침
  const handleMidToggle = (mid: string) => {
    if (expandedMid === mid) {
      setExpandedMid(null);
    } else {
      setExpandedMid(mid);
      setSelectedMid(mid);
      setSelectedSub(null);

      // Real-time filtering: navigate to main+mid (sheet stays open)
      if (selectedMain) {
        onChange({ main: selectedMain, mid });
      }
    }
  };

  // Sub 카테고리 선택 — 실시간 필터링 (시트 유지, 재탭으로 해제)
  const handleSubSelect = (sub: string) => {
    if (!selectedMain || !selectedMid) return;

    if (selectedSub === sub) {
      // Re-tap: deselect sub → filter by main+mid only
      setSelectedSub(null);
      onChange({ main: selectedMain, mid: selectedMid });
    } else {
      // Select sub → filter by main+mid+sub
      setSelectedSub(sub);
      pushRecentCategory(selectedMain, selectedMid, sub);
      onChange({ main: selectedMain, mid: selectedMid, sub });
    }
    // Sheet stays open for continued browsing
  };

  // 최근 선택 카테고리 클릭
  const handleRecentSelect = (recent: RecentCategory) => {
    setSelectedMain(recent.main);
    setSelectedMid(recent.mid);
    setSelectedSub(recent.sub);
    pushRecentCategory(recent.main, recent.mid, recent.sub);
    onChange({
      main: recent.main,
      mid: recent.mid,
      sub: recent.sub,
    });
    onClose();
  };

  const breadcrumb = getCategoryBreadcrumb(selectedMain, selectedMid, selectedSub);

  return (
    <ActionSheet open={open} onClose={onClose} title="카테고리 선택">
      <div className="px-4 py-4">
        {/* Breadcrumb */}
        <div className="mb-4 pb-3 border-b border-gray-200">
          <p className="text-sm text-gray-600">
            {breadcrumb}
          </p>
        </div>

        {/* 최근 선택 카테고리 */}
        {recentCategories.length > 0 && (
          <div className="mb-6">
            <h3 className="text-xs font-medium text-gray-500 mb-2">최근 선택</h3>
            <div className="flex gap-2 overflow-x-auto scrollbar-hide">
              {recentCategories.map((recent, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleRecentSelect(recent)}
                  className="shrink-0 px-3 py-1.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                >
                  {getCategoryBreadcrumb(recent.main, recent.mid, recent.sub)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 1 Depth: Main Category */}
        <div className="mb-6">
          <h3 className="text-xs font-medium text-gray-500 mb-2">성별</h3>
          <div className="grid grid-cols-2 gap-2">
            {MAIN_CATEGORIES.map((main) => (
              <button
                key={main}
                type="button"
                onClick={() => handleMainSelect(main)}
                className={`h-11 px-4 rounded-lg text-sm font-medium transition-colors ${
                  selectedMain === main
                    ? "bg-gray-900 text-white"
                    : "bg-gray-100 text-gray-700 active:bg-gray-200"
                }`}
              >
                {main}
              </button>
            ))}
          </div>
        </div>

        {/* 2 Depth: Mid Category */}
        {selectedMain && (
          <div className="mb-6">
            <h3 className="text-xs font-medium text-gray-500 mb-2">
              카테고리
            </h3>
            <div className="space-y-1">
              {getMidCategories(selectedMain as CategoryMain).map((mid) => {
                const isExpanded = expandedMid === mid;
                const subCategories = getSubCategories(
                  selectedMain as CategoryMain,
                  mid
                );

                return (
                  <div key={mid}>
                    {/* Mid 카테고리 버튼 */}
                    <button
                      type="button"
                      onClick={() => handleMidToggle(mid)}
                      className={`w-full h-11 px-4 rounded-lg text-sm font-medium transition-colors flex items-center justify-between ${
                        selectedMid === mid
                          ? "bg-gray-900 text-white"
                          : "bg-gray-100 text-gray-700 active:bg-gray-200"
                      }`}
                    >
                      <span>{mid}</span>
                      <svg
                        className={`w-4 h-4 transition-transform ${
                          isExpanded ? "rotate-180" : ""
                        }`}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </button>

                    {/* 3 Depth: Sub Category (펼쳐진 경우만) */}
                    {isExpanded && (
                      <div className="mt-2 ml-4 grid grid-cols-2 gap-2">
                        {subCategories.map((sub) => (
                          <button
                            key={sub}
                            type="button"
                            onClick={() => handleSubSelect(sub)}
                            className={`h-10 px-3 rounded-lg text-xs font-medium transition-colors ${
                              selectedSub === sub
                                ? "bg-gray-200 text-gray-900 border border-gray-400"
                                : "bg-white border border-gray-200 text-gray-700 active:bg-gray-50"
                            }`}
                          >
                            {sub}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </ActionSheet>
  );
}
