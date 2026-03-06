"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Container from "@/components/Container";

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

const CS_TYPES = ["카카오톡ID", "문자/전화", "기타"];

interface FormErrors {
  [key: string]: string;
}

export default function SellerApplyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [existingProfile, setExistingProfile] = useState<any>(null);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const [formData, setFormData] = useState({
    shopName: "",
    bizRegNo: "",
    bizLicenseImage: "",
    type: "",
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
  });

  useEffect(() => {
    checkExistingProfile();
  }, []);

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
        // Determine csType and csContact from existing data
        let csType = "";
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

        // Determine marketBuilding
        const isPreset = MARKET_BUILDINGS.slice(0, -1).includes(
          p.marketBuilding || ""
        );
        setFormData({
          shopName: p.shopName || "",
          bizRegNo: p.bizRegNo || "",
          bizLicenseImage: p.bizRegImageUrl || "",
          type: p.type || "",
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
        });
      }
    } catch (error) {
      console.error("Error checking profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
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

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.shopName.trim())
      newErrors.shopName = "상점명을 입력해주세요.";
    if (!formData.type) newErrors.type = "상점 유형을 선택해주세요.";
    if (!formData.marketBuilding)
      newErrors.marketBuilding = "상가명을 선택해주세요.";
    if (
      formData.marketBuilding === "기타" &&
      !formData.marketBuildingCustom.trim()
    )
      newErrors.marketBuildingCustom = "상가명을 직접 입력해주세요.";
    if (!formData.floor.trim()) newErrors.floor = "층을 입력해주세요.";
    if (!formData.roomNo.trim()) newErrors.roomNo = "호수를 입력해주세요.";
    if (!formData.managerPhone.trim())
      newErrors.managerPhone = "담당자 연락처를 입력해주세요.";
    if (!formData.csType) newErrors.csType = "CS 연락처 유형을 선택해주세요.";
    if (!formData.csContact.trim())
      newErrors.csContact = "CS 연락처를 입력해주세요.";
    if (!formData.csAddress.trim())
      newErrors.csAddress = "CS 주소를 입력해주세요.";
    if (!formData.csHours.trim())
      newErrors.csHours = "상담 시간을 입력해주세요.";
    if (!formData.shippingInfo.trim())
      newErrors.shippingInfo = "배송 안내를 입력해주세요.";
    if (!formData.exchangeInfo.trim())
      newErrors.exchangeInfo = "교환/반품 안내를 입력해주세요.";
    if (!formData.refundInfo.trim())
      newErrors.refundInfo = "환불 안내를 입력해주세요.";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);

    const resolvedMarketBuilding =
      formData.marketBuilding === "기타"
        ? formData.marketBuildingCustom.trim()
        : formData.marketBuilding;

    // Build CS fields based on csType
    let csKakaoId: string | null = null;
    let csPhone: string | null = null;
    let csEmail: string | null = null;

    if (formData.csType === "카카오톡ID") {
      csKakaoId = formData.csContact.trim();
    } else if (formData.csType === "문자/전화") {
      csPhone = formData.csContact.trim();
    } else {
      csEmail = formData.csContact.trim();
    }

    try {
      const res = await fetch("/api/seller/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shopName: formData.shopName.trim(),
          bizRegNo: formData.bizRegNo.trim() || null,
          type: formData.type,
          marketBuilding: resolvedMarketBuilding,
          floor: formData.floor.trim(),
          roomNo: formData.roomNo.trim(),
          managerPhone: formData.managerPhone.trim(),
          bizRegImageUrl: formData.bizLicenseImage,
          csKakaoId,
          csPhone,
          csEmail,
          csAddress: formData.csAddress.trim(),
          csHours: formData.csHours.trim(),
          shippingGuide: formData.shippingInfo.trim(),
          exchangeGuide: formData.exchangeInfo.trim(),
          refundGuide: formData.refundInfo.trim(),
          etcGuide: formData.etcInfo.trim() || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrors({ _form: data.error || "신청에 실패했습니다." });
        setSubmitting(false);
        return;
      }

      router.push("/my");
    } catch {
      setErrors({ _form: "신청 중 오류가 발생했습니다." });
      setSubmitting(false);
    }
  };

  // Full-screen loading (prevents auth flash)
  if (loading) {
    return (
      <Container>
        <div className="py-20 text-center text-gray-400 text-sm">
          로딩 중...
        </div>
      </Container>
    );
  }

  // ADMIN cannot apply
  if (isAdminUser) {
    return (
      <Container>
        <div className="py-8">
          <h1 className="text-[22px] font-bold text-black mb-4">
            판매자 가입 신청
          </h1>
          <div className="p-6 bg-gray-50 rounded-xl text-center">
            <p className="text-[15px] font-medium text-gray-800 mb-2">
              관리자 계정 안내
            </p>
            <p className="text-[13px] text-gray-600">
              관리자 계정은 판매자 신청이 불가합니다.
              <br />
              일반 계정으로 로그인 후 신청해주세요.
            </p>
          </div>
        </div>
      </Container>
    );
  }

  // Approved → redirect to seller center
  if (existingProfile && existingProfile.status === "APPROVED") {
    return (
      <Container>
        <div className="py-8">
          <h1 className="text-[22px] font-bold text-black mb-4">
            판매자 가입 신청
          </h1>
          <div className="p-6 bg-green-50 rounded-xl text-center">
            <p className="text-[18px] font-bold text-green-800 mb-2">
              승인 완료
            </p>
            <p className="text-[14px] text-green-700 mb-4">
              판매자로 승인되었습니다.
            </p>
            <button
              onClick={() => router.push("/seller")}
              className="px-6 py-2 bg-black text-white rounded-lg text-[14px] font-medium"
            >
              판매자 센터로 이동
            </button>
          </div>
        </div>
      </Container>
    );
  }

  const inlineError = (field: string) =>
    errors[field] ? (
      <p className="mt-1 text-[12px] text-red-500">{errors[field]}</p>
    ) : null;

  return (
    <Container>
      <div className="py-8 pb-20">
        <h1 className="text-[22px] font-bold text-black mb-2">
          판매자 가입 신청
        </h1>
        <p className="text-[14px] text-gray-500 mb-6">
          판매자 정보를 입력하시면 심사 후 승인 여부를 안내드립니다.
        </p>

        {/* PENDING status banner */}
        {existingProfile && existingProfile.status === "PENDING" && (
          <div className="p-4 bg-blue-50 rounded-xl mb-6">
            <p className="text-[15px] font-bold text-blue-800 mb-1">
              심사 중
            </p>
            <p className="text-[13px] text-blue-700">
              판매자 승인 심사가 진행 중입니다. 신청 내용을 수정하려면 아래
              양식을 다시 제출해주세요.
            </p>
          </div>
        )}

        {/* REJECTED status banner */}
        {existingProfile && existingProfile.status === "REJECTED" && (
          <div className="p-4 bg-red-50 rounded-xl mb-6">
            <p className="text-[15px] font-bold text-red-800 mb-1">
              반려됨
            </p>
            <p className="text-[13px] text-red-700">
              {existingProfile.rejectedReason ||
                "신청이 반려되었습니다. 내용을 수정 후 다시 제출해주세요."}
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* ── Section 1: 기본 정보 ── */}
          <h2 className="text-[16px] font-bold text-black mb-4">기본 정보</h2>

          {/* 상점명 */}
          <div className="mb-4">
            <label className="block text-[14px] font-medium text-gray-700 mb-2">
              상점명 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.shopName}
              onChange={(e) => updateField("shopName", e.target.value)}
              placeholder="예: 동대문 의류도매"
              className="w-full h-12 px-4 rounded-xl border border-gray-200 text-[15px] focus:outline-none focus:border-black transition-colors"
              disabled={submitting}
            />
            {inlineError("shopName")}
          </div>

          {/* 사업자등록번호 */}
          <div className="mb-4">
            <label className="block text-[14px] font-medium text-gray-700 mb-2">
              사업자등록번호 <span className="text-gray-400">(선택)</span>
            </label>
            <input
              type="text"
              value={formData.bizRegNo}
              onChange={(e) => updateField("bizRegNo", e.target.value)}
              placeholder="예: 123-45-67890"
              className="w-full h-12 px-4 rounded-xl border border-gray-200 text-[15px] focus:outline-none focus:border-black transition-colors"
              disabled={submitting}
            />
            <p className="mt-1 text-[12px] text-gray-500">
              입점 심사 및 정산/세무 확인 용도로만 사용됩니다.
            </p>
          </div>

          {/* 사업자등록증 */}
          <div className="mb-4">
            <label className="block text-[14px] font-medium text-gray-700 mb-2">
              사업자등록증 <span className="text-gray-400">(선택)</span>
            </label>
            {formData.bizLicenseImage ? (
              <div className="relative inline-block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={formData.bizLicenseImage}
                  alt="사업자등록증"
                  width={200}
                  height={280}
                  className="rounded-xl border border-gray-200 object-cover"
                />
                <button
                  type="button"
                  onClick={() => updateField("bizLicenseImage", "")}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-black text-white rounded-full flex items-center justify-center text-[12px]"
                  disabled={submitting}
                >
                  X
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading || submitting}
                className="w-full h-32 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center text-gray-400 hover:border-gray-400 transition-colors disabled:opacity-50"
              >
                {uploading ? (
                  <span className="text-[13px]">업로드 중...</span>
                ) : (
                  <>
                    <span className="text-[24px] mb-1">+</span>
                    <span className="text-[13px]">
                      사업자등록증 이미지 업로드
                    </span>
                    <span className="text-[11px] mt-1">
                      JPG, PNG, WEBP (5MB 이하)
                    </span>
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

          {/* 상점 유형 */}
          <div className="mb-4">
            <label className="block text-[14px] font-medium text-gray-700 mb-2">
              상점 유형 <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              {SHOP_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => updateField("type", t)}
                  disabled={submitting}
                  className={`px-4 py-2.5 rounded-xl border text-[14px] font-medium transition-colors ${
                    formData.type === t
                      ? "bg-black text-white border-black"
                      : "bg-white text-gray-700 border-gray-200"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            {inlineError("type")}
          </div>

          {/* 상가명 */}
          <div className="mb-4">
            <label className="block text-[14px] font-medium text-gray-700 mb-2">
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
              className="w-full h-12 px-4 rounded-xl border border-gray-200 text-[15px] focus:outline-none focus:border-black transition-colors"
              disabled={submitting}
            >
              <option value="">선택해주세요</option>
              {MARKET_BUILDINGS.map((b) => (
                <option key={b} value={b}>
                  {b}
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
                className="w-full h-12 px-4 mt-2 rounded-xl border border-gray-200 text-[15px] focus:outline-none focus:border-black transition-colors"
                disabled={submitting}
              />
            )}
            {inlineError("marketBuilding")}
            {inlineError("marketBuildingCustom")}
          </div>

          {/* 층 / 호수 */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="block text-[14px] font-medium text-gray-700 mb-2">
                층 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.floor}
                onChange={(e) => updateField("floor", e.target.value)}
                placeholder="예: 3"
                className="w-full h-12 px-4 rounded-xl border border-gray-200 text-[15px] focus:outline-none focus:border-black transition-colors"
                disabled={submitting}
              />
              {inlineError("floor")}
            </div>
            <div>
              <label className="block text-[14px] font-medium text-gray-700 mb-2">
                호수 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.roomNo}
                onChange={(e) => updateField("roomNo", e.target.value)}
                placeholder="예: 302"
                className="w-full h-12 px-4 rounded-xl border border-gray-200 text-[15px] focus:outline-none focus:border-black transition-colors"
                disabled={submitting}
              />
              {inlineError("roomNo")}
            </div>
          </div>

          {/* 담당자 연락처 */}
          <div className="mb-6">
            <label className="block text-[14px] font-medium text-gray-700 mb-2">
              담당자 연락처 <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              value={formData.managerPhone}
              onChange={(e) => updateField("managerPhone", e.target.value)}
              placeholder="010-1234-5678"
              className="w-full h-12 px-4 rounded-xl border border-gray-200 text-[15px] focus:outline-none focus:border-black transition-colors"
              disabled={submitting}
            />
            <p className="mt-1 text-[12px] text-gray-500">
              입점 심사 및 연락을 위한 담당자 전화번호입니다.
            </p>
            {inlineError("managerPhone")}
          </div>

          {/* ── Section 2: CS 정보 ── */}
          <div className="border-t border-gray-200 pt-6 mb-6">
            <h2 className="text-[16px] font-bold text-black mb-4">CS 정보</h2>

            {/* CS 연락처 유형 */}
            <div className="mb-4">
              <label className="block text-[14px] font-medium text-gray-700 mb-2">
                CS 연락처 유형 <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                {CS_TYPES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => updateField("csType", t)}
                    disabled={submitting}
                    className={`px-4 py-2.5 rounded-xl border text-[14px] font-medium transition-colors ${
                      formData.csType === t
                        ? "bg-black text-white border-black"
                        : "bg-white text-gray-700 border-gray-200"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
              {inlineError("csType")}
            </div>

            {/* CS 연락처 */}
            <div className="mb-4">
              <label className="block text-[14px] font-medium text-gray-700 mb-2">
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
                      : "연락처를 입력해주세요"
                }
                className="w-full h-12 px-4 rounded-xl border border-gray-200 text-[15px] focus:outline-none focus:border-black transition-colors"
                disabled={submitting}
              />
              {inlineError("csContact")}
            </div>

            {/* CS 주소 */}
            <div className="mb-4">
              <label className="block text-[14px] font-medium text-gray-700 mb-2">
                CS 주소 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.csAddress}
                onChange={(e) => updateField("csAddress", e.target.value)}
                placeholder="교환/반품 수거지 주소를 입력해주세요"
                className="w-full h-12 px-4 rounded-xl border border-gray-200 text-[15px] focus:outline-none focus:border-black transition-colors"
                disabled={submitting}
              />
              {inlineError("csAddress")}
            </div>

            {/* 상담 시간 */}
            <div>
              <label className="block text-[14px] font-medium text-gray-700 mb-2">
                상담 시간 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.csHours}
                onChange={(e) => updateField("csHours", e.target.value)}
                placeholder="예: 평일 10:00 ~ 18:00"
                className="w-full h-12 px-4 rounded-xl border border-gray-200 text-[15px] focus:outline-none focus:border-black transition-colors"
                disabled={submitting}
              />
              {inlineError("csHours")}
            </div>
          </div>

          {/* ── Section 3: 배송/교환/환불 ── */}
          <div className="border-t border-gray-200 pt-6 mb-6">
            <h2 className="text-[16px] font-bold text-black mb-4">
              배송 / 교환 / 환불
            </h2>

            {/* 배송 안내 */}
            <div className="mb-4">
              <label className="block text-[14px] font-medium text-gray-700 mb-2">
                배송 안내 <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.shippingInfo}
                onChange={(e) => updateField("shippingInfo", e.target.value)}
                placeholder="배송 소요 기간, 배송비 등을 안내해주세요"
                className="w-full min-h-[100px] px-4 py-3 rounded-xl border border-gray-200 text-[15px] focus:outline-none focus:border-black transition-colors resize-y"
                disabled={submitting}
              />
              {inlineError("shippingInfo")}
            </div>

            {/* 교환/반품 안내 */}
            <div className="mb-4">
              <label className="block text-[14px] font-medium text-gray-700 mb-2">
                교환/반품 안내 <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.exchangeInfo}
                onChange={(e) => updateField("exchangeInfo", e.target.value)}
                placeholder="교환/반품 조건 및 절차를 안내해주세요"
                className="w-full min-h-[100px] px-4 py-3 rounded-xl border border-gray-200 text-[15px] focus:outline-none focus:border-black transition-colors resize-y"
                disabled={submitting}
              />
              {inlineError("exchangeInfo")}
            </div>

            {/* 환불 안내 */}
            <div className="mb-4">
              <label className="block text-[14px] font-medium text-gray-700 mb-2">
                환불 안내 <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.refundInfo}
                onChange={(e) => updateField("refundInfo", e.target.value)}
                placeholder="환불 조건 및 절차를 안내해주세요"
                className="w-full min-h-[100px] px-4 py-3 rounded-xl border border-gray-200 text-[15px] focus:outline-none focus:border-black transition-colors resize-y"
                disabled={submitting}
              />
              {inlineError("refundInfo")}
            </div>

            {/* 기타 안내 */}
            <div>
              <label className="block text-[14px] font-medium text-gray-700 mb-2">
                기타 안내 <span className="text-gray-400">(선택)</span>
              </label>
              <textarea
                value={formData.etcInfo}
                onChange={(e) => updateField("etcInfo", e.target.value)}
                placeholder="추가로 안내할 사항이 있으면 입력해주세요"
                className="w-full min-h-[80px] px-4 py-3 rounded-xl border border-gray-200 text-[15px] focus:outline-none focus:border-black transition-colors resize-y"
                disabled={submitting}
              />
            </div>
          </div>

          {/* Form error */}
          {errors._form && (
            <p className="text-[13px] text-red-500 text-center mb-4">
              {errors._form}
            </p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting || uploading}
            className="w-full h-12 bg-black text-white rounded-xl text-[16px] font-bold active:bg-gray-800 transition-colors disabled:opacity-50"
          >
            {submitting ? "제출 중..." : "신청하기"}
          </button>
        </form>
      </div>
    </Container>
  );
}
