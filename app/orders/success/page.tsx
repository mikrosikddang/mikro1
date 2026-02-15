import { redirect } from "next/navigation";
import Link from "next/link";
import Container from "@/components/Container";
import { getSession, canAccessSellerFeatures } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatKrw } from "@/lib/format";

interface PageProps {
  searchParams: Promise<{ ids?: string }>;
}

export default async function OrderSuccessPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const idsParam = params.ids;

  // Check if ids parameter exists
  if (!idsParam) {
    return (
      <Container>
        <div className="py-16 text-center">
          <h1 className="text-[24px] font-bold text-black mb-4">
            주문 정보를 찾을 수 없습니다
          </h1>
          <p className="text-[14px] text-gray-600 mb-6">
            주문 ID가 제공되지 않았습니다.
          </p>
          <Link
            href="/"
            className="inline-block px-6 py-3 bg-black text-white rounded-xl text-[16px] font-bold"
          >
            홈으로
          </Link>
        </div>
      </Container>
    );
  }

  // Check authentication
  const session = await getSession();
  if (!session) {
    redirect(`/login?next=${encodeURIComponent(`/orders/success?ids=${idsParam}`)}`);
  }

  if (canAccessSellerFeatures(session.role)) {
    return (
      <Container>
        <div className="py-16 text-center">
          <h1 className="text-[24px] font-bold text-black mb-4">
            접근 권한이 없습니다
          </h1>
          <p className="text-[14px] text-gray-600 mb-6">
            판매자는 구매 주문을 볼 수 없습니다.
          </p>
          <Link
            href="/"
            className="inline-block px-6 py-3 bg-black text-white rounded-xl text-[16px] font-bold"
          >
            홈으로
          </Link>
        </div>
      </Container>
    );
  }

  // Parse IDs
  const orderIds = idsParam.split(",").filter(Boolean);

  if (orderIds.length === 0) {
    return (
      <Container>
        <div className="py-16 text-center">
          <h1 className="text-[24px] font-bold text-black mb-4">
            주문 정보를 찾을 수 없습니다
          </h1>
          <Link
            href="/"
            className="inline-block px-6 py-3 bg-black text-white rounded-xl text-[16px] font-bold"
          >
            홈으로
          </Link>
        </div>
      </Container>
    );
  }

  // Fetch orders
  const orders = await prisma.order.findMany({
    where: {
      id: { in: orderIds },
      buyerId: session.userId,
    },
    include: {
      items: {
        include: {
          product: {
            select: {
              id: true,
              title: true,
              priceKrw: true,
            },
          },
          variant: {
            select: {
              id: true,
              sizeLabel: true,
              color: true,
            },
          },
        },
      },
      seller: {
        include: {
          sellerProfile: {
            select: {
              shopName: true,
            },
          },
        },
      },
    },
  });

  if (orders.length === 0) {
    return (
      <Container>
        <div className="py-16 text-center">
          <h1 className="text-[24px] font-bold text-black mb-4">
            주문을 찾을 수 없습니다
          </h1>
          <p className="text-[14px] text-gray-600 mb-6">
            요청하신 주문 정보를 찾을 수 없거나 접근 권한이 없습니다.
          </p>
          <Link
            href="/"
            className="inline-block px-6 py-3 bg-black text-white rounded-xl text-[16px] font-bold"
          >
            홈으로
          </Link>
        </div>
      </Container>
    );
  }

  // Order orders to match input order
  const orderedOrders = orderIds
    .map((id) => orders.find((o) => o.id === id))
    .filter((order): order is NonNullable<typeof order> => order !== undefined);

  // Status badge helper
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PAID":
        return (
          <span className="px-3 py-1 bg-green-100 text-green-700 text-[12px] font-bold rounded-full">
            결제완료
          </span>
        );
      case "PENDING":
        return (
          <span className="px-3 py-1 bg-gray-100 text-gray-700 text-[12px] font-bold rounded-full">
            대기중
          </span>
        );
      case "CANCELLED":
      case "CANCELED":
        return (
          <span className="px-3 py-1 bg-red-100 text-red-700 text-[12px] font-bold rounded-full">
            취소됨
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 bg-gray-100 text-gray-700 text-[12px] font-bold rounded-full">
            {status}
          </span>
        );
    }
  };

  return (
    <Container>
      <div className="py-6">
        {/* Success header */}
        <div className="text-center mb-8">
          <h1 className="text-[28px] font-bold text-black mb-2">
            주문이 완료되었습니다
          </h1>
          <p className="text-[14px] text-gray-600">
            판매자별로 주문이 생성되었습니다
          </p>
        </div>

        {/* Order cards */}
        <div className="space-y-6">
          {orderedOrders.map((order) => {
            const shopName =
              order.seller.sellerProfile?.shopName || "알수없음";

            return (
              <div
                key={order.id}
                className="bg-white rounded-xl border border-gray-200 p-4"
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-100">
                  <div>
                    <h2 className="text-[18px] font-bold text-black">
                      {shopName}
                    </h2>
                    <p className="text-[13px] text-gray-500 mt-1">
                      주문번호: {order.orderNo}
                    </p>
                  </div>
                  {getStatusBadge(order.status)}
                </div>

                {/* Items */}
                <div className="space-y-3 mb-4 pb-4 border-b border-gray-100">
                  {order.items.map((item) => {
                    const sizeLabel =
                      item.variant?.sizeLabel === "FREE"
                        ? "FREE"
                        : item.variant?.sizeLabel || "";
                    const lineTotal = item.unitPriceKrw * item.quantity;

                    return (
                      <div key={item.id} className="flex justify-between">
                        <div className="flex-1">
                          <p className="text-[14px] font-medium text-black">
                            {item.product.title}
                          </p>
                          <p className="text-[13px] text-gray-500 mt-1">
                            {sizeLabel && `사이즈: ${sizeLabel} / `}수량:{" "}
                            {item.quantity}개
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[14px] font-bold text-black">
                            {formatKrw(lineTotal)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Price summary */}
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-[14px]">
                    <span className="text-gray-600">상품 합계</span>
                    <span className="font-medium text-black">
                      {formatKrw(order.itemsSubtotalKrw)}
                    </span>
                  </div>
                  <div className="flex justify-between text-[14px]">
                    <span className="text-gray-600">배송비</span>
                    <span className="font-medium text-black">
                      {order.shippingFeeKrw === 0 ? (
                        <span className="text-green-600">무료</span>
                      ) : (
                        formatKrw(order.shippingFeeKrw)
                      )}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-gray-200 flex justify-between">
                    <span className="text-[16px] font-bold text-black">
                      총 결제금액
                    </span>
                    <span className="text-[20px] font-bold text-black">
                      {formatKrw(order.totalPayKrw)}
                    </span>
                  </div>
                </div>

                {/* Order detail button */}
                <Link
                  href={`/orders/${order.id}`}
                  className="block w-full h-[48px] bg-gray-100 text-gray-700 rounded-xl text-[16px] font-bold flex items-center justify-center active:bg-gray-200 transition-colors"
                >
                  주문 상세 보기
                </Link>
              </div>
            );
          })}
        </div>

        {/* Global actions */}
        <div className="mt-8 space-y-3">
          <Link
            href="/"
            className="block w-full h-[56px] bg-black text-white rounded-xl text-[18px] font-bold flex items-center justify-center active:bg-gray-800 transition-colors"
          >
            홈으로
          </Link>
        </div>
      </div>
    </Container>
  );
}
