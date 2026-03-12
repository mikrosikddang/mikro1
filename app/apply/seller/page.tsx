"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SellerKind, SocialChannelType } from "@prisma/client";
import Container from "@/components/Container";
import {
  buildDefaultStoreSlug,
  SELLER_KIND_OPTIONS,
  SOCIAL_CHANNEL_OPTIONS,
  buildDefaultCreatorSlug,
  isReservedStoreSlug,
  isOfflineSellerKind,
  needsCreatorProfile,
} from "@/lib/sellerTypes";

const SHOP_TYPES = ["남성복", "여성복", "유니섹스"];
const MARKET_BUILDINGS = [
  "APM",
  "APM플레이스",
  "APM럭스",
  "누죤",
  "디자이너클럽",
  "퀸즈스퀘어",
  "DDP패션몰",
  "기타",
];
const CS_TYPES = ["카카오톡ID", "문자/전화", "기타"] as const;
type CsType = (typeof CS_TYPES)[number];

interface FormErrors {
  [key: string]: string;
}

type FormState = {
  sellerKind: SellerKind;
  shopName: string;
  storeSlug: string;
  type: string;
  bizRegNo: string;
  bizLicenseImage: string;
  marketBuilding: string;
  marketBuildingCustom: string;
  floor: string;
  roomNo: string;
  managerPhone: string;
  csType: CsType | "";
  csContact: string;
  csAddress: string;
  csHours: string;
  shippingInfo: string;
  exchangeInfo: string;
  refundInfo: string;
  etcInfo: string;
  creatorSlug: string;
  socialChannelType: SocialChannelType | "";
  socialChannelUrl: string;
  followerCount: string;
  isBusinessSeller: boolean;
};

const INITIAL_FORM: FormState = {
  sellerKind: SellerKind.WHOLESALE_STORE,
  shopName: "",
  storeSlug: "",
  type: "",
  bizRegNo: "",
  bizLicenseImage: "",
  marketBuilding: "",
  marketBuildingCustom: "",
  floor: "",
  roomNo: "",
  managerPhone: "",
  csType: "",
  csContact: "",
  csAddress: "",
  csHours: "",
  shippingInfo: "",
  exchangeInfo: "",
  refundInfo: "",
  etcInfo: "",
  creatorSlug: "",
  socialChannelType: "",
  socialChannelUrl: "",
  followerCount: "",
  isBusinessSeller: true,
};

