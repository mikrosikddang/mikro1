"use client";

import { CampaignStatus } from "@prisma/client";

const STATUS_OPTIONS = Object.values(CampaignStatus);

export default function CampaignStatusButtons({
  campaignId,
  currentStatus,
}: {
  campaignId: string;
  currentStatus: CampaignStatus;
}) {
  const handleStatusChange = async (nextStatus: CampaignStatus) => {
    const res = await fetch(`/api/admin/campaigns/${campaignId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });

    if (res.ok) {
      window.location.reload();
      return;
    }

    const data = await res.json().catch(() => null);
    alert(data?.error || "캠페인 상태 변경에 실패했습니다");
  };

  return (
    <>
      {STATUS_OPTIONS.map((status) => (
        <button
          key={status}
          type="button"
          onClick={() => handleStatusChange(status)}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
            currentStatus === status
              ? "bg-black text-white"
              : "border border-gray-200 text-gray-700"
          }`}
        >
          {status}
        </button>
      ))}
    </>
  );
}
