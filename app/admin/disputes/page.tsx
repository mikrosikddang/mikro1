import Link from "next/link";
import { prisma } from "@/lib/prisma";

type Props = {
  searchParams: Promise<{ orderId?: string }>;
};

export default async function AdminDisputesPage({ searchParams }: Props) {
  const { orderId } = await searchParams;

  const notes = await prisma.adminActionLog.findMany({
    where: {
      entityType: "ORDER",
      action: "ORDER_NOTE_ADDED",
      ...(orderId ? { entityId: orderId } : {}),
    },
    include: {
      admin: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const orderIds = Array.from(new Set(notes.map((note) => note.entityId)));
  const orders = orderIds.length
    ? await prisma.order.findMany({
        where: {
          id: { in: orderIds },
        },
        include: {
          seller: {
            select: {
              id: true,
              sellerProfile: {
                select: {
                  shopName: true,
                },
              },
            },
          },
          buyer: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      })
    : [];

  const orderMap = orders.reduce<Record<string, (typeof orders)[number]>>((acc, order) => {
    acc[order.id] = order;
    return acc;
  }, {});

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">분쟁 처리</h1>
        <p className="mt-1 text-sm text-gray-500">
          전체 분쟁 워크플로 대신 주문 운영 메모를 중심으로 이슈를 추적합니다.
        </p>
        {orderId ? (
          <p className="mt-2 text-sm text-gray-500">주문 필터 적용 중: {orderId}</p>
        ) : null}
      </div>

      {notes.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
          <p className="text-lg font-medium text-gray-900">기록된 분쟁 메모가 없습니다</p>
          <p className="mt-2 text-sm text-gray-600">
            주문 상세에서 운영 메모를 추가하면 이 화면에 함께 노출됩니다.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {notes.map((note) => {
            const order = orderMap[note.entityId];

            return (
              <div
                key={note.id}
                className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
              >
                <div className="mb-3 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {order ? `주문번호 ${order.orderNo}` : `주문 ${note.entityId}`}
                    </p>
                    <p className="mt-1 text-sm text-gray-500">
                      판매자: {order?.seller.sellerProfile?.shopName || order?.seller.id || "-"} ·
                      구매자: {order?.buyer.name || order?.buyer.email || order?.buyer.id || "-"}
                    </p>
                  </div>
                  <Link
                    href={`/admin/orders/${note.entityId}`}
                    className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    주문 상세 보기
                  </Link>
                </div>

                <div className="rounded-xl bg-gray-50 p-4">
                  <p className="font-medium text-gray-900">{note.summary}</p>
                  {note.reason ? (
                    <p className="mt-2 whitespace-pre-line text-sm text-gray-700">
                      {note.reason}
                    </p>
                  ) : null}
                  <p className="mt-3 text-xs text-gray-400">
                    {note.admin.name || note.admin.email || note.admin.id} ·{" "}
                    {new Date(note.createdAt).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
