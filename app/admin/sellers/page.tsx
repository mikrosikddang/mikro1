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
      if (!res.ok) throw new Error("Failed to load sellers");
      const data = await res.json();
      setSellers(data.sellers || []);
    } catch (error) {
      console.error("Error loading sellers:", error);
      alert("Failed to load sellers");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (sellerId: string) => {
    if (!confirm("Approve this seller application?")) return;

    try {
      const res = await fetch(`/api/admin/sellers/${sellerId}/approve`, {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to approve seller");
      }

      alert("Seller approved successfully");
      loadSellers();
    } catch (error: any) {
      console.error("Error approving seller:", error);
      alert(error.message || "Failed to approve seller");
    }
  };

  const handleReject = async (sellerId: string) => {
    const reason = prompt("Enter rejection reason (required):");
    if (!reason || reason.trim().length < 10) {
      alert("Rejection reason must be at least 10 characters");
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
        throw new Error(data.error || "Failed to reject seller");
      }

      alert("Seller rejected");
      loadSellers();
    } catch (error: any) {
      console.error("Error rejecting seller:", error);
      alert(error.message || "Failed to reject seller");
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Seller Management</h1>
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
              {status}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : sellers.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          No sellers found with status: {statusFilter}
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
                    {seller.user.email || seller.user.phone || "No contact"}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Applied: {new Date(seller.createdAt).toLocaleDateString()}
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
                  {seller.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                <div>
                  <p className="text-gray-500">Type</p>
                  <p className="font-medium text-gray-900">
                    {seller.type || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Market Building</p>
                  <p className="font-medium text-gray-900">
                    {seller.marketBuilding || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Location</p>
                  <p className="font-medium text-gray-900">
                    {seller.floor && seller.roomNo
                      ? `${seller.floor}F, Room ${seller.roomNo}`
                      : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Manager</p>
                  <p className="font-medium text-gray-900">
                    {seller.managerName || "-"}
                    {seller.managerPhone && ` (${seller.managerPhone})`}
                  </p>
                </div>
              </div>

              {seller.status === "REJECTED" && seller.rejectedReason && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded">
                  <p className="text-xs text-red-600 font-medium mb-1">
                    Rejection Reason:
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
                    ✓ Approve
                  </button>
                  <button
                    onClick={() => handleReject(seller.id)}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
                  >
                    ✗ Reject
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
