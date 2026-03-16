"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CampaignStatus } from "@prisma/client";
import AdminModal from "@/components/admin/AdminModal";

const STATUS_OPTIONS = Object.values(CampaignStatus);
const STATUS_LABELS: Record<CampaignStatus, string> = {
  DRAFT: "초안",
  ACTIVE: "운영중",
  ENDED: "종료",
  ARCHIVED: "보관",
};
const ALLOWED_STATUS_TRANSITIONS: Record<CampaignStatus, CampaignStatus[]> = {
  DRAFT: ["ACTIVE", "ARCHIVED"],
  ACTIVE: ["ENDED", "ARCHIVED"],
  ENDED: ["ARCHIVED"],
  ARCHIVED: [],
};

export function getCampaignStatusLabel(status: CampaignStatus) {
  return STATUS_LABELS[status];
}

export default function CampaignStatusButtons({
  campaignId,
  currentStatus,
}: {
  campaignId: string;
  currentStatus: CampaignStatus;
}) {
  const router = useRouter();
  const [pendingStatus, setPendingStatus] = useState<CampaignStatus | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleStatusChange = async (nextStatus: CampaignStatus) => {
    setSaving(true);
    setError("");
    const res = await fetch(`/api/admin/campaigns/${campaignId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });

    if (res.ok) {
      setPendingStatus(null);
      router.refresh();
      return;
    }

    const data = await res.json().catch(() => null);
    setSaving(false);
    setError(data?.error || "캠페인 상태 변경에 실패했습니다");
  };

  return (
    <>
      {STATUS_OPTIONS.map((status) => (
        <button
          key={status}
          type="button"
          onClick={() => {
            if (status === currentStatus) return;
            if (!ALLOWED_STATUS_TRANSITIONS[currentStatus].includes(status)) return;
            setError("");
            setPendingStatus(status);
          }}
          disabled={
            saving ||
            status === currentStatus ||
            !ALLOWED_STATUS_TRANSITIONS[currentStatus].includes(status)
          }
          className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
            currentStatus === status
              ? "bg-black text-white"
              : ALLOWED_STATUS_TRANSITIONS[currentStatus].includes(status)
                ? "border border-gray-200 text-gray-700"
                : "border border-gray-100 text-gray-300"
          }`}
        >
          {getCampaignStatusLabel(status)}
        </button>
      ))}

      <AdminModal
        open={pendingStatus !== null}
        title="캠페인 상태 변경"
        description="허용된 상태 전이만 변경할 수 있으며, 변경 이력은 감사 로그에 남습니다."
        onClose={() => {
          if (saving) return;
          setPendingStatus(null);
          setError("");
        }}
      >
        {pendingStatus ? (
          <div className="space-y-4">
            <div className="rounded-xl bg-gray-50 p-4 text-sm text-gray-700">
              현재 상태는 <span className="font-semibold">{getCampaignStatusLabel(currentStatus)}</span>이며,
              <span className="font-semibold"> {getCampaignStatusLabel(pendingStatus)}</span>
              으로 변경합니다.
            </div>

            {error ? (
              <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </p>
            ) : null}

            <div className="flex justify-end gap-3 border-t border-gray-200 pt-4">
              <button
                type="button"
                onClick={() => {
                  if (saving) return;
                  setPendingStatus(null);
                  setError("");
                }}
                disabled={saving}
                className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50"
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => handleStatusChange(pendingStatus)}
                disabled={saving}
                className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
              >
                {saving ? "처리 중..." : "상태 변경"}
              </button>
            </div>
          </div>
        ) : null}
      </AdminModal>
    </>
  );
}
