import { redirect } from "next/navigation";
import Link from "next/link";
import Container from "@/components/Container";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatKrw } from "@/lib/format";

export default async function OrdersPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login?next=/orders");
  }

  // Phase 2: Sellers can now purchase, so they can view their buyer orders
  const orders = await prisma.order.findMany({
    where: {
      buyerId: session.userId,
    },
    include: {
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
    orderBy: {
      createdAt: "desc",
    },
  });

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
          <span className="px-3 py-1 bg-yellow-100 text-yellow-700 text-[12px] font-bold rounded-full">
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
      case "PREPARING":
        return (
          <span className="px-3 py-1 bg-blue-100 text-blue-700 text-[12px] font-bold rounded-full">
            준비중
          </span>
        );
      case "SHIPPING":
        return (
          <span className="px-3 py-1 bg-purple-100 text-purple-700 text-[12px] font-bold rounded-full">
            배송중
          </span>
        );
      case "DELIVERED":
        return (
          <span className="px-3 py-1 bg-gray-100 text-gray-700 text-[12px] font-bold rounded-full">
            배송완료
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

  const formatDate = (date: Date) => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  return (
    <Container>
      <div className="py-6 pb-24">
        <h1 className="text-[24px] font-bold text-black mb-6">주문 내역</h1>

        {orders.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-[18px] font-medium text-gray-500 mb-6">
              주문 내역이 없습니다
            </p>
            <Link
              href="/"
              className="inline-block px-6 py-3 bg-black text-white rounded-xl text-[16px] font-bold active:bg-gray-800 transition-colors"
            >
              홈으로 가기
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const shopName =
                order.seller.sellerProfile?.shopName || "알수없음";

              return (
                <div
                  key={order.id}
                  className="p-4 bg-white rounded-xl border border-gray-200"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-[16px] font-bold text-black">
                        {shopName}
                      </p>
                      <p className="text-[13px] text-gray-500 mt-1">
                        {order.orderNo}
                      </p>
                    </div>
                    {getStatusBadge(order.status)}
                  </div>

                  <div className="space-y-2 mb-3">
                    <div className="flex justify-between text-[14px]">
                      <span className="text-gray-600">결제 금액</span>
                      <span className="font-bold text-black">
                        {formatKrw(order.totalPayKrw)}
                      </span>
                    </div>
                    <div className="flex justify-between text-[14px]">
                      <span className="text-gray-600">주문일</span>
                      <span className="text-gray-700">
                        {formatDate(order.createdAt)}
                      </span>
                    </div>
                  </div>

                  <Link
                    href={`/orders/${order.id}`}
                    className="block w-full h-[40px] bg-gray-100 text-gray-700 rounded-lg text-[14px] font-medium flex items-center justify-center active:bg-gray-200 transition-colors"
                  >
                    상세보기
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Container>
  );
}
