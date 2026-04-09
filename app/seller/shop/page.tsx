"use client";

import { useState, useEffect } from "react";
import { SellerKind, SocialChannelType } from "@prisma/client";
import SellerDocumentUploadField from "@/components/seller/SellerDocumentUploadField";
import {
  buildDefaultStoreSlug,
  SELLER_KIND_OPTIONS,
  SOCIAL_CHANNEL_OPTIONS,
  buildDefaultCreatorSlug,
  isReservedStoreSlug,
  isOfflineSellerKind,
  needsCreatorProfile,
  normalizeVisibleSellerKind,
} from "@/lib/sellerTypes";

type ContactType = "kakao" | "phone" | "other";

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

export default function ShopManagePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingField, setUploadingField] = useState<
    "bizRegImageUrl" | "mailOrderReportImageUrl" | "passbookImageUrl" | null
  >(null);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingReview, setPendingReview] = useState(false);

  // Basic profile
  const [shopName, setShopName] = useState("");
  const [storeSlug, setStoreSlug] = useState("");
  const [originalStoreSlug, setOriginalStoreSlug] = useState("");
  const [bio, setBio] = useState("");
  const [locationText, setLocationText] = useState("");
  const [sellerKind, setSellerKind] = useState<SellerKind>(SellerKind.BRAND);

  // Seller apply fields (editable)
  const [shopType, setShopType] = useState("");
  const [marketBuilding, setMarketBuilding] = useState("");
  const [marketBuildingCustom, setMarketBuildingCustom] = useState("");
  const [floor, setFloor] = useState("");
  const [roomNo, setRoomNo] = useState("");
  const [managerPhone, setManagerPhone] = useState("");
  const [bizRegNo, setBizRegNo] = useState("");
  const [bizRegImageUrl, setBizRegImageUrl] = useState("");
  const [mailOrderReportImageUrl, setMailOrderReportImageUrl] = useState("");
  const [passbookImageUrl, setPassbookImageUrl] = useState("");
  const [instagramHandle, setInstagramHandle] = useState("");
  const [creatorSlug, setCreatorSlug] = useState("");
  const [socialChannelType, setSocialChannelType] = useState<SocialChannelType | "">("");
  const [socialChannelUrl, setSocialChannelUrl] = useState("");
  const [followerCount, setFollowerCount] = useState("");
  const isBusinessSeller = true;
  const [commissionRateBps, setCommissionRateBps] = useState("1200");

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

  // Settlement fields
  const [settlementBank, setSettlementBank] = useState("");
  const [settlementAccountNo, setSettlementAccountNo] = useState("");
  const [settlementAccountHolder, setSettlementAccountHolder] = useState("");

  const formatBizRegNo = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 10);
    if (digits.length <= 3) return digits;
    if (digits.length <= 5) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
  };

  const getResolvedMarketBuilding = () =>
    marketBuilding === "기타" ? marketBuildingCustom.trim() : marketBuilding;
  const showOfflineFields = isOfflineSellerKind(sellerKind);
  const showCreatorFields = needsCreatorProfile(sellerKind);

  useEffect(() => {
    fetch("/api/seller/profile")
      .then((res) => {
        if (!res.ok) throw new Error("프로필을 불러올 수 없습니다");
        return res.json();
      })
      .then((data) => {
        setShopName(data.shopName ?? "");
        setStoreSlug(data.storeSlug ?? buildDefaultStoreSlug(data.shopName ?? ""));
        setOriginalStoreSlug(data.storeSlug ?? buildDefaultStoreSlug(data.shopName ?? ""));
        setBio(data.bio ?? "");
        setLocationText(data.locationText ?? "");
        setSellerKind(normalizeVisibleSellerKind(data.sellerKind));
        setShopType(data.type ?? "");

        const isPreset = MARKET_BUILDINGS.slice(0, -1).includes(data.marketBuilding ?? "");
        setMarketBuilding(isPreset ? data.marketBuilding ?? "" : data.marketBuilding ? "기타" : "");
        setMarketBuildingCustom(isPreset ? "" : data.marketBuilding ?? "");
        setFloor(data.floor ?? "");
        setRoomNo(data.roomNo ?? "");
        setManagerPhone(data.managerPhone ?? "");
        setBizRegNo(data.bizRegNo ?? "");
        setBizRegImageUrl(data.bizRegImageUrl ?? "");
        setMailOrderReportImageUrl(data.mailOrderReportImageUrl ?? "");
        setPassbookImageUrl(data.passbookImageUrl ?? "");
        setInstagramHandle(data.instagramHandle ?? "");
        setCreatorSlug(
          data.creatorSlug ?? buildDefaultCreatorSlug(data.shopName ?? "")
        );
        setSocialChannelType(data.socialChannelType ?? "");
        setSocialChannelUrl(data.socialChannelUrl ?? "");
        setFollowerCount(
          data.followerCount != null ? String(data.followerCount) : ""
        );
        setCommissionRateBps(
          data.commissionRateBps != null ? String(data.commissionRateBps) : "1200"
        );

        setCsPhone(data.csPhone ?? "");
        setCsKakaoId(data.csKakaoId ?? "");
        setCsEmail(data.csEmail ?? "");
        setCsAddress(data.csAddress ?? "");
        setCsHours(data.csHours ?? "");
        setShippingGuide(data.shippingGuide ?? "");
        setExchangeGuide(data.exchangeGuide ?? "");
        setRefundGuide(data.refundGuide ?? "");
        setEtcGuide(data.etcGuide ?? "");
        setSettlementBank(data.settlementBank ?? "");
        setSettlementAccountNo(data.settlementAccountNo ?? "");
        setSettlementAccountHolder(data.settlementAccountHolder ?? "");
        setPendingReview(Boolean(data.complianceReviewPending));

        // Determine contact type from existing data
        if (data.csKakaoId) setContactType("kakao");
        else if (data.csPhone) setContactType("phone");
        else if (data.csEmail) setContactType("other");
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleDocumentUpload = async (
    field: "bizRegImageUrl" | "mailOrderReportImageUrl" | "passbookImageUrl",
    endpoint: string,
    file: File,
  ) => {
    setUploadingField(field);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(endpoint, {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "업로드에 실패했습니다");
      if (field === "bizRegImageUrl") setBizRegImageUrl(data.url);
      if (field === "mailOrderReportImageUrl") setMailOrderReportImageUrl(data.url);
      if (field === "passbookImageUrl") setPassbookImageUrl(data.url);
      setPendingReview(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "업로드에 실패했습니다");
    } finally {
      setUploadingField(null);
    }
  };

  const handleSave = async () => {
    if (!shopName.trim()) {
      setError("상점명을 입력해주세요");
      return;
    }
    if (!storeSlug.trim()) {
      setError("상점 URL을 입력해주세요");
      return;
    }
    if (!/^[a-z0-9][a-z0-9-_]{1,39}$/.test(storeSlug.trim())) {
      setError("상점 URL 형식을 확인해주세요");
      return;
    }
    if (isReservedStoreSlug(storeSlug.trim())) {
      setError("사용할 수 없는 상점 URL입니다");
      return;
    }
    if (!shopType.trim()) {
      setError("상점 유형을 선택해주세요");
      return;
    }
    if (showOfflineFields && !getResolvedMarketBuilding()) {
      setError("상가명을 입력해주세요");
      return;
    }
    if (showOfflineFields && (!floor.trim() || !roomNo.trim())) {
      setError("층/호수를 입력해주세요");
      return;
    }
    if (!managerPhone.trim()) {
      setError("담당자 연락처를 입력해주세요");
      return;
    }
    if (showCreatorFields && !creatorSlug.trim()) {
      setError("크리에이터 슬러그를 입력해주세요");
      return;
    }
    if (
      showCreatorFields &&
      !/^[a-z0-9][a-z0-9-_]{1,39}$/.test(creatorSlug.trim())
    ) {
      setError("크리에이터 슬러그 형식을 확인해주세요");
      return;
    }
    if (
      sellerKind === SellerKind.INFLUENCER &&
      (!socialChannelType || !socialChannelUrl.trim())
    ) {
      setError("대표 SNS 채널 정보를 입력해주세요");
      return;
    }
    if (socialChannelUrl.trim() && !/^https?:\/\//.test(socialChannelUrl.trim())) {
      setError("대표 SNS 채널 URL은 http 또는 https로 시작해야 합니다");
      return;
    }
    if (followerCount.trim() && !/^\d+$/.test(followerCount.trim())) {
      setError("팔로워 수는 숫자로 입력해주세요");
      return;
    }
    if (!commissionRateBps.trim() || !/^\d+$/.test(commissionRateBps.trim())) {
      setError("기본 수수료율은 숫자로 입력해주세요");
      return;
    }

    const hasAnySettlement =
      settlementBank.trim() || settlementAccountNo.trim() || settlementAccountHolder.trim();
    if (
      hasAnySettlement &&
      (!settlementBank.trim() || !settlementAccountNo.trim() || !settlementAccountHolder.trim())
    ) {
      setError("정산 계좌 정보는 은행/계좌번호/예금주를 모두 입력해주세요");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const nextStoreSlug = storeSlug.trim();
      if (
        originalStoreSlug &&
        nextStoreSlug !== originalStoreSlug &&
        !window.confirm(
          "상점 URL을 변경하시겠습니까?\n\n기존 링크로 들어온 방문자는 새 주소로 자동 이동됩니다.",
        )
      ) {
        setSaving(false);
        return;
      }

      let csKakaoIdValue: string | null = null;
      let csPhoneValue: string | null = null;
      let csEmailValue: string | null = null;

      if (contactType === "kakao") csKakaoIdValue = csKakaoId.trim() || null;
      if (contactType === "phone") csPhoneValue = csPhone.trim() || null;
      if (contactType === "other") csEmailValue = csEmail.trim() || null;

      const res = await fetch("/api/seller/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shopName: shopName.trim(),
          storeSlug: storeSlug.trim(),
          bio: bio.trim() || null,
          locationText: locationText.trim() || null,
          sellerKind,
          type: shopType.trim(),
          marketBuilding: showOfflineFields ? getResolvedMarketBuilding() || null : null,
          floor: showOfflineFields ? floor.trim() || null : null,
          roomNo: showOfflineFields ? roomNo.trim() || null : null,
          managerPhone: managerPhone.trim() || null,
          bizRegNo: formatBizRegNo(bizRegNo.trim()) || null,
          bizRegImageUrl: bizRegImageUrl || null,
          mailOrderReportImageUrl: mailOrderReportImageUrl || null,
          passbookImageUrl: passbookImageUrl || null,
          instagramHandle: instagramHandle.trim() || null,
          creatorSlug: showCreatorFields ? creatorSlug.trim() : null,
          socialChannelType: socialChannelType || null,
          socialChannelUrl: socialChannelUrl.trim() || null,
          followerCount: followerCount.trim() ? Number(followerCount.trim()) : null,
          isBusinessSeller,
          commissionRateBps: Number(commissionRateBps.trim()),
          csPhone: csPhoneValue,
          csKakaoId: csKakaoIdValue,
          csEmail: csEmailValue,
          csAddress: csAddress.trim() || null,
          csHours: csHours.trim() || null,
          shippingGuide: shippingGuide.trim() || null,
          exchangeGuide: exchangeGuide.trim() || null,
          refundGuide: refundGuide.trim() || null,
          etcGuide: etcGuide.trim() || null,
          settlementBank: settlementBank.trim() || null,
          settlementAccountNo: settlementAccountNo.trim() || null,
          settlementAccountHolder: settlementAccountHolder.trim() || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "저장에 실패했습니다");
      }

      const updated = await res.json();
      setOriginalStoreSlug(updated.storeSlug ?? nextStoreSlug);
      setPendingReview(Boolean(updated.complianceReviewPending));
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
  const selectClass =
    "w-full h-10 px-3 rounded-lg border border-gray-200 text-[14px] focus:outline-none focus:border-black transition-colors";
  const textareaClass =
    "w-full px-3 py-2 rounded-lg border border-gray-200 text-[14px] placeholder:text-gray-400 focus:outline-none focus:border-black transition-colors resize-none";
  const labelClass = "block text-[13px] font-medium text-gray-700 mb-1";

  return (
    <div className="py-4">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-[20px] font-bold text-black">상점 설정</h1>
        <p className="text-[14px] text-gray-500 mt-1">
          가입 정보, 공동구매 정보, CS/배송 정보, 정산 계좌를 통합 관리합니다
        </p>
      </div>

      {pendingReview && (
        <div className="mb-4 px-4 py-3 bg-amber-50 rounded-xl text-[13px] text-amber-800">
          사업자/정산 정보 변경사항이 있어 운영 검토가 필요합니다.
        </div>
      )}

      {/* Section 1: 기본/입점 정보 */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
        <h2 className="text-[15px] font-bold text-black mb-4">기본 · 입점 정보</h2>

        <div className="mb-4">
          <label className={labelClass}>입점 유형</label>
          <div className="grid grid-cols-2 gap-2">
            {SELLER_KIND_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  setSellerKind(option.value);
                  if (!creatorSlug.trim()) {
                    setCreatorSlug(buildDefaultCreatorSlug(shopName));
                  }
                }}
                className={`rounded-lg border px-3 py-3 text-left transition-colors ${
                  sellerKind === option.value
                    ? "border-black bg-gray-900 text-white"
                    : "border-gray-200 bg-white text-gray-700"
                }`}
              >
                <div className="text-[13px] font-semibold">{option.label}</div>
                <div
                  className={`mt-1 text-[12px] ${
                    sellerKind === option.value ? "text-gray-300" : "text-gray-500"
                  }`}
                >
                  {option.description}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="mb-3">
          <label className={labelClass}>상점명</label>
          <input
            type="text"
            value={shopName}
            onChange={(e) => {
              const nextShopName = e.target.value;
              setShopName(nextShopName);
              if (!storeSlug.trim()) {
                setStoreSlug(buildDefaultStoreSlug(nextShopName));
              }
            }}
            maxLength={30}
            className={inputClass}
            placeholder="상점명"
          />
        </div>

        <div className="mb-3">
          <label className={labelClass}>상점 URL</label>
          <input
            type="text"
            value={storeSlug}
            onChange={(e) =>
              setStoreSlug(
                e.target.value
                  .toLowerCase()
                  .replace(/[^a-z0-9-_]+/g, "-")
                  .replace(/-{2,}/g, "-")
                  .replace(/^-+|-+$/g, ""),
              )
            }
            className={inputClass}
            placeholder="예: mikrocloset"
          />
          <p className="mt-1 text-[12px] text-gray-500">
            공개 상점 주소로 `www.mikrobrand.kr/{storeSlug || "storename"}` 형태로 사용됩니다.
          </p>
        </div>

        <div className="mb-3">
          <label className={labelClass}>소개</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={160}
            rows={3}
            className={textareaClass}
            placeholder="상점 소개"
          />
        </div>

        <div className="mb-3">
          <label className={labelClass}>위치 텍스트</label>
          <input
            type="text"
            value={locationText}
            onChange={(e) => setLocationText(e.target.value)}
            maxLength={60}
            className={inputClass}
            placeholder="예: 쇼룸 · 3층 · 101"
          />
        </div>

        {showCreatorFields && (
          <div className="mb-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
            <h3 className="mb-3 text-[14px] font-bold text-black">공유 / 캠페인 정보</h3>
            <div className="mb-3">
              <label className={labelClass}>공유 슬러그</label>
              <input
                type="text"
                value={creatorSlug}
                onChange={(e) =>
                  setCreatorSlug(
                    e.target.value
                      .toLowerCase()
                      .replace(/[^a-z0-9-_]+/g, "-")
                      .replace(/-{2,}/g, "-")
                      .replace(/^-+|-+$/g, "")
                  )
                }
                className={inputClass}
                placeholder="예: mikro-live"
              />
              <p className="mt-1 text-[12px] text-gray-500">
                공유 링크의 ref 코드로 사용됩니다.
              </p>
            </div>

            <div className="mb-3">
              <label className={labelClass}>대표 SNS 채널</label>
              <select
                value={socialChannelType}
                onChange={(e) =>
                  setSocialChannelType(e.target.value as SocialChannelType | "")
                }
                className={selectClass}
              >
                <option value="">선택해주세요</option>
                {SOCIAL_CHANNEL_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-3">
              <label className={labelClass}>대표 SNS URL</label>
              <input
                type="url"
                value={socialChannelUrl}
                onChange={(e) => setSocialChannelUrl(e.target.value)}
                className={inputClass}
                placeholder="https://instagram.com/..."
              />
              <p className="mt-1 text-[12px] text-gray-500">
                공개 상점 프로필에 하이퍼링크로 노출됩니다.
              </p>
            </div>

            <div className="mb-3">
              <label className={labelClass}>인스타그램 계정 (브랜드 확인용)</label>
              <input
                type="text"
                value={instagramHandle}
                onChange={(e) => setInstagramHandle(e.target.value.replace(/^@+/, ""))}
                className={inputClass}
                placeholder="예: mikro_official"
              />
              <p className="mt-1 text-[12px] text-gray-500">
                공개 노출용이 아닌 운영 심사 확인용 계정입니다.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>팔로워 수</label>
                <input
                  type="text"
                  value={followerCount}
                  onChange={(e) => setFollowerCount(e.target.value.replace(/[^\d]/g, ""))}
                  className={inputClass}
                  placeholder="예: 120000"
                />
              </div>
              <div>
                <label className={labelClass}>기본 수수료율 (bps)</label>
                <input
                  type="text"
                  value={commissionRateBps}
                  onChange={(e) =>
                    setCommissionRateBps(e.target.value.replace(/[^\d]/g, ""))
                  }
                  className={inputClass}
                  placeholder="예: 1200"
                />
                <p className="mt-1 text-[12px] text-gray-500">1200 = 12%</p>
              </div>
            </div>
          </div>
        )}

        <div className="mb-3">
          <label className={labelClass}>상점 유형</label>
          <div className="flex gap-2">
            {SHOP_TYPES.map((typeOption) => (
              <button
                key={typeOption}
                type="button"
                onClick={() => setShopType(typeOption)}
                className={`flex-1 py-2 rounded-lg text-[13px] font-medium transition-colors ${
                  shopType === typeOption
                    ? "bg-gray-900 text-white"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {typeOption}
              </button>
            ))}
          </div>
        </div>

        {showOfflineFields && (
          <>
            <div className="mb-3">
              <label className={labelClass}>상가명</label>
              <select
                value={marketBuilding}
                onChange={(e) => {
                  setMarketBuilding(e.target.value);
                  if (e.target.value !== "기타") setMarketBuildingCustom("");
                }}
                className={selectClass}
              >
                <option value="">선택해주세요</option>
                {MARKET_BUILDINGS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
              {marketBuilding === "기타" && (
                <input
                  type="text"
                  value={marketBuildingCustom}
                  onChange={(e) => setMarketBuildingCustom(e.target.value)}
                  className={`${inputClass} mt-2`}
                  placeholder="상가명을 직접 입력해주세요"
                />
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className={labelClass}>층</label>
                <input
                  type="text"
                  value={floor}
                  onChange={(e) => setFloor(e.target.value)}
                  className={inputClass}
                  placeholder="예: 3"
                />
              </div>
              <div>
                <label className={labelClass}>호수</label>
                <input
                  type="text"
                  value={roomNo}
                  onChange={(e) => setRoomNo(e.target.value)}
                  className={inputClass}
                  placeholder="예: 302"
                />
              </div>
            </div>
          </>
        )}

        <div className="mb-3">
          <label className={labelClass}>담당자 연락처</label>
          <input
            type="text"
            value={managerPhone}
            onChange={(e) => setManagerPhone(e.target.value)}
            className={inputClass}
            placeholder="010-1234-5678"
          />
        </div>

        <div className="mb-3">
          <label className={labelClass}>정산 구분</label>
          <div className="rounded-lg bg-gray-100 px-3 py-2 text-[13px] font-medium text-gray-900">
            사업자 정산
          </div>
        </div>

        <div className="mb-3">
          <label className={labelClass}>사업자등록번호</label>
          <input
            type="text"
            value={bizRegNo}
            onChange={(e) => setBizRegNo(formatBizRegNo(e.target.value))}
            className={inputClass}
            placeholder="000-00-00000"
            maxLength={12}
          />
        </div>

        <SellerDocumentUploadField
          label="사업자등록증 이미지"
          value={bizRegImageUrl}
          uploading={uploadingField === "bizRegImageUrl"}
          helperText="사업자 정보 변경 시 운영 검토가 다시 진행됩니다."
          onUpload={(file) =>
            handleDocumentUpload("bizRegImageUrl", "/api/uploads/biz-license", file)
          }
          onClear={() => setBizRegImageUrl("")}
        />

        <SellerDocumentUploadField
          label="통신판매업 신고증"
          value={mailOrderReportImageUrl}
          uploading={uploadingField === "mailOrderReportImageUrl"}
          helperText="전자상거래 판매 자격 확인용 서류입니다."
          onUpload={(file) =>
            handleDocumentUpload(
              "mailOrderReportImageUrl",
              "/api/uploads/mail-order-report",
              file,
            )
          }
          onClear={() => setMailOrderReportImageUrl("")}
        />

        <SellerDocumentUploadField
          label="정산 통장 사본"
          value={passbookImageUrl}
          uploading={uploadingField === "passbookImageUrl"}
          helperText="사업자등록증상의 대표자명과 실제 정산받을 계좌의 예금주가 일치하는지 확인해야 합니다."
          onUpload={(file) =>
            handleDocumentUpload("passbookImageUrl", "/api/uploads/passbook", file)
          }
          onClear={() => setPassbookImageUrl("")}
        />
      </div>

      {showCreatorFields && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-[15px] font-bold text-black">공동구매 운영</h2>
              <p className="mt-1 text-[13px] text-gray-500">
                캠페인 링크, 랜딩, 주문 귀속을 관리합니다.
              </p>
            </div>
            <a
              href="/seller/campaigns"
              className="rounded-lg bg-black px-3 py-2 text-[13px] font-medium text-white"
            >
              캠페인 관리
            </a>
          </div>
        </div>
      )}

      {/* Section 2: CS 정보 */}
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

      {/* Section 3: 배송/교환/환불 */}
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

      {/* Section 4: 정산 정보 */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
        <h2 className="text-[15px] font-bold text-black mb-4">정산 계좌</h2>
        <div className="space-y-3">
          <div>
            <label className={labelClass}>은행명</label>
            <input
              type="text"
              value={settlementBank}
              onChange={(e) => setSettlementBank(e.target.value)}
              className={inputClass}
              placeholder="예: 국민은행"
            />
          </div>
          <div>
            <label className={labelClass}>계좌번호</label>
            <input
              type="text"
              value={settlementAccountNo}
              onChange={(e) => setSettlementAccountNo(e.target.value)}
              className={inputClass}
              placeholder="- 없이 입력 가능"
            />
          </div>
          <div>
            <label className={labelClass}>예금주</label>
            <input
              type="text"
              value={settlementAccountHolder}
              onChange={(e) => setSettlementAccountHolder(e.target.value)}
              className={inputClass}
              placeholder="예금주명"
            />
          </div>
          <p className="text-[12px] text-gray-500">
            정산 계좌 정보는 운영 검토 후 정산에 반영됩니다.
          </p>
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
