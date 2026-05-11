import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatKrw } from "@/lib/format";

export default async function SellerSettlementsPage() {
  const session = await getSession();
  const sellerId = session!.userId; // seller layout guard guarantees access

  const [pending, payable, recentPayouts] = await Promise.all([
    prisma.orderCommission.aggregate({
      where: {
        beneficiaryUserId: sellerId,
        status: "PENDING",
      },
      _sum: { commissionAmountKrw: true },
    }),
    prisma.orderCommission.aggregate({
      where: {
        beneficiaryUserId: sellerId,
        status: "PAYABLE",
      },
      _sum: { commissionAmountKrw: true },
    }),
    prisma.payout.findMany({
      where: { beneficiaryUserId: sellerId },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  return (
    <div className="pb-20">
      <div className="mb-5">
        <h1 className="text-[20px] font-bold text-black">정산 내역</h1>
        <p className="mt-1 text-[13px] text-gray-500">
          지급대행 정산 가능 금액과 최근 지급 요청 상태를 확인합니다.
        </p>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-2.5">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-[13px] text-gray-500">정산 예정</p>
          <p className="mt-1 text-[22px] font-bold text-black">
            {formatKrw(pending._sum.commissionAmountKrw ?? 0)}
          </p>
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
          <p className="text-[13px] text-blue-700">정산 가능</p>
          <p className="mt-1 text-[22px] font-bold text-blue-700">
            {formatKrw(payable._sum.commissionAmountKrw ?? 0)}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[15px] font-bold text-black">최근 정산 요청</h2>
          <Link href="/seller" className="text-[13px] font-medium text-gray-500">
            판매자 센터 →
          </Link>
        </div>

        {recentPayouts.length === 0 ? (
          <p className="py-8 text-center text-[14px] text-gray-400">
            아직 정산 요청 내역이 없습니다.
          </p>
        ) : (
          <div className="space-y-2">
            {recentPayouts.map((payout) => (
              <div
                key={payout.id}
                className="rounded-lg border border-gray-100 bg-gray-50 p-3 text-[13px]"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-black">
                    {formatKrw(payout.amountKrw)}
                  </span>
                  <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-gray-700">
                    {payout.status}
                  </span>
                </div>
                <p className="mt-1 text-[12px] text-gray-500">
                  요청일:{" "}
                  {new Date(payout.createdAt).toLocaleString("ko-KR", {
                    timeZone: "Asia/Seoul",
                  })}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
