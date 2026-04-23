import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { formatKrw } from "@/lib/format";
import { getTotalStock } from "@/lib/productState";

export default async function SellerDashboardPage() {
  const session = await getSession();
  const sellerId = session!.userId; // layout guard guarantees SELLER

  const seller = await prisma.user.findUnique({
    where: { id: sellerId },
    include: { sellerProfile: true },
  });

  const shopName = seller?.sellerProfile?.shopName ?? "내 상점";

  // Fetch KPI data
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [
    unprocessedOrders,
    refundRequests,
    awaitingShipment,
    todayRevenue,
    recentOrders,
    allProducts,
    unansweredInquiries,
    activeCampaigns,
    expectedCampaignCommission,
  ] = await Promise.all([
    // Unprocessed orders (PAID only — PENDING is pre-payment)
    prisma.order.count({
      where: { sellerId, status: "PAID" },
    }),
    // Refund/return requests (REFUND_REQUESTED + RETURN_STARTED)
    prisma.order.count({
      where: { sellerId, status: { in: ["REFUND_REQUESTED", "RETURN_STARTED"] } },
    }),
    // Currently shipping (SHIPPED orders)
    prisma.order.count({
      where: { sellerId, status: "SHIPPED" },
    }),
    // Today's revenue
    prisma.order.aggregate({
      where: {
        sellerId,
        status: { in: ["PAID", "SHIPPED", "COMPLETED"] },
        createdAt: { gte: startOfToday },
      },
      _sum: { totalPayKrw: true },
    }),
    // Recent 3 orders (exclude PENDING/EXPIRED)
    prisma.order.findMany({
      where: { sellerId, status: { notIn: ["PENDING", "EXPIRED"] } },
      orderBy: { createdAt: "desc" },
      take: 3,
      include: {
        items: {
          include: {
            product: { select: { title: true } },
          },
        },
      },
    }),
    // All products for summary counts
    prisma.product.findMany({
      where: { sellerId, isDeleted: false },
      include: { variants: true },
    }),
    // Unanswered inquiries count
    prisma.inquiry.count({
      where: {
        product: { sellerId },
        answer: null,
      },
    }).catch(() => 0),
    prisma.campaign.count({
      where: {
        sellerId,
        status: "ACTIVE",
      },
    }).catch(() => 0),
    prisma.orderCommission.aggregate({
      where: {
        beneficiaryUserId: sellerId,
        status: { in: ["PENDING", "PAYABLE"] },
      },
      _sum: { commissionAmountKrw: true },
    }).catch(() => ({ _sum: { commissionAmountKrw: 0 } })),
  ]);

  const todaySales = todayRevenue._sum.totalPayKrw || 0;

  // Calculate product counts by status
  const productCounts = allProducts.reduce((acc, p) => {
    const stock = getTotalStock(p.variants);
    if (!p.isActive) {
      acc.hidden++;
    } else if (stock === 0) {
      acc.soldOut++;
    } else {
      acc.active++;
    }
    return acc;
  }, { active: 0, hidden: 0, soldOut: 0 });

  // Status colors
  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING": return "bg-yellow-100 text-yellow-800";
      case "PAID": return "bg-blue-100 text-blue-800";
      case "SHIPPED": return "bg-purple-100 text-purple-800";
      case "COMPLETED": return "bg-green-100 text-green-800";
      case "CANCELLED": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "PENDING": return "결제대기";
      case "PAID": return "결제완료";
      case "SHIPPED": return "배송중";
      case "COMPLETED": return "완료";
      case "CANCELLED": return "취소";
      case "REFUND_REQUESTED": return "환불요청";
      case "RETURN_STARTED": return "반품 진행중";
      case "RETURN_REJECTED": return "반품 거절";
      case "REFUNDED": return "환불완료";
      case "EXPIRED": return "만료";
      default: return status;
    }
  };

  const getOrderActionHint = (status: string): string | null => {
    switch (status) {
      case "PAID": return "출고 처리 →";
      case "SHIPPED": return "완료 처리 →";
      case "REFUND_REQUESTED": return "환불 승인 →";
      case "RETURN_STARTED": return "검수 처리 →";
      default: return null;
    }
  };

  return (
    <div className="py-4">
      {/* Header */}
      <div className="mb-5">
        <h1 className="text-[20px] font-bold text-black mb-1">판매자 센터</h1>
        <p className="text-[14px] text-gray-500">{shopName}</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-2.5 mb-5">
        <Link
          href="/seller/orders?status=PAID"
          className="p-3 bg-white rounded-lg border border-gray-200 active:bg-gray-50 transition-colors"
        >
          <p className="text-[13px] text-gray-500 mb-1">미처리 주문</p>
          <p className="text-[24px] font-bold text-black">{unprocessedOrders}</p>
        </Link>
        <Link
          href="/seller/orders?status=REFUND_REQUESTED"
          className="p-3 bg-orange-50 rounded-lg border border-orange-200 active:bg-orange-100 transition-colors"
        >
          <p className="text-[13px] text-orange-700 mb-1">환불 요청</p>
          <p className="text-[24px] font-bold text-orange-600">{refundRequests}</p>
        </Link>
        <Link
          href="/seller/orders?status=SHIPPED"
          className="p-3 bg-white rounded-lg border border-gray-200 active:bg-gray-50 transition-colors"
        >
          <p className="text-[13px] text-gray-500 mb-1">배송중</p>
          <p className="text-[24px] font-bold text-black">{awaitingShipment}</p>
        </Link>
        <Link
          href="/seller/orders"
          className="p-3 bg-white rounded-lg border border-gray-200 active:bg-gray-50 transition-colors"
        >
          <p className="text-[13px] text-gray-500 mb-1">오늘 매출</p>
          <p className="text-[24px] font-bold text-black">{formatKrw(todaySales)}</p>
        </Link>
        {unansweredInquiries > 0 && (
          <Link
            href="/seller/inquiries?status=unanswered"
            className="col-span-2 p-3 bg-amber-50 rounded-lg border border-amber-200 active:bg-amber-100 transition-colors"
          >
            <div className="flex items-center justify-between">
              <p className="text-[13px] text-amber-700">미답변 문의</p>
              <p className="text-[20px] font-bold text-amber-600">{unansweredInquiries}</p>
            </div>
          </Link>
        )}
      </div>

      {/* Quick Actions */}
      <div className="mb-5">
        <h2 className="text-[15px] font-bold text-black mb-3">빠른 작업</h2>
        <div className="grid grid-cols-2 gap-2.5">
          <Link
            href="/seller/products/new"
            className="p-3 bg-black text-white rounded-lg text-[14px] font-medium text-center active:bg-gray-800 transition-colors"
          >
            + 상품 올리기
          </Link>
          <Link
            href="/seller/orders"
            className="p-3 bg-gray-100 text-gray-900 rounded-lg text-[14px] font-medium text-center active:bg-gray-200 transition-colors"
          >
            주문 관리
          </Link>
          <Link
            href="/seller/campaigns"
            className="p-3 bg-gray-100 text-gray-900 rounded-lg text-[14px] font-medium text-center active:bg-gray-200 transition-colors"
          >
            공동구매 캠페인
          </Link>
          <Link
            href="/seller/inquiries"
            className="p-3 bg-gray-100 text-gray-900 rounded-lg text-[14px] font-medium text-center active:bg-gray-200 transition-colors"
          >
            채팅 관리
          </Link>
          <Link
            href="/seller/settings"
            className="p-3 bg-gray-100 text-gray-900 rounded-lg text-[14px] font-medium text-center active:bg-gray-200 transition-colors"
          >
            상점 설정
          </Link>
        </div>
      </div>

      {/* Product Summary */}
      <div className="p-3 bg-white rounded-lg border border-gray-200 mb-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-[12px] text-gray-500">판매중</span>
            <span className="text-[14px] font-bold text-black">{productCounts.active}</span>
            <span className="text-[12px] text-gray-300 mx-1">·</span>
            <span className="text-[12px] text-gray-500">숨김</span>
            <span className="text-[14px] font-bold text-gray-500">{productCounts.hidden}</span>
            <span className="text-[12px] text-gray-300 mx-1">·</span>
            <span className="text-[12px] text-gray-500">품절</span>
            <span className="text-[14px] font-bold text-red-600">{productCounts.soldOut}</span>
          </div>
          <Link href="/seller/products" className="text-[13px] text-gray-500 font-medium">
            상품 관리 →
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5 mb-5">
        <Link
          href="/seller/campaigns"
          className="p-3 bg-white rounded-lg border border-gray-200 active:bg-gray-50 transition-colors"
        >
          <p className="text-[13px] text-gray-500 mb-1">운영중 캠페인</p>
          <p className="text-[24px] font-bold text-black">{activeCampaigns}</p>
        </Link>
        <Link
          href="/seller/campaigns"
          className="p-3 bg-white rounded-lg border border-gray-200 active:bg-gray-50 transition-colors"
        >
          <p className="text-[13px] text-gray-500 mb-1">예상 수수료</p>
          <p className="text-[18px] font-bold text-black">
            {formatKrw(expectedCampaignCommission._sum.commissionAmountKrw || 0)}
          </p>
        </Link>
      </div>

      {/* Recent Orders */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[15px] font-bold text-black">최근 주문</h2>
          <Link href="/seller/orders" className="text-[13px] text-gray-500 font-medium">
            전체보기 →
          </Link>
        </div>
        {recentOrders.length === 0 ? (
          <div className="p-6 bg-gray-50 rounded-xl text-center text-[14px] text-gray-500">
            아직 주문이 없습니다
          </div>
        ) : (
          <div className="space-y-1.5">
            {recentOrders.map((order) => (
              <Link
                key={order.id}
                href={`/seller/orders/${order.id}`}
                className="block p-2.5 bg-white border border-gray-200 rounded-lg active:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-black truncate">
                      {order.items[0]?.product.title}
                      {order.items.length > 1 && ` 외 ${order.items.length - 1}건`}
                    </p>
                    <p className="text-[12px] text-gray-500">
                      {new Date(order.createdAt).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" })}
                    </p>
                  </div>
                  <span className={`ml-2 px-2 py-0.5 rounded text-[11px] font-medium ${getStatusColor(order.status)}`}>
                    {getStatusLabel(order.status)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-[13px] font-bold text-black">
                    {formatKrw(order.totalPayKrw)}
                  </p>
                  {getOrderActionHint(order.status) && (
                    <p className="text-[12px] text-blue-600 font-medium">
                      {getOrderActionHint(order.status)}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
