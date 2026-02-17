import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function AdminDashboardPage() {
  // Fetch platform statistics
  const [
    totalUsers,
    totalCustomers,
    totalSellers,
    pendingSellers,
    totalOrders,
    totalProducts,
    refundRequests,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: "CUSTOMER" } }),
    prisma.user.count({
      where: {
        OR: [{ role: "SELLER_PENDING" }, { role: "SELLER_ACTIVE" }],
      },
    }),
    prisma.sellerProfile.count({ where: { status: "PENDING" } }),
    prisma.order.count(),
    prisma.product.count({ where: { isDeleted: false } }),
    prisma.order.count({ where: { status: "REFUND_REQUESTED" } }),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        Platform Overview
      </h1>

      {/* Stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-sm text-gray-500 mb-2">Total Users</p>
          <p className="text-3xl font-bold text-gray-900">{totalUsers}</p>
          <p className="text-xs text-gray-400 mt-1">
            {totalCustomers} customers, {totalSellers} sellers
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-sm text-gray-500 mb-2">Pending Sellers</p>
          <p className="text-3xl font-bold text-orange-600">{pendingSellers}</p>
          <Link
            href="/admin/sellers"
            className="text-xs text-blue-600 hover:underline mt-1 inline-block"
          >
            Review applications →
          </Link>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-sm text-gray-500 mb-2">Total Orders</p>
          <p className="text-3xl font-bold text-gray-900">{totalOrders}</p>
          <p className="text-xs text-gray-400 mt-1">{totalProducts} products listed</p>
        </div>
      </div>

      {/* Alerts */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-gray-900">Attention Required</h2>

        {pendingSellers > 0 && (
          <Link
            href="/admin/sellers"
            className="block bg-orange-50 border border-orange-200 p-4 rounded-lg hover:bg-orange-100 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-orange-900">
                  {pendingSellers} seller approval{pendingSellers > 1 ? "s" : ""} pending
                </p>
                <p className="text-sm text-orange-700">
                  Review and approve new seller applications
                </p>
              </div>
              <span className="text-orange-600">→</span>
            </div>
          </Link>
        )}

        {refundRequests > 0 && (
          <Link
            href="/admin/orders?status=REFUND_REQUESTED"
            className="block bg-red-50 border border-red-200 p-4 rounded-lg hover:bg-red-100 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-red-900">
                  {refundRequests} refund request{refundRequests > 1 ? "s" : ""} pending
                </p>
                <p className="text-sm text-red-700">
                  Monitor seller refund processing
                </p>
              </div>
              <span className="text-red-600">→</span>
            </div>
          </Link>
        )}

        {pendingSellers === 0 && refundRequests === 0 && (
          <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
            <p className="text-green-900 font-medium">✓ All clear</p>
            <p className="text-sm text-green-700">
              No pending actions required at this time
            </p>
          </div>
        )}
      </div>

      {/* Quick links */}
      <div className="mt-8">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            href="/admin/sellers"
            className="p-4 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <p className="font-medium text-gray-900">👥 Manage Sellers</p>
            <p className="text-sm text-gray-600">
              Approve, reject, or review seller profiles
            </p>
          </Link>
          <Link
            href="/admin/orders"
            className="p-4 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <p className="font-medium text-gray-900">📦 Monitor Orders</p>
            <p className="text-sm text-gray-600">
              View and override order status for disputes
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
}
