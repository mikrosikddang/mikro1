import Link from "next/link";
import Container from "@/components/Container";
import { getSession, canAccessSellerFeatures, isCustomer } from "@/lib/auth";
import LogoutButton from "@/components/LogoutButton";
import { prisma } from "@/lib/prisma";

const chevronSvg = (
  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

export default async function MyPage() {
  const session = await getSession();
  const ownedSpaceLabel =
    session && canAccessSellerFeatures(session.role) ? "스토어 보기" : "내 공간";

  // 주문/배송 현황 카운트 (구매자 기준)
  let orderCounts = { paid: 0, shipped: 0, completed: 0, claim: 0 };
  if (session) {
    const [paid, shipped, completed, claim] = await Promise.all([
      prisma.order.count({ where: { buyerId: session.userId, status: "PAID" } }),
      prisma.order.count({ where: { buyerId: session.userId, status: "SHIPPED" } }),
      prisma.order.count({ where: { buyerId: session.userId, status: "COMPLETED" } }),
      prisma.orderClaim.count({
        where: {
          status: { in: ["REQUESTED", "APPROVED"] },
          order: { buyerId: session.userId },
        },
      }),
    ]);
    orderCounts = { paid, shipped, completed, claim };
  }

  return (
    <Container>
      <div className="pt-4 pb-20">
        <h1 className="text-[22px] font-bold text-black mb-6">MY</h1>

        {/* Profile section */}
        {session ? (
          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl mb-6">
            <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center text-[18px]">
              {canAccessSellerFeatures(session.role) ? "🏪" : "👤"}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="text-[15px] font-medium text-gray-900">
                  {session.name || session.email || (canAccessSellerFeatures(session.role) ? "판매자" : "고객")}
                </p>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    canAccessSellerFeatures(session.role)
                      ? "bg-black text-white"
                      : "bg-gray-200 text-gray-600"
                  }`}
                >
                  {session.role}
                </span>
              </div>
              <p className="text-[12px] text-gray-400 mt-0.5">
                {session.email || session.userId.slice(0, 12) + "..."}
              </p>
            </div>
            <LogoutButton />
          </div>
        ) : (
          <Link href="/login?next=/my" className="block">
            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl mb-6 active:bg-gray-100 transition-colors">
              <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center text-[18px]">
                👤
              </div>
              <div className="flex-1">
                <p className="text-[15px] font-medium text-gray-900">게스트</p>
                <p className="text-[12px] text-gray-400">로그인이 필요합니다</p>
              </div>
              {chevronSvg}
            </div>
          </Link>
        )}

        {/* 주문/배송 현황 카드 */}
        {session && (
          <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[15px] font-bold text-black">주문 / 배송 조회</h2>
              <Link
                href="/orders"
                className="text-[12px] font-medium text-gray-600"
              >
                전체보기 →
              </Link>
            </div>
            <div className="grid grid-cols-4 gap-2">
              <Link
                href="/orders?status=PAID"
                className="flex flex-col items-center rounded-xl bg-gray-50 px-2 py-3 text-center transition-colors active:bg-gray-100"
              >
                <span className="text-[20px] font-bold text-black">
                  {orderCounts.paid}
                </span>
                <span className="mt-1 text-[11px] text-gray-600">결제완료</span>
              </Link>
              <Link
                href="/orders?status=SHIPPED"
                className="flex flex-col items-center rounded-xl bg-gray-50 px-2 py-3 text-center transition-colors active:bg-gray-100"
              >
                <span className="text-[20px] font-bold text-black">
                  {orderCounts.shipped}
                </span>
                <span className="mt-1 text-[11px] text-gray-600">배송중</span>
              </Link>
              <Link
                href="/orders?status=COMPLETED"
                className="flex flex-col items-center rounded-xl bg-gray-50 px-2 py-3 text-center transition-colors active:bg-gray-100"
              >
                <span className="text-[20px] font-bold text-black">
                  {orderCounts.completed}
                </span>
                <span className="mt-1 text-[11px] text-gray-600">배송완료</span>
              </Link>
              <Link
                href="/orders?claims=1"
                className="flex flex-col items-center rounded-xl bg-gray-50 px-2 py-3 text-center transition-colors active:bg-gray-100"
              >
                <span
                  className={`text-[20px] font-bold ${
                    orderCounts.claim > 0 ? "text-amber-600" : "text-black"
                  }`}
                >
                  {orderCounts.claim}
                </span>
                <span className="mt-1 text-[11px] text-gray-600">환불/교환</span>
              </Link>
            </div>
          </div>
        )}

        {/* Menu list */}
        <div className="flex flex-col">
          <Link
            href="/orders"
            className="py-4 border-b border-gray-50 text-[15px] text-gray-800 flex items-center justify-between"
          >
            주문내역
            {chevronSvg}
          </Link>

          <Link
            href="/my/account"
            className="py-4 border-b border-gray-50 text-[15px] text-gray-800 flex items-center justify-between"
          >
            회원정보 관리
            {chevronSvg}
          </Link>

          <Link
            href="/my/coupons"
            className="py-4 border-b border-gray-50 text-[15px] text-gray-800 flex items-center justify-between"
          >
            내 쿠폰
            {chevronSvg}
          </Link>

          <Link
            href="/wishlist"
            className="py-4 border-b border-gray-50 text-[15px] text-gray-800 flex items-center justify-between"
          >
            관심목록
            {chevronSvg}
          </Link>

          {session && (
            <>
              <Link
                href="/chat"
                className="py-4 border-b border-gray-50 text-[15px] text-gray-800 flex items-center justify-between"
              >
                채팅
                {chevronSvg}
              </Link>
              <Link
                href="/space"
                className="py-4 border-b border-gray-50 text-[15px] text-gray-800 flex items-center justify-between"
              >
                {ownedSpaceLabel}
                {chevronSvg}
              </Link>
              <Link
                href={canAccessSellerFeatures(session.role) ? "/seller/products/new" : "/space/posts/new"}
                className="py-4 border-b border-gray-50 text-[15px] text-gray-800 flex items-center justify-between"
              >
                {canAccessSellerFeatures(session.role) ? "상품 올리기" : "사진 올리기"}
                {chevronSvg}
              </Link>
            </>
          )}

          {session && canAccessSellerFeatures(session.role) ? (
            <Link
              href="/seller"
              className="py-4 border-b border-gray-50 text-[15px] text-gray-800 flex items-center justify-between"
            >
              판매자 센터
              {chevronSvg}
            </Link>
          ) : session && isCustomer(session.role) ? (
            <Link
              href="/apply/seller"
              className="py-4 border-b border-gray-50 text-[15px] text-gray-800 flex items-center justify-between"
            >
              판매자 가입 신청
              {chevronSvg}
            </Link>
          ) : null}

          <Link
            href="/info"
            className="py-4 border-b border-gray-50 text-[15px] text-gray-800 flex items-center justify-between"
          >
            사업자 정보
            {chevronSvg}
          </Link>

          <Link
            href="/policy/terms"
            className="py-4 border-b border-gray-50 text-[15px] text-gray-800 flex items-center justify-between"
          >
            이용약관
            {chevronSvg}
          </Link>

          <Link
            href="/policy/privacy"
            className="py-4 border-b border-gray-50 text-[15px] text-gray-800 flex items-center justify-between"
          >
            개인정보처리방침
            {chevronSvg}
          </Link>

          <Link
            href="/policy/returns"
            className="py-4 border-b border-gray-50 text-[15px] text-gray-800 flex items-center justify-between"
          >
            환불·교환·반품·배송 정책
            {chevronSvg}
          </Link>

          <Link
            href="/policy/seller"
            className="py-4 border-b border-gray-50 text-[15px] text-gray-800 flex items-center justify-between"
          >
            판매자 전환 및 운영정책
            {chevronSvg}
          </Link>
        </div>
      </div>
    </Container>
  );
}
