import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatKrw } from "@/lib/format";
import CampaignStatusButtons from "@/components/admin/CampaignStatusButtons";
import { CampaignStatus } from "@prisma/client";

const CAMPAIGN_STATUS_LABELS: Record<CampaignStatus, string> = {
  DRAFT: "초안",
  ACTIVE: "운영중",
  ENDED: "종료",
  ARCHIVED: "보관",
};

function getCampaignStatusLabel(status: CampaignStatus) {
  return CAMPAIGN_STATUS_LABELS[status];
}

type Props = {
  searchParams: Promise<{ sellerId?: string }>;
};

export default async function AdminCampaignsPage({ searchParams }: Props) {
  const { sellerId } = await searchParams;
  const campaigns = await prisma.campaign.findMany({
    where: sellerId ? { sellerId } : undefined,
    orderBy: { createdAt: "desc" },
    include: {
      seller: {
        select: {
          id: true,
          sellerProfile: {
            select: {
              shopName: true,
              creatorSlug: true,
              sellerKind: true,
            },
          },
        },
      },
      _count: {
        select: {
          visits: true,
          orderAttributions: true,
          orderCommissions: true,
        },
      },
      products: {
        select: {
          id: true,
        },
      },
    },
  });

  const commissions = await prisma.orderCommission.findMany({
    where: {
      campaignId: { in: campaigns.map((campaign) => campaign.id) },
    },
    select: {
      campaignId: true,
      commissionAmountKrw: true,
      commissionBaseKrw: true,
      status: true,
    },
  });

  const metricMap = commissions.reduce<
    Record<string, { grossSalesKrw: number; commissionKrw: number; payableKrw: number }>
  >((acc, item) => {
    if (!item.campaignId) return acc;
    if (!acc[item.campaignId]) {
      acc[item.campaignId] = { grossSalesKrw: 0, commissionKrw: 0, payableKrw: 0 };
    }
    acc[item.campaignId].grossSalesKrw += item.commissionBaseKrw;
    acc[item.campaignId].commissionKrw += item.commissionAmountKrw;
    if (item.status === "PAYABLE" || item.status === "SETTLED") {
      acc[item.campaignId].payableKrw += item.commissionAmountKrw;
    }
    return acc;
  }, {});

  const campaignIds = campaigns.map((campaign) => campaign.id);
  const recentActions = campaignIds.length
    ? await prisma.adminActionLog.findMany({
        where: {
          entityType: "CAMPAIGN",
          entityId: { in: campaignIds },
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
      })
    : [];

  const recentActionMap = recentActions.reduce<
    Record<string, (typeof recentActions)[number]>
  >((acc, action) => {
    if (!acc[action.entityId]) {
      acc[action.entityId] = action;
    }
    return acc;
  }, {});

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">공동구매 캠페인 관리</h1>
          <p className="mt-1 text-sm text-gray-500">
            캠페인 링크, 귀속 주문, 예상 정산을 운영자가 한 번에 확인합니다.
          </p>
          {sellerId ? (
            <p className="mt-2 text-sm text-gray-500">판매자 필터 적용 중: {sellerId}</p>
          ) : null}
        </div>
      </div>

      {campaigns.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white py-12 text-center text-gray-500">
          등록된 캠페인이 없습니다.
        </div>
      ) : (
        <div className="space-y-4">
          {campaigns.map((campaign) => (
            <div
              key={campaign.id}
              className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
            >
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">
                    {campaign.title}
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    {campaign.seller.sellerProfile?.shopName || "미지정"} · /c/{campaign.slug}
                  </p>
                  <p className="mt-1 text-xs text-gray-400">
                    ref {campaign.refCode} · creator {campaign.seller.sellerProfile?.creatorSlug || "-"}
                  </p>
                </div>
                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                  {getCampaignStatusLabel(campaign.status)}
                </span>
              </div>

              <div className="mb-4 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">연결 상품 수</p>
                  <p className="font-medium text-gray-900">{campaign.products.length}</p>
                </div>
                <div>
                  <p className="text-gray-500">방문 수</p>
                  <p className="font-medium text-gray-900">{campaign._count.visits}</p>
                </div>
                <div>
                  <p className="text-gray-500">귀속 주문</p>
                  <p className="font-medium text-gray-900">{campaign._count.orderAttributions}</p>
                </div>
                <div>
                  <p className="text-gray-500">수수료율</p>
                  <p className="font-medium text-gray-900">
                    {((campaign.defaultCommissionRateBps ?? 0) / 100).toFixed(2)}%
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">귀속 매출</p>
                  <p className="font-medium text-gray-900">
                    {formatKrw(metricMap[campaign.id]?.grossSalesKrw ?? 0)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">예상 수수료</p>
                  <p className="font-medium text-gray-900">
                    {formatKrw(metricMap[campaign.id]?.commissionKrw ?? 0)}
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <a
                  href={`/c/${campaign.slug}?campaign=${campaign.slug}&ref=${campaign.seller.sellerProfile?.creatorSlug || campaign.refCode}`}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white"
                >
                  랜딩 열기
                </a>
                <Link
                  href={`/admin/sellers?status=ALL&userId=${campaign.seller.id}`}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700"
                >
                  판매자 보기
                </Link>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <CampaignStatusButtons
                  campaignId={campaign.id}
                  currentStatus={campaign.status}
                />
              </div>

              {recentActionMap[campaign.id] ? (
                <div className="mt-4 rounded-xl bg-gray-50 p-4 text-sm text-gray-700">
                  <p className="font-medium text-gray-900">최근 관리자 액션</p>
                  <p className="mt-2">{recentActionMap[campaign.id].summary}</p>
                  {recentActionMap[campaign.id].reason ? (
                    <p className="mt-1 text-gray-600">{recentActionMap[campaign.id].reason}</p>
                  ) : null}
                  <p className="mt-2 text-xs text-gray-400">
                    {recentActionMap[campaign.id].admin.name ||
                      recentActionMap[campaign.id].admin.email ||
                      recentActionMap[campaign.id].admin.id}{" "}
                    ·{" "}
                    {new Date(recentActionMap[campaign.id].createdAt).toLocaleString("ko-KR")}
                  </p>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
