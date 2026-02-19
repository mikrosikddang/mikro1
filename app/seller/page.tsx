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

  const [unprocessedOrders, refundRequests, awaitingShipment, todayRevenue, recentOrders, recentProducts, allProducts] = await Promise.all([
    // Unprocessed orders (PENDING + PAID)
    prisma.order.count({
      where: { sellerId, status: { in: ["PENDING", "PAID"] } },
    }),
    // Refund requests (REFUND_REQUESTED)
    prisma.order.count({
      where: { sellerId, status: "REFUND_REQUESTED" },
    }),
    // Awaiting shipment (PAID orders)
    prisma.order.count({
      where: { sellerId, status: "PAID" },
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
    // Recent 5 orders
    prisma.order.findMany({
      where: { sellerId },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        items: {
          include: {
            product: { select: { title: true } },
          },
        },
      },
    }),
    // Recent 5 products
    prisma.product.findMany({
      where: { sellerId, isDeleted: false },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        images: { where: { kind: "MAIN" }, orderBy: { sortOrder: "asc" }, take: 1 },
        variants: true,
      },
    }),
    // All products for summary counts
    prisma.product.findMany({
      where: { sellerId, isDeleted: false },
      include: { variants: true },
    }),
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
      default: return status;
    }
  };

  const getOrderActionHint = (status: string): string | null => {
    switch (status) {
      case "PAID": return "출고 처리 →";
      case "SHIPPED": return "완료 처리 →";
      case "REFUND_REQUESTED": return "환불 승인 →";
      default: return null;
    }
  };

  return (
    <div className="py-4">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-[20px] font-bold text-black mb-1">판매자 센터</h1>
        <p className="text-[14px] text-gray-500">{shopName}</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-2.5 mb-4">
        <Link
          href="/seller/orders?status=PENDING,PAID"
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
          href="/seller/orders?status=PAID"
          className="p-3 bg-white rounded-lg border border-gray-200 active:bg-gray-50 transition-colors"
        >
          <p className="text-[13px] text-gray-500 mb-1">배송 대기</p>
          <p className="text-[24px] font-bold text-black">{awaitingShipment}</p>
        </Link>
        <Link
          href="/seller/orders"
          className="p-3 bg-white rounded-lg border border-gray-200 active:bg-gray-50 transition-colors"
        >
          <p className="text-[13px] text-gray-500 mb-1">오늘 매출</p>
          <p className="text-[24px] font-bold text-black">{formatKrw(todaySales)}</p>
        </Link>
      </div>

      {/* Quick Actions */}
      <div className="mb-4">
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
            📦 주문 관리
          </Link>
          <Link
            href="/seller/products"
            className="p-3 bg-gray-100 text-gray-900 rounded-lg text-[14px] font-medium text-center active:bg-gray-200 transition-colors"
          >
            📦 상품 관리
          </Link>
          <Link
            href={`/seller/shop/${sellerId}`}
            className="p-3 bg-gray-100 text-gray-900 rounded-lg text-[14px] font-medium text-center active:bg-gray-200 transition-colors"
          >
            🏪 내 상점 보기
          </Link>
        </div>
      </div>

      {/* Product Summary */}
      <div className="p-3 bg-white rounded-lg border border-gray-200 mb-4">
        <h3 className="text-[15px] font-bold text-black mb-3">상품 현황</h3>
        <div className="flex gap-4 mb-4">
          <div className="flex-1">
            <p className="text-[12px] text-gray-500 mb-1">판매중</p>
            <p className="text-[20px] font-bold text-black">{productCounts.active}</p>
          </div>
          <div className="flex-1">
            <p className="text-[12px] text-gray-500 mb-1">숨김</p>
            <p className="text-[20px] font-bold text-gray-600">{productCounts.hidden}</p>
          </div>
          <div className="flex-1">
            <p className="text-[12px] text-gray-500 mb-1">품절</p>
            <p className="text-[20px] font-bold text-red-600">{productCounts.soldOut}</p>
          </div>
        </div>
        <Link
          href="/seller/products"
          className="block w-full p-3 bg-gray-100 text-gray-900 rounded-lg text-[14px] font-medium text-center active:bg-gray-200 transition-colors"
        >
          상품 관리로 이동 →
        </Link>
      </div>

      {/* Recent Orders */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[15px] font-bold text-black">최근 주문</h2>
          <Link href="/seller/orders" className="text-[13px] text-blue-600 font-medium">
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
                      {new Date(order.createdAt).toLocaleDateString("ko-KR")}
                    </p>
                  </div>
                  <span className={`ml-2 px-2 py-0.5 rounded text-[11px] font-medium ${getStatusColor(order.status)}`}>
                    {getStatusLabel(order.status)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-[13px] font-bold text-black">
                    {formatKrw(order.totalPayKrw || order.totalAmountKrw)}
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

      {/* Recent Products */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[15px] font-bold text-black">최근 등록 상품</h2>
          <Link href="/seller/products" className="text-[13px] text-blue-600 font-medium">
            전체보기 →
          </Link>
        </div>
        {recentProducts.length === 0 ? (
          <div className="p-6 bg-gray-50 rounded-xl text-center">
            <p className="text-[14px] text-gray-500 mb-3">아직 등록된 상품이 없습니다</p>
            <Link
              href="/seller/products/new"
              className="inline-block px-4 py-2 bg-black text-white rounded-lg text-[13px] font-medium"
            >
              첫 상품 올리기
            </Link>
          </div>
        ) : (
          <div className="space-y-1.5">
            {recentProducts.map((product) => {
              const imageUrl = product.images[0]?.url || "/placeholder.png";
              const stock = getTotalStock(product.variants);
              return (
                <Link
                  key={product.id}
                  href={`/seller/products/${product.id}`}
                  className="flex gap-3 p-2.5 bg-white border border-gray-200 rounded-lg active:bg-gray-50 transition-colors"
                >
                  <img
                    src={imageUrl}
                    alt={product.title}
                    className="w-16 h-16 rounded-lg object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-medium text-black truncate">
                      {product.title}
                    </p>
                    <p className="text-[13px] text-gray-600">
                      {formatKrw(product.priceKrw)}
                    </p>
                    <p className="text-[12px] text-gray-500">
                      재고: {stock}개
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
