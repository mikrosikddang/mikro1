import Container from "@/components/Container";

export default function PrivacyPage() {
  return (
    <Container>
      <div className="pt-4 pb-20">
        <h1 className="text-[22px] font-bold text-black mb-2">개인정보처리방침</h1>
        <p className="text-[13px] text-gray-500 mb-6">시행일: 2026.04.04 / 버전: v1.0</p>

        <div className="space-y-6 text-[14px] text-gray-700 leading-relaxed">
          <section>
            <h2 className="text-[16px] font-bold text-black mb-2">제1조 (총칙)</h2>
            <p>
              미크로브랜드(이하 &quot;회사&quot;)은 회원의 개인정보를 중요하게 여기며, 관련
              법령 및 본 방침에 따라 개인정보를 처리합니다.
            </p>
          </section>

          <section>
            <h2 className="text-[16px] font-bold text-black mb-2">제2조 (처리하는 개인정보 항목)</h2>
            <ol className="list-decimal list-inside space-y-1">
              <li>회원가입 시: 이메일, 휴대전화번호, 소셜로그인 식별값, 닉네임, 접속기록</li>
              <li>프로필 및 공간 운영 시: 프로필 이미지, 소개글, 링크, 게시물 이미지, 캡션, 태그, 활동기록</li>
              <li>판매자 승인 신청 시: 사업자등록 관련 정보, 통신판매 관련 정보, 대표자 또는 담당자 정보, 고객응대 연락처, 반품지, 정산계좌 정보, 세무처리에 필요한 정보</li>
              <li>구매 및 주문 처리 시: 수령인 정보, 배송지, 연락처, 주문내역, 결제정보, 환불정보</li>
              <li>고객센터 이용 시: 문의내용, 첨부자료, 상담기록</li>
            </ol>
          </section>

          <section>
            <h2 className="text-[16px] font-bold text-black mb-2">제3조 (개인정보의 처리 목적)</h2>
            <ol className="list-decimal list-inside space-y-1">
              <li>회원가입 및 본인 식별</li>
              <li>공간 개설, 게시물 등록, 저장, 검색 등 서비스 제공</li>
              <li>판매자 승인 심사 및 판매 운영 관리</li>
              <li>주문, 결제, 배송, 환불, 정산 처리</li>
              <li>민원 대응, 분쟁 처리, 부정이용 방지</li>
              <li>서비스 개선 및 통계 분석</li>
              <li>법령상 의무 이행</li>
            </ol>
          </section>

          <section>
            <h2 className="text-[16px] font-bold text-black mb-2">제4조 (개인정보의 보유 및 이용기간)</h2>
            <ol className="list-decimal list-inside space-y-1">
              <li>회사는 개인정보의 처리 목적이 달성되면 지체 없이 파기합니다.</li>
              <li>다만 회원 탈퇴 후에도 거래, 정산, 환불, 분쟁 대응 또는 관련 법령상 보존 의무가 있는 경우 해당 기간 동안 보관할 수 있습니다.</li>
              <li>판매자 승인 관련 자료와 정산 자료는 승인 유지 및 세무·정산 처리에 필요한 범위에서 보관할 수 있습니다.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-[16px] font-bold text-black mb-2">제5조 (개인정보의 제3자 제공)</h2>
            <ol className="list-decimal list-inside space-y-1">
              <li>회사는 회원의 동의가 있거나 서비스 제공에 필요한 경우에 한하여 개인정보를 제3자에게 제공할 수 있습니다.</li>
              <li>브랜드회원의 판매자 정보는 소비자 보호를 위해 상품 페이지 또는 주문 단계에 노출될 수 있습니다.</li>
              <li>구매 및 배송 처리에 필요한 범위에서 판매회원 또는 관련 수탁사에 정보가 제공될 수 있습니다.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-[16px] font-bold text-black mb-2">제6조 (개인정보 처리의 위탁)</h2>
            <ol className="list-decimal list-inside space-y-1">
              <li>회사는 서비스 운영을 위하여 결제사, 클라우드 인프라 사업자, 문자·이메일 발송 서비스, 고객상담 시스템 운영사 등에 개인정보 처리 업무를 위탁할 수 있습니다.</li>
              <li>회사는 위탁계약 시 수탁자가 개인정보를 안전하게 처리하도록 관리·감독합니다.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-[16px] font-bold text-black mb-2">제7조 (정보주체의 권리)</h2>
            <ol className="list-decimal list-inside space-y-1">
              <li>회원은 언제든지 자신의 개인정보에 대한 열람, 정정, 삭제, 처리정지, 동의 철회를 요청할 수 있습니다.</li>
              <li>권리 행사는 고객센터 또는 회사가 정한 절차를 통하여 할 수 있습니다.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-[16px] font-bold text-black mb-2">제8조 (개인정보의 파기)</h2>
            <p>전자적 파일은 복구 또는 재생이 불가능한 방법으로 삭제하며, 종이 문서는 분쇄 또는 소각합니다.</p>
          </section>

          <section>
            <h2 className="text-[16px] font-bold text-black mb-2">제9조 (안전성 확보조치)</h2>
            <p>회사는 접근권한 관리, 비밀번호 암호화, 접속기록 보관, 내부 관리계획 수립 등 필요한 보호조치를 시행합니다.</p>
          </section>

          <section>
            <h2 className="text-[16px] font-bold text-black mb-2">제10조 (쿠키 및 접속기록)</h2>
            <ol className="list-decimal list-inside space-y-1">
              <li>회사는 서비스 편의성과 운영 분석을 위하여 쿠키, 접속기록, 기기정보 등을 수집할 수 있습니다.</li>
              <li>회원은 브라우저 설정을 통해 쿠키 저장을 거부할 수 있으나 일부 기능 이용이 제한될 수 있습니다.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-[16px] font-bold text-black mb-2">제11조 (개인정보 보호책임자)</h2>
            <p>성명: 정땅</p>
            <p className="mt-1">연락처: 82-10-9186-5859</p>
            <p className="mt-1">이메일: mikrodataprotection@gmail.com</p>
          </section>

          <section>
            <h2 className="text-[16px] font-bold text-black mb-2">제12조 (고지 및 개정)</h2>
            <ol className="list-decimal list-inside space-y-1">
              <li>본 방침은 서비스 화면 또는 하단 푸터를 통하여 상시 열람 가능하도록 게시합니다.</li>
              <li>중요한 변경이 있는 경우 사전에 공지합니다.</li>
            </ol>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <h2 className="text-[15px] font-bold text-black mb-2">문의 및 권리행사 접수</h2>
            <p>고객센터: 카카오채널 미크로브랜드 / 82-10-9186-5859 / mikrobrand25@gmail.com</p>
            <p className="mt-1">개인정보보호 담당: mikrodataprotection@gmail.com</p>
          </section>
        </div>
      </div>
    </Container>
  );
}
