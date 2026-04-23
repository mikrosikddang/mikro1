import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSession, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatKrw } from "@/lib/format";
import { getStatusColor, getStatusLabel } from "@/lib/orderState";
import AdminOrderOverrideButton from "@/components/admin/AdminOrderOverrideButton";
import AdminOrderNotesPanel from "@/components/admin/AdminOrderNotesPanel";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function AdminOrderDetailPage({ params }: Props) {
  const session = await getSession();
  if (!session || !isAdmin(session.role)) {
    notFound();
  }

  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: {
        include: {
          product: {
            select: {
              id: true,
              title: true,
              images: {
                where: { kind: "MAIN" },
                orderBy: { sortOrder: "asc" },
                take: 1,
              },
            },
          },
          variant: {
            select: {
              color: true,
              sizeLabel: true,
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
      seller: {
        select: {
          id: true,
          email: true,
          name: true,
          sellerProfile: {
            select: {
              id: true,
              shopName: true,
              storeSlug: true,
            },
          },
        },
      },
      payment: true,
      shipment: true,
      attribution: {
        include: {
          campaign: {
            select: {
              id: true,
              title: true,
              slug: true,
            },
          },
          referrerUser: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      },
      commission: {
        include: {
          beneficiaryUser: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
          campaign: {
            select: {
              id: true,
              title: true,
              slug: true,
            },
          },
        },
      },
    },
  });

  if (!order) {
    notFound();
  }

  const [auditLogs, adminActionLogs] = await Promise.all([
    prisma.orderAuditLog.findMany({
      where: { orderId: order.id },
      orderBy: { createdAt: "desc" },
    }),
    prisma.adminActionLog.findMany({
      where: {
        entityType: "ORDER",
        entityId: order.id,
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
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/admin/orders"
            className="text-sm font-medium text-blue-600 hover:underline"
          >
            ← 주문 목록으로
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-gray-900">주문 상세</h1>
          <p className="mt-1 text-sm text-gray-500">
            주문번호 {order.orderNo} · {new Date(order.createdAt).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`rounded-full px-3 py-1 text-sm font-semibold ${getStatusColor(order.status)}`}
          >
            {getStatusLabel(order.status)}
          </span>
          <Link
            href={`/admin/disputes?orderId=${order.id}`}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            분쟁 메모 보기
          </Link>
          <AdminOrderOverrideButton orderId={order.id} currentStatus={order.status} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">총 결제 금액</p>
          <p className="mt-2 text-xl font-bold text-gray-900">{formatKrw(order.totalPayKrw)}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">상품 금액</p>
          <p className="mt-2 text-xl font-bold text-gray-900">{formatKrw(order.itemsSubtotalKrw)}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">배송비</p>
          <p className="mt-2 text-xl font-bold text-gray-900">{formatKrw(order.shippingFeeKrw)}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">결제 상태</p>
          <p className="mt-2 text-xl font-bold text-gray-900">
            {order.payment?.status ?? "결제 정보 없음"}
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="text-lg font-bold text-gray-900">구매자 정보</h2>
          <div className="mt-4 space-y-2 text-sm text-gray-700">
            <p>이름: {order.buyer.name || "-"}</p>
            <p>이메일: {order.buyer.email || "-"}</p>
            <p>사용자 ID: {order.buyer.id}</p>
          </div>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-gray-900">판매자 정보</h2>
              <div className="mt-4 space-y-2 text-sm text-gray-700">
                <p>상점명: {order.seller.sellerProfile?.shopName || "-"}</p>
                <p>이름: {order.seller.name || "-"}</p>
                <p>이메일: {order.seller.email || "-"}</p>
                <p>사용자 ID: {order.seller.id}</p>
              </div>
            </div>
            <Link
              href={`/admin/sellers?status=ALL&userId=${order.seller.id}`}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              판매자 보기
            </Link>
          </div>
        </section>
      </div>

      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="text-lg font-bold text-gray-900">주문 상품</h2>
        <div className="mt-4 space-y-4">
          {order.items.map((item) => {
            const imageUrl = item.product.images[0]?.url || "/placeholder.png";
            const optionLabel =
              item.variant?.color && item.variant.color !== "FREE"
                ? `${item.variant.color} / ${item.variant.sizeLabel || "N/A"}`
                : item.variant?.sizeLabel || "FREE";

            return (
              <div
                key={item.id}
                className="flex gap-4 rounded-xl border border-gray-100 p-4"
              >
                <div className="relative h-20 w-20 overflow-hidden rounded-lg bg-gray-100">
                  <Image
                    src={imageUrl}
                    alt={item.product.title}
                    fill
                    className="object-cover"
                    sizes="80px"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <Link href={`/p/${item.product.id}`} className="text-base font-semibold text-gray-900 hover:underline">
                    {item.product.title}
                  </Link>
                  <p className="mt-1 text-sm text-gray-500">옵션: {optionLabel}</p>
                  <p className="text-sm text-gray-500">수량: {item.quantity}개</p>
                  <p className="mt-2 text-sm font-semibold text-gray-900">
                    단가 {formatKrw(item.unitPriceKrw)} · 합계 {formatKrw(item.unitPriceKrw * item.quantity)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="text-lg font-bold text-gray-900">배송 및 결제 정보</h2>
          <div className="mt-4 space-y-2 text-sm text-gray-700">
            <p>받는 사람: {order.shipToName || "-"}</p>
            <p>연락처: {order.shipToPhone || "-"}</p>
            <p>
              주소:{" "}
              {order.shipToAddr1
                ? `${order.shipToZip ? `(${order.shipToZip}) ` : ""}${order.shipToAddr1} ${order.shipToAddr2 || ""}`
                : "-"}
            </p>
            <p>배송 메모: {order.shipToMemo || "-"}</p>
            <p>배송사: {order.shipment?.courier || "-"}</p>
            <p>송장번호: {order.shipment?.trackingNo || "-"}</p>
            <p>결제 수단: {order.payment?.method || "-"}</p>
            <p>결제 키: {order.payment?.paymentKey || "-"}</p>
          </div>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="text-lg font-bold text-gray-900">귀속 및 정산 정보</h2>
          <div className="mt-4 space-y-2 text-sm text-gray-700">
            <p>refCode: {order.attribution?.refCode || "-"}</p>
            <p>creatorSlug: {order.attribution?.creatorSlug || "-"}</p>
            <p>
              귀속 캠페인:{" "}
              {order.attribution?.campaign ? (
                <Link href="/admin/campaigns" className="text-blue-600 hover:underline">
                  {order.attribution.campaign.title} (/c/{order.attribution.campaign.slug})
                </Link>
              ) : (
                "-"
              )}
            </p>
            <p>
              추천 사용자:{" "}
              {order.attribution?.referrerUser
                ? order.attribution.referrerUser.name ||
                  order.attribution.referrerUser.email ||
                  order.attribution.referrerUser.id
                : "-"}
            </p>
            <p>
              커미션 수혜자:{" "}
              {order.commission?.beneficiaryUser
                ? order.commission.beneficiaryUser.name ||
                  order.commission.beneficiaryUser.email ||
                  order.commission.beneficiaryUser.id
                : "-"}
            </p>
            <p>
              커미션율:{" "}
              {order.commission ? `${(order.commission.commissionRateBps / 100).toFixed(2)}%` : "-"}
            </p>
            <p>커미션 기준 금액: {order.commission ? formatKrw(order.commission.commissionBaseKrw) : "-"}</p>
            <p>커미션 금액: {order.commission ? formatKrw(order.commission.commissionAmountKrw) : "-"}</p>
            <p>커미션 상태: {order.commission?.status || "-"}</p>
          </div>
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="text-lg font-bold text-gray-900">주문 상태 변경 이력</h2>
          <div className="mt-4 space-y-3">
            {auditLogs.length === 0 ? (
              <p className="text-sm text-gray-500">아직 관리자 상태 변경 이력이 없습니다.</p>
            ) : (
              auditLogs.map((log) => (
                <div key={log.id} className="rounded-xl bg-gray-50 p-4 text-sm text-gray-700">
                  <p className="font-semibold text-gray-900">
                    {getStatusLabel(log.from)} → {getStatusLabel(log.to)}
                  </p>
                  <p className="mt-1 text-gray-600">{log.reason}</p>
                  <p className="mt-2 text-xs text-gray-400">
                    admin {log.adminId} · {new Date(log.createdAt).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}
                  </p>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <AdminOrderNotesPanel orderId={order.id} initialNotes={adminActionLogs} />
        </section>
      </div>
    </div>
  );
}
