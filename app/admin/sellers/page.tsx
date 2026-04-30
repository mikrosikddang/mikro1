"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import AdminModal from "@/components/admin/AdminModal";

interface SellerRecentAction {
  id: string;
  action: string;
  summary: string;
  reason: string | null;
  createdAt: string;
  admin: {
    id: string;
    email: string | null;
    name: string | null;
  };
}

interface SellerProfile {
  id: string;
  shopName: string;
  storeSlug: string | null;
  sellerKind: "WHOLESALE_STORE" | "INFLUENCER" | "BRAND" | "HYBRID";
  type: string | null;
  marketBuilding: string | null;
  floor: string | null;
  roomNo: string | null;
  managerName: string | null;
  managerPhone: string | null;
  creatorSlug: string | null;
  commissionRateBps: number;
  complianceReviewPending: boolean;
  status: "PENDING" | "APPROVED" | "REJECTED";
  rejectedReason: string | null;

  // 사업자/세무 정보
  isBusinessSeller?: boolean;
  taxType?: string | null;
  bizName?: string | null;
  bizOwnerName?: string | null;
  bizRegNo?: string | null;
  bizRegImageUrl?: string | null;
  mailOrderReportImageUrl?: string | null;
  passbookImageUrl?: string | null;

  // 정산 정보
  settlementBank?: string | null;
  settlementAccountNo?: string | null;
  settlementAccountHolder?: string | null;
  settlementPhone?: string | null;
  settlementEmail?: string | null;

  // 토스 지급대행
  tossSellerId?: string | null;
  tossSellerStatus?: string | null;
  tossSellerRegisteredAt?: string | null;
  refSellerId?: string;

  user: {
    id: string;
    email: string | null;
    phone: string | null;
    name: string | null;
    role: string;
    _count: {
      campaigns: number;
    };
  };
  recentActions: SellerRecentAction[];
  createdAt: string;
}

type SellerActionType = "approve" | "reject" | "commission" | "compliance" | null;

