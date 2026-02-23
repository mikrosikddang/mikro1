"use client";

import { useState, useEffect } from "react";
import ActionSheet from "@/components/ActionSheet";
import {
  COLOR_GROUPS,
  COLORS,
  getColorByKey,
  searchColors,
  type ColorGroup,
  type Color,
} from "@/lib/colors";
import {
  getFavoriteColors,
  toggleFavoriteColor,
  getRecentColors,
  pushRecentColor,
  getRecentSearches,
  pushRecentSearch,
  removeRecentSearch,
  clearRecentSearches,
} from "@/lib/colorStorage";

type ColorPickerSheetProps = {
  open: boolean;
  onClose: () => void;
  onSelectColor: (colorKey: string) => void;
};

type ViewMode = "main" | "search";
type TabMode = "my" | "basic";

export default function ColorPickerSheet({
  open,
  onClose,
  onSelectColor,
}: ColorPickerSheetProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("main");
  const [tabMode, setTabMode] = useState<TabMode>("my");
  const [selectedGroup, setSelectedGroup] = useState<ColorGroup>("그레이");

  // 로컬 상태
  const [favoriteColors, setFavoriteColors] = useState<string[]>([]);
  const [recentColors, setRecentColors] = useState<string[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // 검색
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Color[]>([]);

  // 초기 로드
  useEffect(() => {
    if (open) {
      setFavoriteColors(getFavoriteColors());
      setRecentColors(getRecentColors());
      setRecentSearches(getRecentSearches());
    }
  }, [open]);

  // 검색어 변경 시 결과 업데이트
  useEffect(() => {
    if (searchQuery.trim()) {
      setSearchResults(searchColors(searchQuery));
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  // 즐겨찾기 토글
  const handleToggleFavorite = (colorKey: string) => {
    const newState = toggleFavoriteColor(colorKey);
    setFavoriteColors(getFavoriteColors());
  };

  // 색상 선택
  const handleSelectColor = (colorKey: string) => {
    pushRecentColor(colorKey);
    onSelectColor(colorKey);
    onClose();
  };

  // 검색 제출
  const handleSearchSubmit = () => {
    if (searchQuery.trim()) {
      pushRecentSearch(searchQuery.trim());
      setRecentSearches(getRecentSearches());
    }
  };

  // 검색어 삭제
  const handleRemoveSearch = (query: string) => {
    removeRecentSearch(query);
    setRecentSearches(getRecentSearches());
  };

  // 전체 삭제
  const handleClearSearches = () => {
    clearRecentSearches();
    setRecentSearches([]);
  };

  // 검색 모드 진입
  const handleOpenSearch = () => {
    setViewMode("search");
    setSearchQuery("");
    setSearchResults([]);
  };

  // 검색 모드 닫기
  const handleCloseSearch = () => {
    setViewMode("main");
    setSearchQuery("");
  };

  return (
    <ActionSheet
      open={open}
      onClose={onClose}
      title={viewMode === "search" ? "색상 검색" : "색상 선택"}
      headerRight={
        viewMode === "main" ? (
          <button
            type="button"
            onClick={handleOpenSearch}
            className="p-1 text-gray-600 hover:text-black"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </button>
        ) : (
          <button
            type="button"
            onClick={handleCloseSearch}
            className="text-sm font-medium text-gray-600"
          >
            닫기
          </button>
        )
      }
    >
      <div className="px-4 py-4">
        {viewMode === "main" ? (
          <>
            {/* 탭: 나만의 색상 / 기본 색상 */}
            <div className="flex border-b border-gray-200 mb-4">
              <button
                type="button"
                onClick={() => setTabMode("my")}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${
                  tabMode === "my"
                    ? "text-black border-b-2 border-black"
                    : "text-gray-500"
                }`}
              >
                나만의 색상
              </button>
              <button
                type="button"
                onClick={() => setTabMode("basic")}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${
                  tabMode === "basic"
                    ? "text-black border-b-2 border-black"
                    : "text-gray-500"
                }`}
              >
                기본 색상
              </button>
            </div>

            {/* 나만의 색상 탭 */}
            {tabMode === "my" && (
              <div className="space-y-6">
                {/* 즐겨찾는 색상 */}
                <div>
                  <h3 className="text-xs font-medium text-gray-500 mb-3">
                    즐겨찾는 색상
                  </h3>
                  {favoriteColors.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2">
                      {favoriteColors.map((key) => {
                        const color = getColorByKey(key);
                        if (!color) return null;
                        return (
                          <ColorCard
                            key={key}
                            color={color}
                            isFavorite={true}
                            onToggleFavorite={handleToggleFavorite}
                            onSelect={handleSelectColor}
                          />
                        );
                      })}
                    </div>
                  ) : (
                    <div className="py-8 text-center">
                      <p className="text-sm text-gray-400">
                        즐겨찾는 색상이 없습니다
                      </p>
                    </div>
                  )}
                </div>

                {/* 최근 선택한 색상 */}
                <div>
                  <h3 className="text-xs font-medium text-gray-500 mb-3">
                    최근 선택한 색상
                  </h3>
                  {recentColors.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2">
                      {recentColors.map((key) => {
                        const color = getColorByKey(key);
                        if (!color) return null;
                        return (
                          <ColorCard
                            key={key}
                            color={color}
                            isFavorite={favoriteColors.includes(key)}
                            onToggleFavorite={handleToggleFavorite}
                            onSelect={handleSelectColor}
                          />
                        );
                      })}
                    </div>
                  ) : (
                    <div className="py-8 text-center">
                      <p className="text-sm text-gray-400">
                        최근 선택한 색상이 없습니다
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 기본 색상 탭 */}
            {tabMode === "basic" && (
              <div>
                {/* 색상군 탭 */}
                <div className="flex gap-2 overflow-x-auto pb-3 mb-4 scrollbar-hide">
                  {COLOR_GROUPS.map((group) => (
                    <button
                      key={group}
                      type="button"
                      onClick={() => setSelectedGroup(group)}
                      className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                        selectedGroup === group
                          ? "bg-red-500 text-white"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {group}
                    </button>
                  ))}
                </div>

                {/* 색상 리스트 */}
                <div className="grid grid-cols-2 gap-2">
                  {COLORS[selectedGroup].map((color) => (
                    <ColorCard
                      key={color.key}
                      color={color}
                      isFavorite={favoriteColors.includes(color.key)}
                      onToggleFavorite={handleToggleFavorite}
                      onSelect={handleSelectColor}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          /* 검색 화면 */
          <div>
            {/* 검색 인풋 */}
            <div className="mb-4">
              <input
                type="text"
                placeholder="색상 검색"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSearchSubmit();
                }}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-black focus:border-black"
                autoFocus
              />
            </div>

            {/* 최근 검색어 */}
            {!searchQuery.trim() && recentSearches.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-medium text-gray-500">
                    최근 검색어
                  </h3>
                  <button
                    type="button"
                    onClick={handleClearSearches}
                    className="text-xs text-gray-400 hover:text-gray-600"
                  >
                    전체삭제
                  </button>
                </div>
                <div className="space-y-2">
                  {recentSearches.map((query) => (
                    <div
                      key={query}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50"
                    >
                      <button
                        type="button"
                        onClick={() => setSearchQuery(query)}
                        className="flex-1 text-left text-sm text-gray-700"
                      >
                        {query}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveSearch(query)}
                        className="p-1 text-gray-400 hover:text-gray-600"
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
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 검색 결과 */}
            {searchQuery.trim() && (
              <div>
                <h3 className="text-xs font-medium text-gray-500 mb-3">
                  검색 결과 ({searchResults.length})
                </h3>
                {searchResults.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2">
                    {searchResults.map((color) => (
                      <ColorCard
                        key={color.key}
                        color={color}
                        isFavorite={favoriteColors.includes(color.key)}
                        onToggleFavorite={handleToggleFavorite}
                        onSelect={handleSelectColor}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center">
                    <p className="text-sm text-gray-400">
                      검색 결과가 없습니다
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </ActionSheet>
  );
}

/**
 * 색상 카드 (사각형 리스트 형태)
 */
type ColorCardProps = {
  color: Color;
  isFavorite: boolean;
  onToggleFavorite: (key: string) => void;
  onSelect: (key: string) => void;
};

function ColorCard({
  color,
  isFavorite,
  onToggleFavorite,
  onSelect,
}: ColorCardProps) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors">
      {/* 좌측: 컬러칩 */}
      <button
        type="button"
        onClick={() => onSelect(color.key)}
        className="flex-shrink-0"
      >
        <div
          className="w-10 h-10 rounded-md border border-gray-300"
          style={{ backgroundColor: color.hex }}
        />
      </button>

      {/* 중앙: 색상명 */}
      <button
        type="button"
        onClick={() => onSelect(color.key)}
        className="flex-1 text-left text-sm font-medium text-gray-900"
      >
        {color.labelKo}
      </button>

      {/* 우측: 즐겨찾기 */}
      <button
        type="button"
        onClick={() => onToggleFavorite(color.key)}
        className="flex-shrink-0 p-1 text-gray-400 hover:text-yellow-500 transition-colors"
      >
        {isFavorite ? (
          <svg
            className="w-5 h-5 fill-current text-yellow-500"
            viewBox="0 0 24 24"
          >
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        ) : (
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
            />
          </svg>
        )}
      </button>
    </div>
  );
}
