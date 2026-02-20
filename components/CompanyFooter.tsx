export default function CompanyFooter() {
  return (
    <footer className="bg-gray-50 border-t border-gray-200 py-8 px-5 mt-12">
      <div className="max-w-[420px] mx-auto">
        <div className="space-y-4 text-[13px] text-gray-600">
          {/* Company Info */}
          <div>
            <p className="font-bold text-gray-800 mb-2">미크로브랜드(MIKROBRAND)</p>
            <p>대표자명: 정땅</p>
            <p>사업자등록번호: 443-65-00701</p>
            <p>통신판매업 신고번호: 2025-서울구로-0131</p>
          </div>

          {/* Contact */}
          <div>
            <p className="font-medium mb-1">고객센터 민원접수</p>
            <p>카카오채널: <a href="http://pf.kakao.com/_CXAmn/chat" className="text-blue-600 underline">미크로브랜드</a></p>
            <p>전화: 82-10-9186-5859</p>
            <p>메일: mikrobrand25@gmail.com</p>
            <p className="mt-2">개인정보보호: mikrodataprotection@gmail.com</p>
          </div>

          {/* Address */}
          <div className="text-[12px] text-gray-500">
            <p>OFFICE: 서울특별시 구로구 새말로 93, 제상가2동 제지층 제111 C136</p>
            <p>HEAD OFFICE: 서울특별시 구로구 경인로 53길 90 14F</p>
            <p className="mt-3 text-[11px] text-gray-400 leading-relaxed">
              미크로는 통신판매의 당사자가 아닌 통신판매중개자로서 상품, 상품정보, 거래에 대한 책임이 제한될 수 있으므로, 각 상품 페이지에서 구체적인 내용을 확인하시기 바랍니다.
            </p>
          </div>

          {/* Links */}
          <div className="flex gap-3 flex-wrap text-[13px]">
            <a href="/info" className="text-gray-700 hover:text-black underline">
              사업자 정보
            </a>
            <a href="/policy/terms" className="text-gray-700 hover:text-black underline">
              이용약관
            </a>
            <a href="/policy/privacy" className="text-gray-700 hover:text-black underline">
              개인정보처리방침
            </a>
            <a href="/policy/returns" className="text-gray-700 hover:text-black underline">
              환불·교환·반품
            </a>
          </div>

          {/* Copyright */}
          <div className="text-[12px] text-gray-400 pt-2 border-t border-gray-200">
            <p>© 2026 mikro. All rights reserved.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
