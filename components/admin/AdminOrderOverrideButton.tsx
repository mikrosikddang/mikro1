"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { OrderStatus } from "@prisma/client";
import AdminModal from "@/components/admin/AdminModal";
import { getStatusLabel } from "@/lib/orderState";

const ORDER_STATUS_OPTIONS = Object.values(OrderStatus);

interface AdminOrderOverrideButtonProps {
  orderId: string;
  currentStatus: OrderStatus;
  buttonLabel?: string;
  buttonClassName?: string;
  onSuccess?: () => void;
}

export default function AdminOrderOverrideButton({
  orderId,
  currentStatus,
  buttonLabel = "주문 상태 변경",
  buttonClassName = "rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700",
  onSuccess,
}: AdminOrderOverrideButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [nextStatus, setNextStatus] = useState<OrderStatus>(currentStatus);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const currentStatusLabel = useMemo(
    () => getStatusLabel(currentStatus),
    [currentStatus],
  );

  const resetForm = () => {
    setNextStatus(currentStatus);
    setReason("");
    setError("");
    setSaving(false);
  };

  const forceClose = () => {
    resetForm();
    setOpen(false);
  };

  const handleClose = () => {
    if (saving) return;
    forceClose();
  };

  const handleSubmit = async () => {
    if (!nextStatus) {
      setError("변경할 주문 상태를 선택해주세요.");
      return;
    }
    if (reason.trim().length < 10) {
      setError("변경 사유는 최소 10자 이상 입력해주세요.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const res = await fetch(`/api/admin/orders/${orderId}/override`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: nextStatus,
          reason: reason.trim(),
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || "주문 상태 변경에 실패했습니다.");
      }

      forceClose();
      router.refresh();
      onSuccess?.();
    } catch (submitError) {
      setSaving(false);
      setError(
        submitError instanceof Error
          ? submitError.message
          : "주문 상태 변경에 실패했습니다.",
      );
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={buttonClassName}
      >
        {buttonLabel}
      </button>

      <AdminModal
        open={open}
        title="주문 상태 강제 변경"
        description="긴급 대응이나 분쟁 해결 시에만 사용하세요. 변경 이력은 모두 기록됩니다."
        onClose={handleClose}
      >
        <div className="space-y-4">
          <div className="rounded-xl bg-red-50 p-4 text-sm text-red-800">
            현재 상태는 <span className="font-semibold">{currentStatusLabel}</span> 입니다.
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              변경할 주문 상태
            </label>
            <select
              value={nextStatus}
              onChange={(event) => setNextStatus(event.target.value as OrderStatus)}
              disabled={saving}
              className="h-11 w-full rounded-xl border border-gray-200 px-3 text-sm focus:border-black focus:outline-none"
            >
              {ORDER_STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {getStatusLabel(status)} ({status})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              변경 사유
            </label>
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              disabled={saving}
              rows={4}
              placeholder="예: 고객 분쟁 조정 완료 후 환불 처리"
              className="w-full rounded-xl border border-gray-200 px-3 py-3 text-sm focus:border-black focus:outline-none"
            />
            <p className="mt-1 text-xs text-gray-500">
              최소 10자 이상 입력해야 하며, 감사 로그에 저장됩니다.
            </p>
          </div>

          {error ? (
            <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </p>
          ) : null}

          <div className="flex justify-end gap-3 border-t border-gray-200 pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={saving}
              className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50"
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              {saving ? "처리 중..." : "상태 변경 기록"}
            </button>
          </div>
        </div>
      </AdminModal>
    </>
  );
}
