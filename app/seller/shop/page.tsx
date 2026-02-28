"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

type ContactType = "kakao" | "phone" | "other";

export default function ShopManagePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // CS fields
  const [contactType, setContactType] = useState<ContactType>("phone");
  const [csPhone, setCsPhone] = useState("");
  const [csKakaoId, setCsKakaoId] = useState("");
  const [csEmail, setCsEmail] = useState("");
  const [csAddress, setCsAddress] = useState("");
  const [csHours, setCsHours] = useState("");

  // Shipping/exchange/refund fields
  const [shippingGuide, setShippingGuide] = useState("");
  const [exchangeGuide, setExchangeGuide] = useState("");
  const [refundGuide, setRefundGuide] = useState("");
  const [etcGuide, setEtcGuide] = useState("");

  useEffect(() => {
    fetch("/api/seller/profile")
      .then((res) => {
        if (!res.ok) throw new Error("프로필을 불러올 수 없습니다");
        return res.json();
      })
      .then((data) => {
        setCsPhone(data.csPhone ?? "");
        setCsKakaoId(data.csKakaoId ?? "");
        setCsEmail(data.csEmail ?? "");
        setCsAddress(data.csAddress ?? "");
        setCsHours(data.csHours ?? "");
        setShippingGuide(data.shippingGuide ?? "");
        setExchangeGuide(data.exchangeGuide ?? "");
        setRefundGuide(data.refundGuide ?? "");
        setEtcGuide(data.etcGuide ?? "");

        // Determine contact type from existing data
        if (data.csKakaoId) setContactType("kakao");
        else if (data.csPhone) setContactType("phone");
        else if (data.csEmail) setContactType("other");
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch("/api/seller/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          csPhone: csPhone.trim() || null,
          csKakaoId: csKakaoId.trim() || null,
          csEmail: csEmail.trim() || null,
          csAddress: csAddress.trim() || null,
          csHours: csHours.trim() || null,
          shippingGuide: shippingGuide.trim() || null,
          exchangeGuide: exchangeGuide.trim() || null,
          refundGuide: refundGuide.trim() || null,
          etcGuide: etcGuide.trim() || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "저장에 실패했습니다");
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장에 실패했습니다");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-4">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-24" />
          <div className="h-4 bg-gray-200 rounded w-48" />
          <div className="h-40 bg-gray-200 rounded-xl" />
          <div className="h-40 bg-gray-200 rounded-xl" />
        </div>
      </div>
    );
  }

  const contactTypes: { value: ContactType; label: string }[] = [
    { value: "kakao", label: "카카오톡ID" },
    { value: "phone", label: "문자/전화" },
    { value: "other", label: "기타" },
  ];

  const inputClass =
    "w-full px-3 py-2 rounded-lg border border-gray-200 text-[14px] focus:outline-none focus:border-black transition-colors";
  const textareaClass =
    "w-full px-3 py-2 rounded-lg border border-gray-200 text-[14px] placeholder:text-gray-400 focus:outline-none focus:border-black transition-colors resize-none";
  const labelClass = "block text-[13px] font-medium text-gray-700 mb-1";

  return (
    <div className="py-4">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-[20px] font-bold text-black">상점 관리</h1>
        <p className="text-[14px] text-gray-500 mt-1">
          CS 정보와 배송/교환/환불 안내를 관리합니다
        </p>
      </div>

      {/* Section 1: CS 정보 */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
        <h2 className="text-[15px] font-bold text-black mb-4">CS 정보</h2>

        {/* Contact type toggle */}
        <div className="mb-4">
          <label className={labelClass}>CS 연락처 유형</label>
          <div className="flex gap-2">
            {contactTypes.map((ct) => (
              <button
                key={ct.value}
                type="button"
                onClick={() => setContactType(ct.value)}
                className={`flex-1 py-2 rounded-lg text-[13px] font-medium transition-colors ${
                  contactType === ct.value
                    ? "bg-gray-900 text-white"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {ct.label}
              </button>
            ))}
          </div>
        </div>

        {/* Contact input based on type */}
        <div className="mb-3">
          <label className={labelClass}>
            {contactType === "kakao"
              ? "카카오톡 ID"
              : contactType === "phone"
                ? "전화번호"
                : "이메일"}
          </label>
          {contactType === "kakao" && (
            <input
              type="text"
              placeholder="카카오톡 ID를 입력하세요"
              value={csKakaoId}
              onChange={(e) => setCsKakaoId(e.target.value)}
              className={inputClass}
            />
          )}
          {contactType === "phone" && (
            <input
              type="text"
              placeholder="010-1234-5678"
              value={csPhone}
              onChange={(e) => setCsPhone(e.target.value)}
              className={inputClass}
            />
          )}
          {contactType === "other" && (
            <input
              type="email"
              placeholder="shop@example.com"
              value={csEmail}
              onChange={(e) => setCsEmail(e.target.value)}
              className={inputClass}
            />
          )}
        </div>

        {/* CS Address */}
        <div className="mb-3">
          <label className={labelClass}>CS 주소</label>
          <input
            type="text"
            placeholder="교환/반품 수거지 주소"
            value={csAddress}
            onChange={(e) => setCsAddress(e.target.value)}
            className={inputClass}
          />
        </div>

        {/* CS Hours */}
        <div>
          <label className={labelClass}>상담 시간</label>
          <input
            type="text"
            placeholder="평일 10:00 ~ 18:00"
            value={csHours}
            onChange={(e) => setCsHours(e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      {/* Section 2: 배송/교환/환불 */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
        <h2 className="text-[15px] font-bold text-black mb-4">
          배송 / 교환 / 환불 안내
        </h2>

        <div className="space-y-3">
          <div>
            <label className={labelClass}>배송 안내</label>
            <textarea
              placeholder="배송 소요일, 택배사, 발송일 등"
              value={shippingGuide}
              onChange={(e) => setShippingGuide(e.target.value)}
              rows={3}
              className={textareaClass}
            />
          </div>

          <div>
            <label className={labelClass}>교환/반품 안내</label>
            <textarea
              placeholder="교환/반품 조건, 절차, 기한 등"
              value={exchangeGuide}
              onChange={(e) => setExchangeGuide(e.target.value)}
              rows={3}
              className={textareaClass}
            />
          </div>

          <div>
            <label className={labelClass}>환불 안내</label>
            <textarea
              placeholder="환불 조건, 소요 기간 등"
              value={refundGuide}
              onChange={(e) => setRefundGuide(e.target.value)}
              rows={3}
              className={textareaClass}
            />
          </div>

          <div>
            <label className={labelClass}>기타 안내 (선택)</label>
            <textarea
              placeholder="추가 안내사항"
              value={etcGuide}
              onChange={(e) => setEtcGuide(e.target.value)}
              rows={2}
              className={textareaClass}
            />
          </div>
        </div>
      </div>

      {/* Error / Success messages */}
      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 rounded-xl text-[14px] text-red-600">
          {error}
        </div>
      )}
      {success && (
        <p className="mb-4 text-[13px] text-green-600">저장되었습니다</p>
      )}

      {/* Save button */}
      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="w-full h-12 bg-black text-white rounded-xl text-[16px] font-bold active:bg-gray-800 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
      >
        {saving ? "저장 중..." : "저장"}
      </button>
    </div>
  );
}
