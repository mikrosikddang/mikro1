"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AdminModal from "@/components/admin/AdminModal";

interface AdminOrderNote {
  id: string;
  summary: string;
  reason: string | null;
  createdAt: string | Date;
  admin: {
    id: string;
    email: string | null;
    name: string | null;
  };
}

interface AdminOrderNotesPanelProps {
  orderId: string;
  initialNotes: AdminOrderNote[];
}

export default function AdminOrderNotesPanel({
  orderId,
  initialNotes,
}: AdminOrderNotesPanelProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const handleClose = () => {
    if (saving) return;
    setOpen(false);
    setNote("");
    setError("");
  };

  const forceClose = () => {
    setOpen(false);
    setNote("");
    setError("");
    setSaving(false);
  };

  const handleSubmit = async () => {
    if (note.trim().length < 5) {
      setError("메모는 최소 5자 이상 입력해주세요.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const res = await fetch(`/api/admin/orders/${orderId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || "주문 메모 저장에 실패했습니다.");
      }

      forceClose();
      router.refresh();
    } catch (submitError) {
      setSaving(false);
      setError(
        submitError instanceof Error
          ? submitError.message
          : "주문 메모 저장에 실패했습니다.",
      );
    }
  };

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-lg font-bold text-gray-900">관리자 메모 및 액션</p>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          메모 추가
        </button>
      </div>
      <div className="space-y-3">
        {initialNotes.length === 0 ? (
          <p className="text-sm text-gray-500">아직 주문 관련 관리자 메모가 없습니다.</p>
        ) : (
          initialNotes.map((log) => (
            <div key={log.id} className="rounded-xl bg-gray-50 p-4 text-sm text-gray-700">
              <p className="font-semibold text-gray-900">{log.summary}</p>
              {log.reason ? <p className="mt-1 text-gray-600">{log.reason}</p> : null}
              <p className="mt-2 text-xs text-gray-400">
                {log.admin.name || log.admin.email || log.admin.id} ·{" "}
                {new Date(log.createdAt).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}
              </p>
            </div>
          ))
        )}
      </div>

      <AdminModal
        open={open}
        title="주문 운영 메모 추가"
        description="분쟁 메모나 관리자 판단 근거를 기록해 두면 주문 상세와 분쟁 화면에서 함께 확인할 수 있습니다."
        onClose={handleClose}
      >
        <div className="space-y-4">
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={5}
            disabled={saving}
            placeholder="예: 고객이 배송 지연으로 환불 요청, 판매자와 1차 협의 완료"
            className="w-full rounded-xl border border-gray-200 px-3 py-3 text-sm focus:border-black focus:outline-none"
          />

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
              className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
            >
              {saving ? "저장 중..." : "메모 저장"}
            </button>
          </div>
        </div>
      </AdminModal>
    </>
  );
}
