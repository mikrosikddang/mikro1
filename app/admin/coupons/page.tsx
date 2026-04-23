"use client";

import { useEffect, useState } from "react";
import { DiscountType } from "@prisma/client";
import AdminModal from "@/components/admin/AdminModal";

interface CouponItem {
  id: string;
  code: string;
  name: string;
  discountType: DiscountType;
  discountValue: number;
  minOrderAmount: number | null;
  maxDiscountAmount: number | null;
  totalCount: number | null;
  claimedCount: number;
  isActive: boolean;
  expiresAt: string | null;
  createdAt: string;
}

type ActiveFilter = "ALL" | "ACTIVE" | "INACTIVE";

const initialForm = {
  code: "",
  name: "",
  discountType: "PERCENT" as DiscountType,
  discountValue: "",
  minOrderAmount: "",
  maxDiscountAmount: "",
  totalCount: "",
  expiresAt: "",
};

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<CouponItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [filter, setFilter] = useState<ActiveFilter>("ALL");
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState(initialForm);

  useEffect(() => {
    loadCoupons();
  }, [filter]);

  const loadCoupons = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter === "ACTIVE") params.set("active", "true");
      if (filter === "INACTIVE") params.set("active", "false");
      const res = await fetch(`/api/admin/coupons${params.toString() ? `?${params.toString()}` : ""}`);
      if (!res.ok) throw new Error("쿠폰 목록을 불러오지 못했습니다");
      const data = await res.json();
      setCoupons(data.coupons || []);
    } catch (loadError) {
      console.error("쿠폰 로딩 오류:", loadError);
      alert("쿠폰 목록을 불러오지 못했습니다");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm(initialForm);
    setError("");
    setSubmitting(false);
  };

  const closeModal = () => {
    if (submitting) return;
    forceCloseModal();
  };

  const forceCloseModal = () => {
    setOpen(false);
    resetForm();
  };

  const handleCreate = async () => {
    const discountValue = Number(form.discountValue);
    const minOrderAmount = form.minOrderAmount ? Number(form.minOrderAmount) : undefined;
    const maxDiscountAmount = form.maxDiscountAmount ? Number(form.maxDiscountAmount) : undefined;
    const totalCount = form.totalCount ? Number(form.totalCount) : undefined;

    if (!form.code.trim() || !form.name.trim()) {
      setError("쿠폰 코드와 이름을 입력해주세요.");
      return;
    }
    if (!Number.isFinite(discountValue) || discountValue <= 0) {
      setError("할인 값을 올바르게 입력해주세요.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/admin/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: form.code.trim(),
          name: form.name.trim(),
          discountType: form.discountType,
          discountValue,
          minOrderAmount,
          maxDiscountAmount,
          totalCount,
          expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : undefined,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || "쿠폰 생성에 실패했습니다");
      }

      forceCloseModal();
      await loadCoupons();
    } catch (createError) {
      setSubmitting(false);
      setError(
        createError instanceof Error
          ? createError.message
          : "쿠폰 생성에 실패했습니다",
      );
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">쿠폰 관리</h1>
          <p className="mt-1 text-sm text-gray-500">
            운영 쿠폰을 생성하고 발급 현황을 한 번에 확인합니다.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          쿠폰 생성
        </button>
      </div>

      <div className="mb-4 flex gap-2">
        {([
          ["ALL", "전체"],
          ["ACTIVE", "활성"],
          ["INACTIVE", "비활성"],
        ] as const).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              filter === value
                ? "bg-red-900 text-white"
                : "bg-white text-gray-700 hover:bg-gray-100"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-12 text-center text-gray-500">로딩 중...</div>
      ) : coupons.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white py-12 text-center text-gray-500">
          등록된 쿠폰이 없습니다.
        </div>
      ) : (
        <div className="space-y-4">
          {coupons.map((coupon) => (
            <div
              key={coupon.id}
              className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
            >
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">{coupon.name}</h2>
                  <p className="mt-1 font-mono text-sm text-gray-500">{coupon.code}</p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    coupon.isActive
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {coupon.isActive ? "활성" : "비활성"}
                </span>
              </div>

              <div className="grid gap-4 text-sm md:grid-cols-3">
                <div>
                  <p className="text-gray-500">할인 방식</p>
                  <p className="font-medium text-gray-900">
                    {coupon.discountType === "PERCENT"
                      ? `${coupon.discountValue}%`
                      : `${coupon.discountValue.toLocaleString("ko-KR")}원`}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">최소 주문 금액</p>
                  <p className="font-medium text-gray-900">
                    {coupon.minOrderAmount != null
                      ? `${coupon.minOrderAmount.toLocaleString("ko-KR")}원`
                      : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">최대 할인 금액</p>
                  <p className="font-medium text-gray-900">
                    {coupon.maxDiscountAmount != null
                      ? `${coupon.maxDiscountAmount.toLocaleString("ko-KR")}원`
                      : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">총 발급 수량</p>
                  <p className="font-medium text-gray-900">
                    {coupon.totalCount != null ? `${coupon.totalCount}장` : "무제한"}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">발급 완료 수량</p>
                  <p className="font-medium text-gray-900">{coupon.claimedCount}장</p>
                </div>
                <div>
                  <p className="text-gray-500">만료일</p>
                  <p className="font-medium text-gray-900">
                    {coupon.expiresAt
                      ? new Date(coupon.expiresAt).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })
                      : "-"}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <AdminModal
        open={open}
        title="관리자 쿠폰 생성"
        description="새 운영 쿠폰을 생성하면 즉시 발급 가능한 상태로 추가됩니다."
        onClose={closeModal}
      >
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                쿠폰 코드
              </label>
              <input
                value={form.code}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, code: event.target.value.toUpperCase() }))
                }
                disabled={submitting}
                className="h-11 w-full rounded-xl border border-gray-200 px-3 text-sm focus:border-black focus:outline-none"
                placeholder="예: SPRING10"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                쿠폰 이름
              </label>
              <input
                value={form.name}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, name: event.target.value }))
                }
                disabled={submitting}
                className="h-11 w-full rounded-xl border border-gray-200 px-3 text-sm focus:border-black focus:outline-none"
                placeholder="예: 봄맞이 할인"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                할인 유형
              </label>
              <select
                value={form.discountType}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    discountType: event.target.value as DiscountType,
                  }))
                }
                disabled={submitting}
                className="h-11 w-full rounded-xl border border-gray-200 px-3 text-sm focus:border-black focus:outline-none"
              >
                <option value="PERCENT">퍼센트</option>
                <option value="FIXED">고정 금액</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                할인 값
              </label>
              <input
                type="number"
                value={form.discountValue}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, discountValue: event.target.value }))
                }
                disabled={submitting}
                className="h-11 w-full rounded-xl border border-gray-200 px-3 text-sm focus:border-black focus:outline-none"
                placeholder={form.discountType === "PERCENT" ? "예: 10" : "예: 3000"}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                최소 주문 금액
              </label>
              <input
                type="number"
                value={form.minOrderAmount}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, minOrderAmount: event.target.value }))
                }
                disabled={submitting}
                className="h-11 w-full rounded-xl border border-gray-200 px-3 text-sm focus:border-black focus:outline-none"
                placeholder="선택"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                최대 할인 금액
              </label>
              <input
                type="number"
                value={form.maxDiscountAmount}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, maxDiscountAmount: event.target.value }))
                }
                disabled={submitting}
                className="h-11 w-full rounded-xl border border-gray-200 px-3 text-sm focus:border-black focus:outline-none"
                placeholder="선택"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                총 발급 수량
              </label>
              <input
                type="number"
                value={form.totalCount}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, totalCount: event.target.value }))
                }
                disabled={submitting}
                className="h-11 w-full rounded-xl border border-gray-200 px-3 text-sm focus:border-black focus:outline-none"
                placeholder="비워두면 무제한"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                만료일
              </label>
              <input
                type="datetime-local"
                value={form.expiresAt}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, expiresAt: event.target.value }))
                }
                disabled={submitting}
                className="h-11 w-full rounded-xl border border-gray-200 px-3 text-sm focus:border-black focus:outline-none"
              />
            </div>
          </div>

          {error ? (
            <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </p>
          ) : null}

          <div className="flex justify-end gap-3 border-t border-gray-200 pt-4">
            <button
              type="button"
              onClick={closeModal}
              disabled={submitting}
              className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50"
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleCreate}
              disabled={submitting}
              className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
            >
              {submitting ? "생성 중..." : "쿠폰 생성"}
            </button>
          </div>
        </div>
      </AdminModal>
    </div>
  );
}
