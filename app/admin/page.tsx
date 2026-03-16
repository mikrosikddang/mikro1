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
        플랫폼 현황
      </h1>

      {/* Stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-sm text-gray-500 mb-2">전체 사용자</p>
          <p className="text-3xl font-bold text-gray-900">{totalUsers}</p>
          <p className="text-xs text-gray-400 mt-1">
            고객 {totalCustomers}명, 판매자 {totalSellers}명
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-sm text-gray-500 mb-2">승인 대기 판매자</p>
          <p className="text-3xl font-bold text-orange-600">{pendingSellers}</p>
          <Link
            href="/admin/sellers"
            className="text-xs text-blue-600 hover:underline mt-1 inline-block"
          >
            신청서 검토하기 →
          </Link>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-sm text-gray-500 mb-2">전체 주문</p>
          <p className="text-3xl font-bold text-gray-900">{totalOrders}</p>
          <p className="text-xs text-gray-400 mt-1">등록된 상품 {totalProducts}개</p>
        </div>
      </div>

      {/* Alerts */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-gray-900">처리 필요 항목</h2>

        {pendingSellers > 0 && (
          <Link
            href="/admin/sellers"
            className="block bg-orange-50 border border-orange-200 p-4 rounded-lg hover:bg-orange-100 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-orange-900">
                  {pendingSellers}개의 판매자 승인 대기 중
                </p>
                <p className="text-sm text-orange-700">
                  신규 판매자 신청을 검토하고 승인하세요
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
                  {refundRequests}건의 환불 요청 대기 중
                </p>
                <p className="text-sm text-red-700">
                  판매자의 환불 처리를 모니터링하세요
                </p>
              </div>
              <span className="text-red-600">→</span>
            </div>
          </Link>
        )}

        {pendingSellers === 0 && refundRequests === 0 && (
          <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
            <p className="text-green-900 font-medium">✓ 모두 처리 완료</p>
            <p className="text-sm text-green-700">
              현재 처리가 필요한 항목이 없습니다
            </p>
          </div>
        )}
      </div>

      {/* Quick links */}
      <div className="mt-8">
        <h2 className="text-lg font-bold text-gray-900 mb-4">바로가기</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <Link
            href="/admin/sellers"
            className="p-4 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <p className="font-medium text-gray-900">👥 판매자 관리</p>
            <p className="text-sm text-gray-600">
              판매자 프로필 승인, 거부, 검토
            </p>
          </Link>
          <Link
            href="/admin/orders"
            className="p-4 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <p className="font-medium text-gray-900">📦 주문 모니터링</p>
            <p className="text-sm text-gray-600">
              분쟁 해결을 위한 주문 상태 확인 및 변경
            </p>
          </Link>
          <Link
            href="/admin/campaigns"
            className="p-4 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <p className="font-medium text-gray-900">📣 캠페인 관리</p>
            <p className="text-sm text-gray-600">
              상태 변경과 성과 현황을 운영 기준으로 확인
            </p>
          </Link>
          <Link
            href="/admin/coupons"
            className="p-4 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <p className="font-medium text-gray-900">🎟️ 쿠폰 관리</p>
            <p className="text-sm text-gray-600">
              운영 쿠폰 생성 및 발급 현황 확인
            </p>
          </Link>
          <Link
            href="/admin/disputes"
            className="p-4 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <p className="font-medium text-gray-900">📝 분쟁 메모</p>
            <p className="text-sm text-gray-600">
              주문 운영 메모와 분쟁 대응 기록 확인
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
}