export default function SellerApplyPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [existingProfile, setExistingProfile] = useState<any>(null);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [formData, setFormData] = useState<FormState>(INITIAL_FORM);

  useEffect(() => {
    checkExistingProfile();
  }, []);

  const resolvedMarketBuilding =
    formData.marketBuilding === "기타"
      ? formData.marketBuildingCustom.trim()
      : formData.marketBuilding.trim();

  const showOfflineFields = isOfflineSellerKind(formData.sellerKind);
  const showCreatorFields = needsCreatorProfile(formData.sellerKind);

  const inlineError = (field: string) =>
    errors[field] ? (
      <p className="mt-1 text-[12px] text-red-500">{errors[field]}</p>
    ) : null;

  const updateField = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const checkExistingProfile = async () => {
    try {
      const res = await fetch("/api/seller/apply");
      if (!res.ok) {
        if (res.status === 401) {
          router.replace("/login?next=/apply/seller");
          return;
        }
        throw new Error("Failed to fetch profile");
      }

      const data = await res.json();
      if (data.role === "ADMIN") {
        setIsAdminUser(true);
        setLoading(false);
        return;
      }

      if (data.exists) {
        setExistingProfile(data.profile);
        const p = data.profile;

        let csType: FormState["csType"] = "";
        let csContact = "";
        if (p.csKakaoId) {
          csType = "카카오톡ID";
          csContact = p.csKakaoId;
        } else if (p.csPhone) {
          csType = "문자/전화";
          csContact = p.csPhone;
        } else if (p.csEmail) {
          csType = "기타";
          csContact = p.csEmail;
        }

        const isPreset = MARKET_BUILDINGS.slice(0, -1).includes(
          p.marketBuilding || "",
        );

        setFormData({
          sellerKind: p.sellerKind || SellerKind.WHOLESALE_STORE,
          shopName: p.shopName || "",
          storeSlug: p.storeSlug || buildDefaultStoreSlug(p.shopName || ""),
          type: p.type || "",
          bizRegNo: p.bizRegNo || "",
          bizLicenseImage: p.bizRegImageUrl || "",
          marketBuilding: isPreset
            ? p.marketBuilding || ""
            : p.marketBuilding
              ? "기타"
              : "",
          marketBuildingCustom: isPreset ? "" : p.marketBuilding || "",
          floor: p.floor || "",
          roomNo: p.roomNo || "",
          managerPhone: p.managerPhone || "",
          csType,
          csContact,
          csAddress: p.csAddress || "",
          csHours: p.csHours || "",
          shippingInfo: p.shippingGuide || "",
          exchangeInfo: p.exchangeGuide || "",
          refundInfo: p.refundGuide || "",
          etcInfo: p.etcGuide || "",
          creatorSlug:
            p.creatorSlug || buildDefaultCreatorSlug(p.shopName || ""),
          socialChannelType: p.socialChannelType || "",
          socialChannelUrl: p.socialChannelUrl || "",
          followerCount:
            p.followerCount != null ? String(p.followerCount) : "",
          isBusinessSeller: p.isBusinessSeller ?? true,
        });
      }
    } catch (error) {
      console.error("Error checking profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/uploads/biz-license", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) {
        setErrors((prev) => ({
          ...prev,
          bizLicenseImage: data.error || "업로드 실패",
        }));
        return;
      }
      updateField("bizLicenseImage", data.url);
    } catch {
      setErrors((prev) => ({
        ...prev,
        bizLicenseImage: "업로드 중 오류가 발생했습니다",
      }));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const validate = () => {
    const nextErrors: FormErrors = {};

    if (!formData.shopName.trim()) nextErrors.shopName = "상점명을 입력해주세요.";
    if (!formData.storeSlug.trim()) {
      nextErrors.storeSlug = "상점 URL을 입력해주세요.";
    } else if (!/^[a-z0-9][a-z0-9-_]{1,39}$/.test(formData.storeSlug.trim())) {
      nextErrors.storeSlug =
        "상점 URL은 영문 소문자, 숫자, -, _ 조합으로 2~40자여야 합니다.";
    } else if (isReservedStoreSlug(formData.storeSlug.trim())) {
      nextErrors.storeSlug = "사용할 수 없는 상점 URL입니다.";
    }
    if (!formData.type) nextErrors.type = "상점 유형을 선택해주세요.";
    if (!formData.managerPhone.trim()) {
      nextErrors.managerPhone = "담당자 연락처를 입력해주세요.";
    }
    if (!formData.csType) nextErrors.csType = "CS 연락처 유형을 선택해주세요.";
    if (!formData.csContact.trim()) {
      nextErrors.csContact = "CS 연락처를 입력해주세요.";
    }
    if (!formData.csAddress.trim()) {
      nextErrors.csAddress = "CS 주소를 입력해주세요.";
    }
    if (!formData.csHours.trim()) {
      nextErrors.csHours = "상담 시간을 입력해주세요.";
    }
    if (!formData.shippingInfo.trim()) {
      nextErrors.shippingInfo = "배송 안내를 입력해주세요.";
    }
    if (!formData.exchangeInfo.trim()) {
      nextErrors.exchangeInfo = "교환/반품 안내를 입력해주세요.";
    }
    if (!formData.refundInfo.trim()) {
      nextErrors.refundInfo = "환불 안내를 입력해주세요.";
    }

    if (showOfflineFields) {
      if (!formData.marketBuilding) {
        nextErrors.marketBuilding = "상가명을 선택해주세요.";
      }
      if (formData.marketBuilding === "기타" && !formData.marketBuildingCustom.trim()) {
        nextErrors.marketBuildingCustom = "상가명을 직접 입력해주세요.";
      }
      if (!formData.floor.trim()) nextErrors.floor = "층을 입력해주세요.";
      if (!formData.roomNo.trim()) nextErrors.roomNo = "호수를 입력해주세요.";
    }

    if (showCreatorFields) {
      if (!formData.creatorSlug.trim()) {
        nextErrors.creatorSlug = "크리에이터 슬러그를 입력해주세요.";
      }
      if (
        !/^[a-z0-9][a-z0-9-_]{1,39}$/.test(formData.creatorSlug.trim())
      ) {
        nextErrors.creatorSlug =
          "슬러그는 영문 소문자, 숫자, -, _ 조합으로 2~40자여야 합니다.";
      }
    }

    if (
      formData.sellerKind === SellerKind.INFLUENCER ||
      formData.sellerKind === SellerKind.HYBRID
    ) {
      if (!formData.socialChannelType) {
        nextErrors.socialChannelType = "대표 SNS 채널을 선택해주세요.";
      }
      if (!formData.socialChannelUrl.trim()) {
        nextErrors.socialChannelUrl = "대표 SNS 채널 URL을 입력해주세요.";
      } else if (!/^https?:\/\//.test(formData.socialChannelUrl.trim())) {
        nextErrors.socialChannelUrl = "URL은 http 또는 https로 시작해야 합니다.";
      }
    }

    if (
      formData.followerCount.trim() &&
      !/^\d+$/.test(formData.followerCount.trim())
    ) {
      nextErrors.followerCount = "팔로워 수는 숫자로만 입력해주세요.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);

    let csKakaoId: string | null = null;
    let csPhone: string | null = null;
    let csEmail: string | null = null;
    if (formData.csType === "카카오톡ID") csKakaoId = formData.csContact.trim();
    if (formData.csType === "문자/전화") csPhone = formData.csContact.trim();
    if (formData.csType === "기타") csEmail = formData.csContact.trim();

    try {
      const res = await fetch("/api/seller/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sellerKind: formData.sellerKind,
          shopName: formData.shopName.trim(),
          storeSlug: formData.storeSlug.trim(),
          bizRegNo: formData.bizRegNo.trim() || null,
          type: formData.type,
          marketBuilding: resolvedMarketBuilding || null,
          floor: formData.floor.trim() || null,
          roomNo: formData.roomNo.trim() || null,
          managerPhone: formData.managerPhone.trim(),
          bizRegImageUrl: formData.bizLicenseImage || null,
          csKakaoId,
          csPhone,
          csEmail,
          csAddress: formData.csAddress.trim(),
          csHours: formData.csHours.trim(),
          shippingGuide: formData.shippingInfo.trim(),
          exchangeGuide: formData.exchangeInfo.trim(),
          refundGuide: formData.refundInfo.trim(),
          etcGuide: formData.etcInfo.trim() || null,
          creatorSlug: formData.creatorSlug.trim() || null,
          socialChannelType: formData.socialChannelType || null,
          socialChannelUrl: formData.socialChannelUrl.trim() || null,
          followerCount: formData.followerCount.trim()
            ? Number(formData.followerCount.trim())
            : null,
          isBusinessSeller: formData.isBusinessSeller,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrors({ _form: data.error || "신청에 실패했습니다." });
        setSubmitting(false);
        return;
      }

      router.replace("/apply/seller");
      router.refresh();
    } catch {
      setErrors({ _form: "신청 중 오류가 발생했습니다." });
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Container>
        <div className="py-20 text-center text-sm text-gray-400">로딩 중...</div>
      </Container>
    );
  }

  if (isAdminUser) {
    return (
      <Container>
        <div className="py-8">
          <h1 className="mb-4 text-[22px] font-bold text-black">입점 신청</h1>
          <div className="rounded-xl bg-gray-50 p-6 text-center">
            <p className="mb-2 text-[15px] font-medium text-gray-800">
              관리자 계정 안내
            </p>
            <p className="text-[13px] text-gray-600">
              관리자 계정은 입점 신청이 불가합니다.
              <br />
              일반 계정으로 로그인 후 신청해주세요.
            </p>
          </div>
        </div>
      </Container>
    );
  }

  if (existingProfile && existingProfile.status === "APPROVED") {
    return (
      <Container>
        <div className="py-8">
          <h1 className="mb-4 text-[22px] font-bold text-black">입점 신청</h1>
          <div className="rounded-xl bg-green-50 p-6 text-center">
            <p className="mb-2 text-[18px] font-bold text-green-800">승인 완료</p>
            <p className="mb-4 text-[14px] text-green-700">
              판매자로 승인되었습니다.
            </p>
            <button
              onClick={() => router.push("/seller")}
              className="rounded-lg bg-black px-6 py-2 text-[14px] font-medium text-white"
            >
              판매자 센터로 이동
            </button>
          </div>
        </div>
      </Container>
    );
  }

  return (
    <Container>
      <div className="py-8 pb-20">
        <h1 className="mb-2 text-[22px] font-bold text-black">입점 신청</h1>
        <p className="mb-6 text-[14px] text-gray-500">
          입점 유형에 따라 필요한 정보만 입력하시면 심사 후 승인 여부를 안내드립니다.
        </p>

        {existingProfile && existingProfile.status === "PENDING" && (
          <div className="mb-6 rounded-xl bg-blue-50 p-4">
            <p className="mb-1 text-[15px] font-bold text-blue-800">심사 중</p>
            <p className="text-[13px] text-blue-700">
              신청 내용을 수정하려면 아래 양식을 다시 제출해주세요.
            </p>
          </div>
        )}

        {existingProfile && existingProfile.status === "REJECTED" && (
          <div className="mb-6 rounded-xl bg-red-50 p-4">
            <p className="mb-1 text-[15px] font-bold text-red-800">반려됨</p>
            <p className="text-[13px] text-red-700">
              {existingProfile.rejectedReason ||
                "신청이 반려되었습니다. 내용을 수정 후 다시 제출해주세요."}
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <h2 className="mb-4 text-[16px] font-bold text-black">기본 정보</h2>

          <div className="mb-4">
            <label className="mb-2 block text-[14px] font-medium text-gray-700">
              입점 유형 <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {SELLER_KIND_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    updateField("sellerKind", option.value);
                    if (!formData.creatorSlug.trim() && option.value !== SellerKind.WHOLESALE_STORE) {
                      updateField(
                        "creatorSlug",
                        buildDefaultCreatorSlug(formData.shopName),
                      );
                    }
                  }}
                  className={`rounded-xl border px-4 py-3 text-left transition-colors ${
                    formData.sellerKind === option.value
                      ? "border-black bg-black text-white"
                      : "border-gray-200 bg-white text-gray-700"
                  }`}
                  disabled={submitting}
                >
                  <div className="text-[14px] font-semibold">{option.label}</div>
                  <div
                    className={`mt-1 text-[12px] ${
                      formData.sellerKind === option.value
                        ? "text-gray-200"
                        : "text-gray-500"
                    }`}
                  >
                    {option.description}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <label className="mb-2 block text-[14px] font-medium text-gray-700">
              상점명 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.shopName}
              onChange={(e) => {
                const nextShopName = e.target.value;
                updateField("shopName", nextShopName);
                if (!formData.storeSlug.trim()) {
                  updateField("storeSlug", buildDefaultStoreSlug(nextShopName));
                }
              }}
              onBlur={() => {
                if (!formData.storeSlug.trim()) {
                  updateField("storeSlug", buildDefaultStoreSlug(formData.shopName));
                }
                if (!formData.creatorSlug.trim() && showCreatorFields) {
                  updateField(
                    "creatorSlug",
                    buildDefaultCreatorSlug(formData.shopName),
                  );
                }
              }}
              placeholder="예: mikro closet"
              className="h-12 w-full rounded-xl border border-gray-200 px-4 text-[15px] focus:border-black focus:outline-none"
              disabled={submitting}
            />
            {inlineError("shopName")}
          </div>

          <div className="mb-4">
            <label className="mb-2 block text-[14px] font-medium text-gray-700">
              상점 URL <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.storeSlug}
              onChange={(e) =>
                updateField(
                  "storeSlug",
                  e.target.value
                    .toLowerCase()
                    .replace(/[^a-z0-9-_]+/g, "-")
                    .replace(/-{2,}/g, "-")
                    .replace(/^-+|-+$/g, ""),
                )
              }
              placeholder="예: mikrocloset"
              className="h-12 w-full rounded-xl border border-gray-200 px-4 text-[15px] focus:border-black focus:outline-none"
              disabled={submitting}
            />
            <p className="mt-1 text-[12px] text-gray-500">
              공개 상점 주소로 `www.mikrobrand.kr/{formData.storeSlug || "storename"}` 형태로 사용됩니다.
            </p>
            {inlineError("storeSlug")}
          </div>

          <div className="mb-4">
            <label className="mb-2 block text-[14px] font-medium text-gray-700">
              상점 유형 <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              {SHOP_TYPES.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => updateField("type", item)}
                  className={`rounded-xl border px-4 py-2.5 text-[14px] font-medium transition-colors ${
                    formData.type === item
                      ? "border-black bg-black text-white"
                      : "border-gray-200 bg-white text-gray-700"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
            {inlineError("type")}
          </div>

          {showCreatorFields && (
            <div className="mb-6 rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <h3 className="mb-3 text-[15px] font-bold text-black">
                크리에이터 / 캠페인 정보
              </h3>

              <div className="mb-4">
                <label className="mb-2 block text-[14px] font-medium text-gray-700">
                  크리에이터 슬러그 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.creatorSlug}
                  onChange={(e) =>
                    updateField(
                      "creatorSlug",
                      e.target.value
                        .toLowerCase()
                        .replace(/[^a-z0-9-_]+/g, "-")
                        .replace(/-{2,}/g, "-")
                        .replace(/^-+|-+$/g, ""),
                    )
                  }
                  placeholder="예: mikro-live"
                  className="h-12 w-full rounded-xl border border-gray-200 px-4 text-[15px] focus:border-black focus:outline-none"
                />
                <p className="mt-1 text-[12px] text-gray-500">
                  추후 공유 링크에 `?ref=슬러그` 형태로 사용됩니다.
                </p>
                {inlineError("creatorSlug")}
              </div>

              <div className="mb-4">
                <label className="mb-2 block text-[14px] font-medium text-gray-700">
                  대표 SNS 채널
                  {formData.sellerKind !== SellerKind.BRAND && (
                    <span className="text-red-500"> *</span>
                  )}
                </label>
                <select
                  value={formData.socialChannelType}
                  onChange={(e) =>
                    updateField(
                      "socialChannelType",
                      e.target.value as SocialChannelType | "",
                    )
                  }
                  className="h-12 w-full rounded-xl border border-gray-200 px-4 text-[15px] focus:border-black focus:outline-none"
                >
                  <option value="">선택해주세요</option>
                  {SOCIAL_CHANNEL_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {inlineError("socialChannelType")}
              </div>

              <div className="mb-4">
                <label className="mb-2 block text-[14px] font-medium text-gray-700">
                  대표 SNS URL
                  {formData.sellerKind !== SellerKind.BRAND && (
                    <span className="text-red-500"> *</span>
                  )}
                </label>
                <input
                  type="url"
                  value={formData.socialChannelUrl}
                  onChange={(e) => updateField("socialChannelUrl", e.target.value)}
                  placeholder="https://instagram.com/..."
                  className="h-12 w-full rounded-xl border border-gray-200 px-4 text-[15px] focus:border-black focus:outline-none"
                />
                {inlineError("socialChannelUrl")}
              </div>

              <div>
                <label className="mb-2 block text-[14px] font-medium text-gray-700">
                  팔로워 수 <span className="text-gray-400">(선택)</span>
                </label>
                <input
                  type="text"
                  value={formData.followerCount}
                  onChange={(e) =>
                    updateField(
                      "followerCount",
                      e.target.value.replace(/[^\d]/g, ""),
                    )
                  }
                  placeholder="예: 120000"
                  className="h-12 w-full rounded-xl border border-gray-200 px-4 text-[15px] focus:border-black focus:outline-none"
                />
                {inlineError("followerCount")}
              </div>
            </div>
          )}

          {showOfflineFields && (
            <div className="mb-6 rounded-2xl border border-gray-200 p-4">
              <h3 className="mb-3 text-[15px] font-bold text-black">
                오프라인 상가 정보
              </h3>

              <div className="mb-4">
                <label className="mb-2 block text-[14px] font-medium text-gray-700">
                  상가명 <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.marketBuilding}
                  onChange={(e) => {
                    updateField("marketBuilding", e.target.value);
                    if (e.target.value !== "기타") {
                      updateField("marketBuildingCustom", "");
                    }
                  }}
                  className="h-12 w-full rounded-xl border border-gray-200 px-4 text-[15px] focus:border-black focus:outline-none"
                >
                  <option value="">선택해주세요</option>
                  {MARKET_BUILDINGS.map((building) => (
                    <option key={building} value={building}>
                      {building}
                    </option>
                  ))}
                </select>
                {formData.marketBuilding === "기타" && (
                  <input
                    type="text"
                    value={formData.marketBuildingCustom}
                    onChange={(e) =>
                      updateField("marketBuildingCustom", e.target.value)
                    }
                    placeholder="상가명을 직접 입력해주세요"
                    className="mt-2 h-12 w-full rounded-xl border border-gray-200 px-4 text-[15px] focus:border-black focus:outline-none"
                  />
                )}
                {inlineError("marketBuilding")}
                {inlineError("marketBuildingCustom")}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-2 block text-[14px] font-medium text-gray-700">
                    층 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.floor}
                    onChange={(e) => updateField("floor", e.target.value)}
                    placeholder="예: 3"
                    className="h-12 w-full rounded-xl border border-gray-200 px-4 text-[15px] focus:border-black focus:outline-none"
                  />
                  {inlineError("floor")}
                </div>
                <div>
                  <label className="mb-2 block text-[14px] font-medium text-gray-700">
                    호수 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.roomNo}
                    onChange={(e) => updateField("roomNo", e.target.value)}
                    placeholder="예: 302"
                    className="h-12 w-full rounded-xl border border-gray-200 px-4 text-[15px] focus:border-black focus:outline-none"
                  />
                  {inlineError("roomNo")}
                </div>
              </div>
            </div>
          )}

          <div className="mb-4">
            <label className="mb-2 block text-[14px] font-medium text-gray-700">
              담당자 연락처 <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              value={formData.managerPhone}
              onChange={(e) => updateField("managerPhone", e.target.value)}
              placeholder="010-1234-5678"
              className="h-12 w-full rounded-xl border border-gray-200 px-4 text-[15px] focus:border-black focus:outline-none"
            />
            <p className="mt-1 text-[12px] text-gray-500">
              입점 심사 및 운영 연락을 위한 담당자 번호입니다.
            </p>
            {inlineError("managerPhone")}
          </div>

          <div className="mb-4">
            <label className="mb-2 block text-[14px] font-medium text-gray-700">
              정산 구분 <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => updateField("isBusinessSeller", true)}
                className={`rounded-xl border px-4 py-3 text-[14px] font-medium ${
                  formData.isBusinessSeller
                    ? "border-black bg-black text-white"
                    : "border-gray-200 bg-white text-gray-700"
                }`}
              >
                사업자 정산
              </button>
              <button
                type="button"
                onClick={() => updateField("isBusinessSeller", false)}
                className={`rounded-xl border px-4 py-3 text-[14px] font-medium ${
                  !formData.isBusinessSeller
                    ? "border-black bg-black text-white"
                    : "border-gray-200 bg-white text-gray-700"
                }`}
              >
                개인 정산
              </button>
            </div>
          </div>

          <div className="mb-4">
            <label className="mb-2 block text-[14px] font-medium text-gray-700">
              사업자등록번호 <span className="text-gray-400">(선택)</span>
            </label>
            <input
              type="text"
              value={formData.bizRegNo}
              onChange={(e) => updateField("bizRegNo", e.target.value)}
              placeholder="예: 123-45-67890"
              className="h-12 w-full rounded-xl border border-gray-200 px-4 text-[15px] focus:border-black focus:outline-none"
            />
            <p className="mt-1 text-[12px] text-gray-500">
              입점 심사 및 정산/세무 확인 용도로만 사용됩니다.
            </p>
          </div>

          <div className="mb-6">
            <label className="mb-2 block text-[14px] font-medium text-gray-700">
              사업자등록증 <span className="text-gray-400">(선택)</span>
            </label>
            {formData.bizLicenseImage ? (
              <div className="relative inline-block">
                <Image
                  src={formData.bizLicenseImage}
                  alt="사업자등록증"
                  width={200}
                  height={280}
                  className="rounded-xl border border-gray-200 object-cover"
                />
                <button
                  type="button"
                  onClick={() => updateField("bizLicenseImage", "")}
                  className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-black text-[12px] text-white"
                >
                  X
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading || submitting}
                className="flex h-32 w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 text-gray-400 transition-colors disabled:opacity-50"
              >
                {uploading ? (
                  <span className="text-[13px]">업로드 중...</span>
                ) : (
                  <>
                    <span className="mb-1 text-[24px]">+</span>
                    <span className="text-[13px]">사업자등록증 이미지 업로드</span>
                    <span className="mt-1 text-[11px]">JPG, PNG, WEBP (5MB 이하)</span>
                  </>
                )}
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleImageUpload}
              className="hidden"
            />
            {inlineError("bizLicenseImage")}
          </div>

          <div className="border-t border-gray-200 pt-6">
            <h2 className="mb-4 text-[16px] font-bold text-black">CS 정보</h2>

            <div className="mb-4">
              <label className="mb-2 block text-[14px] font-medium text-gray-700">
                CS 연락처 유형 <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                {CS_TYPES.map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => updateField("csType", type)}
                    className={`rounded-xl border px-4 py-2.5 text-[14px] font-medium transition-colors ${
                      formData.csType === type
                        ? "border-black bg-black text-white"
                        : "border-gray-200 bg-white text-gray-700"
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
              {inlineError("csType")}
            </div>

            <div className="mb-4">
              <label className="mb-2 block text-[14px] font-medium text-gray-700">
                CS 연락처 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.csContact}
                onChange={(e) => updateField("csContact", e.target.value)}
                placeholder={
                  formData.csType === "카카오톡ID"
                    ? "카카오톡 ID를 입력해주세요"
                    : formData.csType === "문자/전화"
                      ? "010-1234-5678"
                      : "contact@example.com"
                }
                className="h-12 w-full rounded-xl border border-gray-200 px-4 text-[15px] focus:border-black focus:outline-none"
              />
              {inlineError("csContact")}
            </div>

            <div className="mb-4">
              <label className="mb-2 block text-[14px] font-medium text-gray-700">
                CS 주소 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.csAddress}
                onChange={(e) => updateField("csAddress", e.target.value)}
                placeholder="교환/반품 수거지 주소를 입력해주세요"
                className="h-12 w-full rounded-xl border border-gray-200 px-4 text-[15px] focus:border-black focus:outline-none"
              />
              {inlineError("csAddress")}
            </div>

            <div className="mb-6">
              <label className="mb-2 block text-[14px] font-medium text-gray-700">
                상담 시간 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.csHours}
                onChange={(e) => updateField("csHours", e.target.value)}
                placeholder="예: 평일 10:00 ~ 18:00"
                className="h-12 w-full rounded-xl border border-gray-200 px-4 text-[15px] focus:border-black focus:outline-none"
              />
              {inlineError("csHours")}
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <h2 className="mb-4 text-[16px] font-bold text-black">
              배송 / 교환 / 환불
            </h2>

            <div className="mb-4">
              <label className="mb-2 block text-[14px] font-medium text-gray-700">
                배송 안내 <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.shippingInfo}
                onChange={(e) => updateField("shippingInfo", e.target.value)}
                placeholder="배송 소요 기간, 배송비 등을 안내해주세요"
                className="min-h-[100px] w-full rounded-xl border border-gray-200 px-4 py-3 text-[15px] focus:border-black focus:outline-none"
              />
              {inlineError("shippingInfo")}
            </div>

            <div className="mb-4">
              <label className="mb-2 block text-[14px] font-medium text-gray-700">
                교환/반품 안내 <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.exchangeInfo}
                onChange={(e) => updateField("exchangeInfo", e.target.value)}
                placeholder="교환/반품 조건 및 절차를 안내해주세요"
                className="min-h-[100px] w-full rounded-xl border border-gray-200 px-4 py-3 text-[15px] focus:border-black focus:outline-none"
              />
              {inlineError("exchangeInfo")}
            </div>

            <div className="mb-4">
              <label className="mb-2 block text-[14px] font-medium text-gray-700">
                환불 안내 <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.refundInfo}
                onChange={(e) => updateField("refundInfo", e.target.value)}
                placeholder="환불 조건 및 절차를 안내해주세요"
                className="min-h-[100px] w-full rounded-xl border border-gray-200 px-4 py-3 text-[15px] focus:border-black focus:outline-none"
              />
              {inlineError("refundInfo")}
            </div>

            <div className="mb-6">
              <label className="mb-2 block text-[14px] font-medium text-gray-700">
                기타 안내 <span className="text-gray-400">(선택)</span>
              </label>
              <textarea
                value={formData.etcInfo}
                onChange={(e) => updateField("etcInfo", e.target.value)}
                placeholder="추가로 안내할 사항이 있으면 입력해주세요"
                className="min-h-[80px] w-full rounded-xl border border-gray-200 px-4 py-3 text-[15px] focus:border-black focus:outline-none"
              />
            </div>
          </div>

          {errors._form && (
            <p className="mb-4 text-center text-[13px] text-red-500">
              {errors._form}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting || uploading}
            className="h-12 w-full rounded-xl bg-black text-[16px] font-bold text-white transition-colors disabled:opacity-50"
          >
            {submitting ? "제출 중..." : "신청하기"}
          </button>
        </form>
      </div>
    </Container>
  );
}
