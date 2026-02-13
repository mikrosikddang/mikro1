import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import Container from "@/components/Container";
import OrderActions from "@/components/OrderActions";
import { formatKrw } from "@/lib/format";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStatusLabel, getStatusColor } from "@/lib/orderState";

type Props = { params: Promise<{ id: string }> };

export default async function OrderDetailPage({ params }: Props) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const { id } = await params;

  // Fetch order from database
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: {
        include: {
          product: {
            include: {
              images: {
                where: { kind: "MAIN" },
                orderBy: { sortOrder: "asc" },
                take: 1,
              },
            },
          },
          variant: true,
        },
      },
      buyer: { select: { id: true, name: true } },
      seller: {
        select: {
          id: true,
          sellerProfile: { select: { shopName: true } },
        },
      },
    },
  });

  if (!order) notFound();

  // Check permission: buyer or seller only
  const isBuyer = order.buyerId === session.userId;
  const isSeller = order.sellerId === session.userId;
  const isAdmin = (session.role as string) === "ADMIN";

  if (!isBuyer && !isSeller && !isAdmin) {
    return (
      <Container>
        <div className="py-8 text-center text-red-500">
          접근 권한이 없습니다
        </div>
      </Container>
    );
  }

  const shopName = order.seller.sellerProfile?.shopName ?? "알수없음";
  const statusLabel = getStatusLabel(order.status);
  const statusColor = getStatusColor(order.status);

  return (
    <Container>
      <div className="py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-[24px] font-bold text-black">주문 상세</h1>
          <p className="text-[14px] text-gray-500 mt-1">
            주문번호: {order.orderNo}
          </p>
          <p className="text-[14px] text-gray-500">
            주문일시:{" "}
            {new Date(order.createdAt).toLocaleString("ko-KR", {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>

        {/* Status */}
        <div className="mb-6 p-4 bg-gray-50 rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-[14px] text-gray-600">주문 상태</span>
            <span className={`px-4 py-2 rounded-full text-[14px] font-bold ${statusColor}`}>
              {statusLabel}
            </span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="mb-6">
          <OrderActions
            orderId={order.id}
            currentStatus={order.status}
            userRole={session.role}
            isBuyer={isBuyer}
            isSeller={isSeller}
          />
        </div>

        {/* Seller info */}
        <div className="mb-6">
          <h2 className="text-[16px] font-bold text-black mb-3">판매자 정보</h2>
          <Link
            href={`/s/${order.sellerId}`}
            className="inline-flex items-center gap-2 p-3 bg-white rounded-xl border border-gray-100 hover:border-gray-200 transition-colors"
          >
            <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-[14px] font-bold text-gray-500">
              {shopName.charAt(0)}
            </div>
            <span className="text-[15px] font-medium text-gray-700">
              {shopName}
            </span>
          </Link>
        </div>

        {/* Order items */}
        <div className="mb-6">
          <h2 className="text-[16px] font-bold text-black mb-3">주문 상품</h2>
          <div className="space-y-3">
            {order.items.map((item: any) => {
              const imageUrl = item.product.images[0]?.url || "/placeholder.png";
              const sizeLabel =
                item.variant?.sizeLabel === "FREE"
                  ? "FREE"
                  : item.variant?.sizeLabel || "N/A";
              const subtotal = item.unitPriceKrw * item.quantity;

              return (
                <div
                  key={item.id}
                  className="flex gap-4 p-4 bg-white rounded-xl border border-gray-100"
                >
                  <Link href={`/p/${item.productId}`}>
                    <img
                      src={imageUrl}
                      alt={item.product.title}
                      className="w-20 h-20 rounded-lg object-cover"
                    />
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link href={`/p/${item.productId}`}>
                      <h3 className="text-[16px] font-bold text-black truncate">
                        {item.product.title}
                      </h3>
                    </Link>
                    <p className="text-[13px] text-gray-500 mt-1">
                      사이즈: {sizeLabel}
                    </p>
                    <p className="text-[13px] text-gray-500">
                      수량: {item.quantity}개
                    </p>
                    <p className="text-[16px] font-bold text-black mt-2">
                      {formatKrw(subtotal)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Price summary */}
        <div className="mb-6 p-4 bg-gray-50 rounded-xl space-y-2">
          <div className="flex justify-between text-[14px]">
            <span className="text-gray-600">상품 금액</span>
            <span className="font-medium text-black">
              {formatKrw(order.totalAmountKrw)}
            </span>
          </div>
          <div className="flex justify-between text-[14px]">
            <span className="text-gray-600">배송비</span>
            <span className="font-medium text-black">
              {formatKrw(order.shippingFeeKrw)}
            </span>
          </div>
          <div className="pt-2 border-t border-gray-200 flex justify-between items-center">
            <span className="text-[16px] font-bold text-black">총 결제 금액</span>
            <span className="text-[24px] font-bold text-black">
              {formatKrw(order.totalAmountKrw + order.shippingFeeKrw)}
            </span>
          </div>
        </div>

        {/* Shipping info (if available) */}
        {order.shipToName && (
          <div className="mb-6">
            <h2 className="text-[16px] font-bold text-black mb-3">배송 정보</h2>
            <div className="p-4 bg-white rounded-xl border border-gray-100 space-y-1 text-[14px]">
              <p>
                <span className="text-gray-600">받는 사람:</span>{" "}
                <span className="font-medium text-black">{order.shipToName}</span>
              </p>
              <p>
                <span className="text-gray-600">연락처:</span>{" "}
                <span className="font-medium text-black">{order.shipToPhone}</span>
              </p>
              <p>
                <span className="text-gray-600">주소:</span>{" "}
                <span className="font-medium text-black">
                  {order.shipToZip && `(${order.shipToZip}) `}
                  {order.shipToAddr1} {order.shipToAddr2}
                </span>
              </p>
              {order.shipToMemo && (
                <p>
                  <span className="text-gray-600">배송 메모:</span>{" "}
                  <span className="font-medium text-black">{order.shipToMemo}</span>
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </Container>
  );
}
