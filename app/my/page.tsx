import Link from "next/link";
import Container from "@/components/Container";
import { getSession } from "@/lib/auth";
import LogoutButton from "@/components/LogoutButton";

const chevronSvg = (
  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

export default async function MyPage() {
  const session = await getSession();

  return (
    <Container>
      <div className="pt-4 pb-20">
        <h1 className="text-[22px] font-bold text-black mb-6">MY</h1>

        {/* Profile section */}
        {session ? (
          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl mb-6">
            <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center text-[18px]">
              {session.role === "SELLER" ? "🏪" : "👤"}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="text-[15px] font-medium text-gray-900">
                  {session.role === "SELLER" ? "판매자" : "고객"}
                </p>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    session.role === "SELLER"
                      ? "bg-black text-white"
                      : "bg-gray-200 text-gray-600"
                  }`}
                >
                  {session.role === "SELLER" ? "SELLER" : "CUSTOMER"}
                </span>
              </div>
              <p className="text-[12px] text-gray-400 mt-0.5">
                {session.userId.slice(0, 12)}...
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

        {/* Menu list */}
        <div className="flex flex-col">
          <Link
            href="#"
            className="py-4 border-b border-gray-50 text-[15px] text-gray-800 flex items-center justify-between"
          >
            주문내역
            {chevronSvg}
          </Link>

          <Link
            href="/wishlist"
            className="py-4 border-b border-gray-50 text-[15px] text-gray-800 flex items-center justify-between"
          >
            관심목록
            {chevronSvg}
          </Link>

          {session?.role === "SELLER" && (
            <Link
              href="/seller"
              className="py-4 border-b border-gray-50 text-[15px] text-gray-800 flex items-center justify-between"
            >
              판매자 센터
              {chevronSvg}
            </Link>
          )}

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
        </div>
      </div>
    </Container>
  );
}