export default function AdminSellersPage() {
  const searchParams = useSearchParams();
  const [sellers, setSellers] = useState<SellerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [commissionInput, setCommissionInput] = useState("");
  const [selectedSeller, setSelectedSeller] = useState<SellerProfile | null>(null);
  const [actionType, setActionType] = useState<SellerActionType>(null);
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "PENDING" | "APPROVED" | "REJECTED"
  >((searchParams.get("status") as "ALL" | "PENDING" | "APPROVED" | "REJECTED") || "ALL");

  useEffect(() => {
    loadSellers();
  }, [statusFilter, searchParams]);

  const filteredUserId = searchParams.get("userId");

  const statusLabels = {
    ALL: "전체",
    PENDING: "대기",
    APPROVED: "승인",
    REJECTED: "거부",
  };

  const sellerKindLabels = {
    WHOLESALE_STORE: "브랜드상점",
    INFLUENCER: "인플루언서상점",
    BRAND: "브랜드상점",
    HYBRID: "브랜드상점",
  };

  const modalTitle = useMemo(() => {
    switch (actionType) {
      case "approve":
        return "판매자 승인";
      case "reject":
        return "판매자 반려";
      case "commission":
        return "수수료율 수정";
      case "compliance":
        return "운영 검토 완료";
      default:
        return "";
    }
  }, [actionType]);

  const loadSellers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (filteredUserId) params.set("userId", filteredUserId);

      const url = `/api/admin/sellers${params.toString() ? `?${params.toString()}` : ""}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("판매자 목록을 불러오는데 실패했습니다");
      const data = await res.json();
      setSellers(data.sellers || []);
    } catch (error) {
      console.error("판매자 로딩 오류:", error);
      alert("판매자 목록을 불러오는데 실패했습니다");
    } finally {
      setLoading(false);
    }
  };

  const openActionModal = (type: Exclude<SellerActionType, null>, seller: SellerProfile) => {
    setSelectedSeller(seller);
    setActionType(type);
    setActionError("");
    setRejectReason(seller.rejectedReason || "");
    setCommissionInput(String(seller.commissionRateBps));
  };

  const closeActionModal = () => {
    if (submitting) return;
    forceCloseActionModal();
  };

  const forceCloseActionModal = () => {
    setSelectedSeller(null);
    setActionType(null);
    setActionError("");
    setRejectReason("");
    setCommissionInput("");
    setSubmitting(false);
  };

  const submitSellerAction = async () => {
    if (!selectedSeller || !actionType) return;

    let url = "";
    let method = "POST";
    let body: Record<string, unknown> | undefined;

    if (actionType === "approve") {
      url = `/api/admin/sellers/${selectedSeller.id}/approve`;
    } else if (actionType === "reject") {
      if (rejectReason.trim().length < 10) {
        setActionError("거부 사유는 최소 10자 이상 입력해주세요.");
        return;
      }
      url = `/api/admin/sellers/${selectedSeller.id}/reject`;
      body = { reason: rejectReason.trim() };
    } else if (actionType === "commission") {
      const nextValue = Number(commissionInput);
      if (!Number.isFinite(nextValue) || nextValue < 0 || nextValue > 10000) {
        setActionError("수수료율은 0~10000 범위의 숫자여야 합니다.");
        return;
      }
      url = `/api/admin/sellers/${selectedSeller.id}/commission`;
      method = "PATCH";
      body = { commissionRateBps: nextValue };
    } else if (actionType === "compliance") {
      url = `/api/admin/sellers/${selectedSeller.id}/compliance-review`;
      method = "PATCH";
    }

    setSubmitting(true);
    setActionError("");

    try {
      const res = await fetch(url, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || "관리자 작업에 실패했습니다");
      }

      forceCloseActionModal();
      await loadSellers();
    } catch (error) {
      setSubmitting(false);
      setActionError(
        error instanceof Error ? error.message : "관리자 작업에 실패했습니다",
      );
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">판매자 관리</h1>
          {filteredUserId ? (
            <p className="mt-1 text-sm text-gray-500">
              특정 판매자 기준으로 조회 중: {filteredUserId}
            </p>
          ) : null}
        </div>
        <div className="flex gap-2">
          {(["ALL", "PENDING", "APPROVED", "REJECTED"] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                statusFilter === status
                  ? "bg-red-900 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-100"
              }`}
            >
              {statusLabels[status]}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-gray-500">로딩 중...</div>
      ) : sellers.length === 0 ? (
        <div className="py-12 text-center text-gray-500">
          {statusLabels[statusFilter]} 상태의 판매자가 없습니다
        </div>
      ) : (
        <div className="space-y-4">
          {sellers.map((seller) => (
            <div
              key={seller.id}
              className="rounded-lg border border-gray-200 bg-white p-6 shadow"
            >
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{seller.shopName}</h3>
                  <p className="text-sm text-gray-500">
                    {seller.user.email || seller.user.phone || "연락처 없음"}
                  </p>
                  <p className="mt-1 text-xs text-gray-400">
                    신청일: {new Date(seller.createdAt).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" })}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold ${
                    seller.status === "APPROVED"
                      ? "bg-green-100 text-green-800"
                      : seller.status === "REJECTED"
                        ? "bg-red-100 text-red-800"
                        : "bg-yellow-100 text-yellow-800"
                  }`}
                >
                  {statusLabels[seller.status]}
                </span>
              </div>

              <div className="mb-4 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">입점 유형</p>
                  <p className="font-medium text-gray-900">
                    {sellerKindLabels[seller.sellerKind]}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">업종</p>
                  <p className="font-medium text-gray-900">{seller.type || "-"}</p>
                </div>
                <div>
                  <p className="text-gray-500">시장/건물</p>
                  <p className="font-medium text-gray-900">{seller.marketBuilding || "-"}</p>
                </div>
                <div>
                  <p className="text-gray-500">위치</p>
                  <p className="font-medium text-gray-900">
                    {seller.floor && seller.roomNo
                      ? `${seller.floor}층, ${seller.roomNo}호`
                      : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">담당자</p>
                  <p className="font-medium text-gray-900">
                    {seller.managerName || "-"}
                    {seller.managerPhone ? ` (${seller.managerPhone})` : ""}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">크리에이터 ref</p>
                  <p className="font-medium text-gray-900">{seller.creatorSlug || "-"}</p>
                </div>
                <div>
                  <p className="text-gray-500">기본 수수료</p>
                  <p className="font-medium text-gray-900">
                    {(seller.commissionRateBps / 100).toFixed(2)}%
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">캠페인 수</p>
                  <p className="font-medium text-gray-900">{seller.user._count.campaigns}</p>
                </div>
                <div>
                  <p className="text-gray-500">운영 검토</p>
                  <p className="font-medium text-gray-900">
                    {seller.complianceReviewPending ? "필요" : "없음"}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">공개 상점 주소</p>
                  <p className="font-medium text-gray-900">
                    {seller.storeSlug ? `/` + seller.storeSlug : "-"}
                  </p>
                </div>
              </div>

              {/* 사업자/정산 정보 + 첨부 (정산 등록 검토용) */}
              <div className="mb-4 space-y-3 rounded-xl border border-gray-200 bg-white p-4">
                <p className="text-sm font-semibold text-gray-900">사업자 / 정산 정보</p>
                <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-3">
                  <div>
                    <p className="text-gray-500">분류</p>
                    <p className="font-medium text-gray-900">
                      {seller.isBusinessSeller === false
                        ? "개인"
                        : seller.taxType === "GENERAL_CORP"
                          ? "사업자(일반/법인)"
                          : seller.taxType === "SIMPLIFIED"
                            ? "사업자(간이)"
                            : "사업자"}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">상호명</p>
                    <p className="font-medium text-gray-900">{seller.bizName || "-"}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">대표자명</p>
                    <p className="font-medium text-gray-900">{seller.bizOwnerName || "-"}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">사업자번호</p>
                    <p className="font-medium text-gray-900">{seller.bizRegNo || "-"}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">정산 은행</p>
                    <p className="font-medium text-gray-900">{seller.settlementBank || "-"}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">정산 계좌</p>
                    <p className="font-medium text-gray-900">
                      {seller.settlementAccountNo || "-"}
                      {seller.settlementAccountHolder ? ` (${seller.settlementAccountHolder})` : ""}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">정산 휴대폰</p>
                    <p className="font-medium text-gray-900">{seller.settlementPhone || "-"}</p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-gray-500">정산 이메일</p>
                    <p className="font-medium text-gray-900">{seller.settlementEmail || "-"}</p>
                  </div>
                </div>

                {/* 첨부 이미지 (사업자등록증 / 통신판매업증 / 통장사본) */}
                <div>
                  <p className="mb-2 text-xs font-semibold text-gray-500">첨부 서류</p>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    {[
                      { label: "사업자등록증", url: seller.bizRegImageUrl },
                      { label: "통신판매업 신고증", url: seller.mailOrderReportImageUrl },
                      { label: "통장 사본", url: seller.passbookImageUrl },
                    ].map((doc) => (
                      <div
                        key={doc.label}
                        className="rounded-lg border border-gray-200 bg-gray-50 p-3"
                      >
                        <p className="mb-2 text-xs font-medium text-gray-600">{doc.label}</p>
                        {doc.url ? (
                          <div className="space-y-2">
                            {/* 이미지 미리보기 (PDF 등 비-이미지면 깨지지만 클릭 시 새창) */}
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={doc.url}
                              alt={doc.label}
                              className="h-32 w-full rounded border border-gray-200 bg-white object-contain"
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).style.display = "none";
                              }}
                            />
                            <a
                              href={doc.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center text-xs font-medium text-blue-600 underline"
                            >
                              새창에서 열기 ↗
                            </a>
                          </div>
                        ) : (
                          <p className="text-xs text-gray-400">미첨부</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* 토스 지급대행 셀러 등록 정보 */}
              <div className="mb-4 space-y-2 rounded-xl border border-gray-200 bg-white p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-gray-900">토스 지급대행 등록 상태</p>
                  {seller.tossSellerId ? (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-bold text-green-800">
                      등록됨
                    </span>
                  ) : (
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-bold text-gray-700">
                      미등록
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
                  <div>
                    <p className="text-gray-500">refSellerId (우리 시스템 식별자)</p>
                    <p className="break-all font-mono text-xs text-gray-900">
                      {seller.refSellerId || "-"}
                    </p>
                    <p className="mt-1 text-[11px] text-gray-400">
                      토스 콘솔에서 셀러 매칭 시 이 값을 사용 (SellerProfile.id 의 SHA-256 첫 20자).
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">tossSellerId (토스 발급)</p>
                    <p className="break-all font-mono text-xs text-gray-900">
                      {seller.tossSellerId || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">상태</p>
                    <p className="font-medium text-gray-900">
                      {seller.tossSellerStatus || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">등록 시각</p>
                    <p className="font-medium text-gray-900">
                      {seller.tossSellerRegisteredAt
                        ? new Date(seller.tossSellerRegisteredAt).toLocaleString("ko-KR", {
                            timeZone: "Asia/Seoul",
                          })
                        : "-"}
                    </p>
                  </div>
                </div>
                {!seller.tossSellerId && seller.status === "APPROVED" ? (
                  <button
                    onClick={async () => {
                      const res = await fetch(
                        `/api/admin/sellers/${seller.id}/toss-sync`,
                        { method: "POST" },
                      );
                      const data = await res.json().catch(() => null);
                      if (!res.ok) {
                        alert(data?.error || "토스 등록 동기화에 실패했습니다");
                      } else {
                        alert("토스 등록 동기화 요청 완료");
                        await loadSellers();
                      }
                    }}
                    className="mt-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100"
                  >
                    토스 등록 재시도
                  </button>
                ) : null}
              </div>

              <div className="mb-4 flex flex-wrap gap-2">
                <Link
                  href={`/admin/orders?sellerId=${seller.user.id}`}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  연결 주문 보기
                </Link>
                <Link
                  href={`/admin/campaigns?sellerId=${seller.user.id}`}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  연결 캠페인 보기
                </Link>
                <Link
                  href={seller.storeSlug ? `/${seller.storeSlug}` : `/s/${seller.user.id}`}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  공개 상점 보기
                </Link>
                <button
                  onClick={() => openActionModal("commission", seller)}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  수수료율 수정
                </button>
                {seller.complianceReviewPending ? (
                  <button
                    onClick={() => openActionModal("compliance", seller)}
                    className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700 hover:bg-amber-100"
                  >
                    검토 완료
                  </button>
                ) : null}
              </div>

              {seller.status === "REJECTED" && seller.rejectedReason ? (
                <div className="mb-4 rounded border border-red-200 bg-red-50 p-3">
                  <p className="mb-1 text-xs font-medium text-red-600">거부 사유</p>
                  <p className="text-sm text-red-800">{seller.rejectedReason}</p>
                </div>
              ) : null}

              <div className="rounded-xl bg-gray-50 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-900">최근 관리자 액션</p>
                  <p className="text-xs text-gray-400">최근 3건</p>
                </div>
                <div className="space-y-2">
                  {seller.recentActions.length === 0 ? (
                    <p className="text-sm text-gray-500">아직 기록된 관리자 액션이 없습니다.</p>
                  ) : (
                    seller.recentActions.map((action) => (
                      <div key={action.id} className="rounded-lg bg-white p-3 text-sm text-gray-700">
                        <p className="font-medium text-gray-900">{action.summary}</p>
                        {action.reason ? (
                          <p className="mt-1 text-gray-600">{action.reason}</p>
                        ) : null}
                        <p className="mt-2 text-xs text-gray-400">
                          {action.admin.name || action.admin.email || action.admin.id} ·{" "}
                          {new Date(action.createdAt).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {seller.status === "PENDING" ? (
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => openActionModal("approve", seller)}
                    className="flex-1 rounded-lg bg-green-600 px-4 py-2 font-medium text-white hover:bg-green-700"
                  >
                    승인
                  </button>
                  <button
                    onClick={() => openActionModal("reject", seller)}
                    className="flex-1 rounded-lg bg-red-600 px-4 py-2 font-medium text-white hover:bg-red-700"
                  >
                    반려
                  </button>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}

      <AdminModal
        open={Boolean(selectedSeller && actionType)}
        title={modalTitle}
        description={
          selectedSeller
            ? `${selectedSeller.shopName}에 대한 관리자 작업입니다.`
            : undefined
        }
        onClose={closeActionModal}
      >
        {selectedSeller ? (
          <div className="space-y-4">
            {actionType === "approve" ? (
              <div className="rounded-xl bg-green-50 p-4 text-sm text-green-800">
                판매자 신청을 승인하면 해당 사용자는 즉시 판매자 기능에 접근할 수 있습니다.
              </div>
            ) : null}

            {actionType === "reject" ? (
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  반려 사유
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(event) => setRejectReason(event.target.value)}
                  rows={4}
                  disabled={submitting}
                  placeholder="반려 사유를 최소 10자 이상 입력해주세요."
                  className="w-full rounded-xl border border-gray-200 px-3 py-3 text-sm focus:border-black focus:outline-none"
                />
              </div>
            ) : null}

            {actionType === "commission" ? (
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  새 기본 수수료율 (bps)
                </label>
                <input
                  type="number"
                  min={0}
                  max={10000}
                  value={commissionInput}
                  onChange={(event) => setCommissionInput(event.target.value)}
                  disabled={submitting}
                  className="h-11 w-full rounded-xl border border-gray-200 px-3 text-sm focus:border-black focus:outline-none"
                />
                <p className="mt-1 text-xs text-gray-500">예: 1200 = 12%</p>
              </div>
            ) : null}

            {actionType === "compliance" ? (
              <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
                현재 판매자의 운영 검토 필요 상태를 완료 처리합니다.
              </div>
            ) : null}

            {actionError ? (
              <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
                {actionError}
              </p>
            ) : null}

            <div className="flex justify-end gap-3 border-t border-gray-200 pt-4">
              <button
                type="button"
                onClick={closeActionModal}
                disabled={submitting}
                className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50"
              >
                취소
              </button>
              <button
                type="button"
                onClick={submitSellerAction}
                disabled={submitting}
                className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
              >
                {submitting ? "처리 중..." : "확인"}
              </button>
            </div>
          </div>
        ) : null}
      </AdminModal>
    </div>
  );
}
