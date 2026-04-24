import { prisma } from "@/lib/prisma";
import { formatKrw, formatKstDateTime } from "@/lib/format";
import PayoutRequestButton from "./PayoutRequestButton";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const STATUS_LABEL: Record<string, string> = {
  REQUESTED: "요청됨",
  IN_PROGRESS: "진행중",
  COMPLETED: "완료",
  FAILED: "실패",
  CANCELLED: "취소",
};

const STATUS_COLOR: Record<string, string> = {
  REQUESTED: "bg-amber-100 text-amber-700",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  COMPLETED: "bg-green-100 text-green-700",
  FAILED: "bg-red-100 text-red-700",
  CANCELLED: "bg-gray-100 text-gray-500",
};

export default async function AdminPayoutsPage() {
  const payableRows = await prisma.orderCommission.groupBy({
    by: ["beneficiaryUserId"],
    where: {
      status: "PAYABLE",
      payoutId: null,
      beneficiaryUserId: { not: null },
    },
    _sum: { commissionAmountKrw: true },
    _count: { _all: true },
  });

  const userIds = payableRows
    .map((r) => r.beneficiaryUserId)
    .filter((id): id is string => Boolean(id));

  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: {
      id: true,
      name: true,
      email: true,
      sellerProfile: {
        select: {
          id: true,
          shopName: true,
          tossSellerId: true,
          tossSellerStatus: true,
          settlementBank: true,
          settlementAccountNo: true,
          settlementAccountHolder: true,
        },
      },
    },
  });
  const userMap = new Map(users.map((u) => [u.id, u]));

  const payableByUser = payableRows
    .map((r) => ({
      beneficiaryUserId: r.beneficiaryUserId!,
      totalAmountKrw: r._sum.commissionAmountKrw ?? 0,
      commissionCount: r._count._all,
      user: userMap.get(r.beneficiaryUserId!) ?? null,
    }))
    .sort((a, b) => b.totalAmountKrw - a.totalAmountKrw);

  const recentPayouts = await prisma.payout.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      beneficiaryUser: {
        select: {
          id: true,
          name: true,
          sellerProfile: { select: { shopName: true, tossSellerId: true } },
        },
      },
      _count: { select: { commissions: true } },
    },
  });

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold">정산 (지급대행)</h1>
        <p className="mt-1 text-sm text-gray-600">
          토스페이먼츠 지급대행으로 수익자별 미지급 커미션을 일괄 송금합니다.
        </p>
      </header>

      {/* 주의 배너 */}
      <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
        <p className="font-semibold">⚠️ 지급대행 사전 체크리스트</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>토스페이먼츠 영업팀과 <strong>지급대행 서비스 계약</strong> 체결 완료</li>
          <li>가맹점 대시보드에서 지급대행 활성화</li>
          <li>수익자의 <strong>토스 셀러 등록 (KYC_APPROVED)</strong> 완료</li>
          <li>환경변수 <code>TOSS_PAYOUT_SECRET_KEY</code> 설정 (결제 키와 다를 경우)</li>
        </ul>
      </div>

      {/* 지급 대기 (PAYABLE) */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">지급 대기 수익자</h2>
        {payableByUser.length === 0 ? (
          <p className="rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500">
            지급 대기 중인 커미션이 없습니다.
          </p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3 text-left">수익자</th>
                  <th className="px-4 py-3 text-left">토스 셀러 ID</th>
                  <th className="px-4 py-3 text-left">계좌</th>
                  <th className="px-4 py-3 text-right">건수</th>
                  <th className="px-4 py-3 text-right">지급 금액</th>
                  <th className="px-4 py-3 text-center">작업</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {payableByUser.map((row) => {
                  const sp = row.user?.sellerProfile;
                  const hasTossSeller = Boolean(sp?.tossSellerId);
                  return (
                    <tr key={row.beneficiaryUserId}>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">
                          {sp?.shopName ?? row.user?.name ?? "(이름 없음)"}
                        </div>
                        <div className="text-xs text-gray-500">{row.user?.email}</div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">
                        {sp?.tossSellerId ? (
                          <span className="font-mono">{sp.tossSellerId}</span>
                        ) : (
                          <span className="text-red-600">미등록</span>
                        )}
                        {sp?.tossSellerStatus && (
                          <div className="mt-0.5 text-[11px]">상태: {sp.tossSellerStatus}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">
                        {sp?.settlementBank ?? "-"}
                        <br />
                        <span className="font-mono">
                          {sp?.settlementAccountNo ?? "-"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {row.commissionCount}건
                      </td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums">
                        {formatKrw(row.totalAmountKrw)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {hasTossSeller ? (
                          <PayoutRequestButton
                            beneficiaryUserId={row.beneficiaryUserId}
                            amountKrw={row.totalAmountKrw}
                          />
                        ) : sp ? (
                          <Link
                            href={`/admin/sellers`}
                            className="text-xs font-medium text-blue-600 hover:underline"
                          >
                            셀러 등록 필요
                          </Link>
                        ) : (
                          <span className="text-xs text-gray-400">셀러 프로필 없음</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 최근 지급 내역 */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">최근 지급 내역</h2>
        {recentPayouts.length === 0 ? (
          <p className="rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500">
            지급 내역이 없습니다.
          </p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3 text-left">요청일시</th>
                  <th className="px-4 py-3 text-left">수익자</th>
                  <th className="px-4 py-3 text-left">토스 Payout ID</th>
                  <th className="px-4 py-3 text-right">금액</th>
                  <th className="px-4 py-3 text-right">건수</th>
                  <th className="px-4 py-3 text-center">상태</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentPayouts.map((p) => {
                  const shop = p.beneficiaryUser.sellerProfile?.shopName;
                  return (
                    <tr key={p.id}>
                      <td className="px-4 py-3 text-xs text-gray-600">
                        {formatKstDateTime(p.requestedAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{shop ?? p.beneficiaryUser.name ?? "-"}</div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-600">
                        {p.tossPayoutId ?? "-"}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {formatKrw(p.amountKrw)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {p._count.commissions}건
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-semibold ${
                            STATUS_COLOR[p.status] ?? "bg-gray-100"
                          }`}
                        >
                          {STATUS_LABEL[p.status] ?? p.status}
                        </span>
                        {p.failureReason && (
                          <div className="mt-1 text-[11px] text-red-600">
                            {p.failureReason.slice(0, 60)}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
