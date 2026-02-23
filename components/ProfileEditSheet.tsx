"use client";

import { useState, useEffect, useRef } from "react";
import ActionSheet from "@/components/ActionSheet";

type ProfileEditSheetProps = {
  open: boolean;
  onClose: () => void;
};

type ProfileData = {
  shopName: string;
  bio: string;
  locationText: string;
  csEmail: string;
  csPhone: string;
  csHours: string;
  avatarUrl: string | null;
};

export default function ProfileEditSheet({ open, onClose }: ProfileEditSheetProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<ProfileData>({
    shopName: "",
    bio: "",
    locationText: "",
    csEmail: "",
    csPhone: "",
    csHours: "",
    avatarUrl: null,
  });

  // 프로필 데이터 로드
  useEffect(() => {
    if (!open) return;

    const fetchProfile = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/seller/profile");
        if (res.ok) {
          const data = await res.json();
          setFormData({
            shopName: data.shopName || "",
            bio: data.bio || "",
            locationText: data.locationText || "",
            csEmail: data.csEmail || "",
            csPhone: data.csPhone || "",
            csHours: data.csHours || "",
            avatarUrl: data.avatarUrl || null,
          });
        } else {
          alert("프로필을 불러올 수 없습니다");
          onClose();
        }
      } catch (error) {
        console.error("Failed to fetch profile:", error);
        alert("프로필을 불러올 수 없습니다");
        onClose();
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [open, onClose]);

  // 아바타 파일 선택 핸들러
  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  // 아바타 업로드
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 파일 크기 체크 (3MB)
    if (file.size > 3 * 1024 * 1024) {
      alert("파일 크기는 3MB 이하여야 합니다");
      return;
    }

    // 파일 타입 체크
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      alert("JPG, PNG, WEBP 이미지만 업로드 가능합니다");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/uploads/avatar", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "업로드에 실패했습니다");
        return;
      }

      const data = await res.json();
      setFormData((prev) => ({ ...prev, avatarUrl: data.url }));
    } catch (error) {
      console.error("Failed to upload avatar:", error);
      alert("업로드 중 오류가 발생했습니다");
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // 저장 핸들러
  const handleSave = async () => {
    // Validation
    if (!formData.shopName.trim()) {
      alert("상점명을 입력해주세요");
      return;
    }

    if (formData.shopName.trim().length > 30) {
      alert("상점명은 30자 이하여야 합니다");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/seller/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "저장에 실패했습니다");
        return;
      }

      alert("프로필이 저장되었습니다");
      onClose();
    } catch (error) {
      console.error("Failed to save profile:", error);
      alert("저장 중 오류가 발생했습니다");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ActionSheet open={open} onClose={onClose} title="프로필 편집">
      {loading ? (
        <div className="py-12 flex items-center justify-center">
          <div className="text-sm text-gray-500">로딩 중...</div>
        </div>
      ) : (
        <div className="px-4 py-4 space-y-5">
          {/* 아바타 업로드 */}
          <div className="flex flex-col items-center">
            <button
              type="button"
              onClick={handleAvatarClick}
              disabled={uploading}
              className="relative w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden active:opacity-70 transition-opacity"
            >
              {formData.avatarUrl ? (
                <img
                  src={formData.avatarUrl}
                  alt="프로필"
                  className="w-full h-full object-cover"
                />
              ) : (
                <svg
                  className="w-10 h-10 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              )}
              {uploading && (
                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                  <div className="text-xs text-white">업로드 중...</div>
                </div>
              )}
            </button>
            <button
              type="button"
              onClick={handleAvatarClick}
              disabled={uploading}
              className="mt-2 text-sm font-medium text-blue-600 active:opacity-70 transition-opacity"
            >
              사진 변경
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleAvatarChange}
              className="hidden"
            />
          </div>

          {/* 상점명 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              상점명 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.shopName}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, shopName: e.target.value }))
              }
              placeholder="상점명을 입력하세요"
              maxLength={30}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-black focus:border-black"
            />
            <div className="mt-1 text-xs text-gray-500 text-right">
              {formData.shopName.length}/30
            </div>
          </div>

          {/* 소개 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              소개
            </label>
            <textarea
              value={formData.bio}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, bio: e.target.value }))
              }
              placeholder="상점 소개를 입력하세요"
              maxLength={160}
              rows={3}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-base resize-none focus:ring-2 focus:ring-black focus:border-black"
            />
            <div className="mt-1 text-xs text-gray-500 text-right">
              {formData.bio.length}/160
            </div>
          </div>

          {/* 위치 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              위치
            </label>
            <input
              type="text"
              value={formData.locationText}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, locationText: e.target.value }))
              }
              placeholder="예: 서울시 강남구"
              maxLength={60}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-black focus:border-black"
            />
          </div>

          {/* CS 이메일 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              고객센터 이메일
            </label>
            <input
              type="email"
              value={formData.csEmail}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, csEmail: e.target.value }))
              }
              placeholder="cs@example.com"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-black focus:border-black"
            />
          </div>

          {/* CS 전화번호 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              고객센터 전화
            </label>
            <input
              type="tel"
              value={formData.csPhone}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, csPhone: e.target.value }))
              }
              placeholder="02-1234-5678"
              maxLength={30}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-black focus:border-black"
            />
          </div>

          {/* CS 운영시간 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              고객센터 운영시간
            </label>
            <input
              type="text"
              value={formData.csHours}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, csHours: e.target.value }))
              }
              placeholder="평일 10:00-18:00"
              maxLength={40}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-black focus:border-black"
            />
          </div>

          {/* 저장 버튼 */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="w-full h-12 bg-black text-white rounded-lg text-base font-bold active:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "저장 중..." : "저장"}
            </button>
          </div>
        </div>
      )}
    </ActionSheet>
  );
}
