"use client";

import { useEffect, useState } from "react";

interface SellerProfile {
  id: string;
  shopName: string;
  type: string | null;
  marketBuilding: string | null;
  floor: string | null;
  roomNo: string | null;
  managerName: string | null;
  managerPhone: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  rejectedReason: string | null;
  user: {
    id: string;
    email: string | null;
    phone: string | null;
    name: string | null;
    role: string;
  };
  createdAt: string;
}

export default function AdminSellersPage() {
  const [sellers, setSellers] = useState<SellerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "PENDING" | "APPROVED" | "REJECTED"
  >("PENDING");

  useEffect(() => {
    loadSellers();
  }, [statusFilter]);

  const loadSellers = async () => {
    setLoading(true);
    try {
      const url =
        statusFilter === "ALL"
          ? "/api/admin/sellers"
          : `/api/admin/sellers?status=${statusFilter}`;
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

  const handleApprove = async (sellerId: string) => {
    if (!confirm("이 판매자 신청을 승인하시겠습니까?")) return;

    try {
      const res = await fetch(`/api/admin/sellers/${sellerId}/approve`, {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "판매자 승인에 실패했습니다");
      }

      alert("판매자가 성공적으로 승인되었습니다");
      loadSellers();
    } catch (error: any) {
      console.error("판매자 승인 오류:", error);
      alert(error.message || "판매자 승인에 실패했습니다");
    }
  };

  const handleReject = async (sellerId: string) => {
    const reason = prompt("거부 사유를 입력하세요 (최소 10자 이상):");
    if (!reason || reason.trim().length < 10) {
      alert("거부 사유는 최소 10자 이상이어야 합니다");
      return;
    }

    try {
      const res = await fetch(`/api/admin/sellers/${sellerId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "판매자 거부에 실패했습니다");
      }

      alert("판매자가 거부되었습니다");
      loadSellers();
    } catch (error: any) {
      console.error("판매자 거부 오류:", error);
      alert(error.message || "판매자 거부에 실패했습니다");
    }
  };

  const statusLabels = {
    ALL: "전체",
    PENDING: "대기",
    APPROVED: "승인",
    REJECTED: "거부",
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">판매자 관리</h1>
        <div className="flex gap-2">
          {(["ALL", "PENDING", "APPROVED", "REJECTED"] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
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
        <div className="text-center py-12 text-gray-500">로딩 중...</div>
      ) : sellers.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          {statusLabels[statusFilter]} 상태의 판매자가 없습니다
        </div>
      ) : (
        <div className="space-y-4">
          {sellers.map((seller) => (
            <div
              key={seller.id}
              className="bg-white p-6 rounded-lg shadow border border-gray-200"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    {seller.shopName}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {seller.user.email || seller.user.phone || "연락처 없음"}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    신청일: {new Date(seller.createdAt).toLocaleDateString("ko-KR")}
                  </p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold ${
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

              <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                <div>
                  <p className="text-gray-500">업종</p>
                  <p className="font-medium text-gray-900">
                    {seller.type || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">시장/건물</p>
                  <p className="font-medium text-gray-900">
                    {seller.marketBuilding || "-"}
                  </p>
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
                    {seller.managerPhone && ` (${seller.managerPhone})`}
                  </p>
                </div>
              </div>

              {seller.status === "REJECTED" && seller.rejectedReason && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded">
                  <p className="text-xs text-red-600 font-medium mb-1">
                    거부 사유:
                  </p>
                  <p className="text-sm text-red-800">{seller.rejectedReason}</p>
                </div>
              )}

              {seller.status === "PENDING" && (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleApprove(seller.id)}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
                  >
                    ✓ 승인
                  </button>
                  <button
                    onClick={() => handleReject(seller.id)}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
                  >
                    ✗ 거부
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
