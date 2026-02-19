import Link from "next/link";
import Container from "@/components/Container";

export default function InfoPage() {
  return (
    <Container>
      <div className="py-6 pb-24">
        <h1 className="text-[24px] font-bold text-black mb-6">사업자 정보</h1>

        {/* Customer Service */}
        <div className="mb-4 p-4 bg-white rounded-xl border border-gray-200">
          <h2 className="text-[16px] font-bold text-black mb-3">
            고객센터 민원접수
          </h2>
          <div className="space-y-2">
            <div>
              <p className="text-[13px] text-gray-600 mb-1">
                카카오채널
              </p>
              <a
                href="http://pf.kakao.com/_CXAmn/chat"
                className="text-[14px] text-blue-600 font-medium"
                target="_blank"
                rel="noopener noreferrer"
              >
                미크로브랜드
              </a>
            </div>
            <div>
              <p className="text-[13px] text-gray-600 mb-1">전화</p>
              <a
                href="tel:+82-10-9186-5859"
                className="text-[14px] text-blue-600 font-medium"
              >
                82-10-9186-5859
              </a>
            </div>
            <div>
              <p className="text-[13px] text-gray-600 mb-1">이메일</p>
              <a
                href="mailto:mikrobrand25@gmail.com"
                className="text-[14px] text-blue-600 font-medium break-all"
              >
                mikrobrand25@gmail.com
              </a>
            </div>
          </div>
        </div>

        {/* Data Protection */}
        <div className="mb-4 p-4 bg-white rounded-xl border border-gray-200">
          <h2 className="text-[16px] font-bold text-black mb-3">
            개인정보 보호 책임 / 문의
          </h2>
          <div className="space-y-2">
            <div>
              <p className="text-[13px] text-gray-600 mb-1">
                Data Protection Office Email
              </p>
              <a
                href="mailto:mikrodataprotection@gmail.com"
                className="text-[14px] text-blue-600 font-medium break-all"
              >
                mikrodataprotection@gmail.com
              </a>
            </div>
          </div>
        </div>

        {/* Business Information */}
        <div className="mb-4 p-4 bg-white rounded-xl border border-gray-200">
          <h2 className="text-[16px] font-bold text-black mb-3">사업자 정보</h2>
          <div className="space-y-3">
            <div>
              <p className="text-[13px] text-gray-600 mb-1">상호</p>
              <p className="text-[14px] text-black font-medium">미크로브랜드(MIKROBRAND)</p>
            </div>
            <div>
              <p className="text-[13px] text-gray-600 mb-1">대표자명</p>
              <p className="text-[14px] text-black font-medium">정땅</p>
            </div>
            <div>
              <p className="text-[13px] text-gray-600 mb-1">사업자등록번호</p>
              <p className="text-[14px] text-black font-medium">443-65-00701</p>
            </div>
            <div>
              <p className="text-[13px] text-gray-600 mb-1">
                통신판매업 신고번호
              </p>
              <p className="text-[14px] text-black font-medium">
                2025-서울구로-0131
              </p>
            </div>
            <div>
              <p className="text-[13px] text-gray-600 mb-1">사업장소재지 (OFFICE)</p>
              <p className="text-[14px] text-black leading-relaxed">
                서울특별시 구로구 새말로 93, 제상가2동 제지층 제111 C136
              </p>
            </div>
            <div>
              <p className="text-[13px] text-gray-600 mb-1">사업장소재지 (HEAD OFFICE)</p>
              <p className="text-[14px] text-black leading-relaxed">
                서울특별시 구로구 경인로 53길 90 14F
              </p>
            </div>
          </div>
        </div>

        {/* Service Info */}
        <div className="mb-6 p-4 bg-white rounded-xl border border-gray-200">
          <h2 className="text-[16px] font-bold text-black mb-3">
            운영 / 서비스 안내
          </h2>
          <div className="space-y-2">
            <div className="flex">
              <p className="text-[13px] text-gray-600 w-24">서비스명</p>
              <p className="text-[14px] text-black font-medium">mikro</p>
            </div>
            <div className="flex">
              <p className="text-[13px] text-gray-600 w-24">서비스 형태</p>
              <p className="text-[14px] text-black">
                동대문 패션 모바일 마켓플레이스(웹앱)
              </p>
            </div>
            <div className="flex">
              <p className="text-[13px] text-gray-600 w-24">운영 문의</p>
              <p className="text-[14px] text-black">위 이메일로 연락</p>
            </div>
          </div>
        </div>

        {/* Policy Links */}
        <div className="space-y-3">
          <Link
            href="/policy/terms"
            className="block w-full h-[48px] bg-gray-100 text-gray-700 rounded-xl text-[15px] font-medium flex items-center justify-center active:bg-gray-200 transition-colors"
          >
            이용약관 보기
          </Link>
          <Link
            href="/policy/privacy"
            className="block w-full h-[48px] bg-gray-100 text-gray-700 rounded-xl text-[15px] font-medium flex items-center justify-center active:bg-gray-200 transition-colors"
          >
            개인정보처리방침 보기
          </Link>
          <Link
            href="/policy/returns"
            className="block w-full h-[48px] bg-gray-100 text-gray-700 rounded-xl text-[15px] font-medium flex items-center justify-center active:bg-gray-200 transition-colors"
          >
            환불/교환/반품/배송 정책
          </Link>
        </div>
      </div>
    </Container>
  );
}
