import Container from "@/components/Container";

export default function PrivacyPage() {
  return (
    <Container>
      <div className="pt-4 pb-20">
        <h1 className="text-[22px] font-bold text-black mb-6">개인정보처리방침</h1>

        <div className="space-y-6 text-[14px] text-gray-700 leading-relaxed">
          <section>
            <h2 className="text-[16px] font-bold text-black mb-2">
              1. 수집하는 개인정보 항목
            </h2>
            <p>회사는 서비스 제공을 위해 다음의 개인정보를 수집합니다:</p>
            <div className="mt-2 space-y-2">
              <div>
                <p className="font-medium">회원가입 시 (필수):</p>
                <ul className="list-disc list-inside mt-1 space-y-1 ml-2">
                  <li>사용자 ID (이메일 형식)</li>
                  <li>비밀번호 (암호화 저장)</li>
                  <li>사용자 유형 (CUSTOMER/SELLER)</li>
                </ul>
              </div>
              <div>
                <p className="font-medium">주문 및 배송 시 (필수):</p>
                <ul className="list-disc list-inside mt-1 space-y-1 ml-2">
                  <li>수령인 이름</li>
                  <li>수령인 연락처</li>
                  <li>배송지 주소</li>
                </ul>
              </div>
              <div>
                <p className="font-medium">판매자 입점 시 (필수):</p>
                <ul className="list-disc list-inside mt-1 space-y-1 ml-2">
                  <li>상호명</li>
                  <li>사업자등록번호</li>
                  <li>연락처</li>
                </ul>
              </div>
              <div>
                <p className="font-medium">자동 수집:</p>
                <ul className="list-disc list-inside mt-1 space-y-1 ml-2">
                  <li>접속 IP, 쿠키, 서비스 이용 기록</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-[16px] font-bold text-black mb-2">
              2. 개인정보의 수집·이용 목적
            </h2>
            <ul className="list-disc list-inside space-y-1">
              <li>회원 가입 및 본인 확인</li>
              <li>상품 주문, 결제, 배송</li>
              <li>판매자 입점 심사 및 관리</li>
              <li>고객 문의 및 민원 처리</li>
              <li>서비스 개선 및 통계 분석</li>
              <li>부정 이용 방지 및 서비스 안정성 확보</li>
            </ul>
          </section>

          <section>
            <h2 className="text-[16px] font-bold text-black mb-2">
              3. 개인정보의 보유·이용 기간
            </h2>
            <p>
              회원 탈퇴 시 즉시 파기합니다. 단, 관련 법령에 따라 보존이 필요한
              경우에는 해당 기간 동안 보관합니다:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>
                계약 또는 청약철회 등에 관한 기록: 5년 (전자상거래법)
              </li>
              <li>
                대금결제 및 재화 등의 공급에 관한 기록: 5년 (전자상거래법)
              </li>
              <li>
                소비자의 불만 또는 분쟁처리에 관한 기록: 3년 (전자상거래법)
              </li>
              <li>표시·광고에 관한 기록: 6개월 (전자상거래법)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-[16px] font-bold text-black mb-2">
              4. 개인정보의 제3자 제공
            </h2>
            <p>
              회사는 원칙적으로 이용자의 개인정보를 외부에 제공하지 않습니다.
              다만, 다음의 경우에는 예외로 합니다:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>이용자가 사전에 동의한 경우</li>
              <li>법령의 규정에 의하거나 수사 목적으로 법령에 정해진 절차와 방법에 따라 수사기관의 요구가 있는 경우</li>
            </ul>
            <p className="mt-2">
              주문 처리를 위해 판매자에게 배송지 정보(수령인명, 연락처, 주소)가 제공됩니다.
            </p>
          </section>

          <section>
            <h2 className="text-[16px] font-bold text-black mb-2">
              5. 개인정보 처리의 위탁
            </h2>
            <p>
              회사는 서비스 제공을 위해 아래와 같이 개인정보 처리 업무를
              위탁하고 있습니다:
            </p>
            <div className="mt-2 space-y-2">
              <div>
                <p className="font-medium">AWS (Amazon Web Services)</p>
                <ul className="list-disc list-inside mt-1 space-y-1 ml-2">
                  <li>위탁 업무: 데이터 보관 및 서버 운영</li>
                </ul>
              </div>
              <div>
                <p className="font-medium">Neon Database</p>
                <ul className="list-disc list-inside mt-1 space-y-1 ml-2">
                  <li>위탁 업무: 데이터베이스 호스팅</li>
                </ul>
              </div>
            </div>
            <p className="mt-2">
              위탁 계약 시 개인정보보호법에 따라 위탁업무 수행목적 외
              개인정보 처리 금지, 기술적·관리적 보호조치, 재위탁 제한, 수탁자에 대한
              관리·감독, 손해배상 등 책임에 관한 사항을 문서에 명시하고
              관리합니다.
            </p>
          </section>

          <section>
            <h2 className="text-[16px] font-bold text-black mb-2">
              6. 정보주체의 권리·의무 및 행사 방법
            </h2>
            <p>이용자는 다음과 같은 권리를 행사할 수 있습니다:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>개인정보 열람 요구</li>
              <li>개인정보 정정·삭제 요구</li>
              <li>개인정보 처리 정지 요구</li>
              <li>회원 탈퇴를 통한 개인정보 삭제</li>
            </ul>
            <p className="mt-2">
              권리 행사는 고객센터 (카카오채널: <a href="http://pf.kakao.com/_CXAmn/chat" className="text-blue-600 underline">미크로브랜드</a>,
              이메일: mikrobrand25@gmail.com, 전화: 82-10-9186-5859) 또는
              개인정보보호 담당 이메일(mikrodataprotection@gmail.com)로
              서면, 이메일 등을 통해 가능합니다.
            </p>
          </section>

          <section>
            <h2 className="text-[16px] font-bold text-black mb-2">
              7. 개인정보 보호책임자 및 고충처리
            </h2>
            <div className="space-y-2">
              <div>
                <p className="font-medium">개인정보 보호책임자:</p>
                <p className="mt-1">이메일: mikrodataprotection@gmail.com</p>
              </div>
              <div>
                <p className="font-medium">고객센터 민원접수:</p>
                <p className="mt-1">카카오채널: <a href="http://pf.kakao.com/_CXAmn/chat" className="text-blue-600 underline">미크로브랜드</a></p>
                <p>전화: 82-10-9186-5859</p>
                <p>이메일: mikrobrand25@gmail.com</p>
              </div>
            </div>
            <p className="mt-2">
              기타 개인정보침해에 대한 신고나 상담이 필요한 경우 아래 기관에
              문의 가능합니다:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>개인정보침해신고센터 (privacy.kisa.or.kr / 118)</li>
              <li>개인정보분쟁조정위원원회 (www.kopico.go.kr / 1833-6972)</li>
              <li>대검찰청 사이버수사과 (www.spo.go.kr / 1301)</li>
              <li>경찰청 사이버안전국 (cyberbureau.police.go.kr / 182)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-[16px] font-bold text-black mb-2">
              8. 개인정보처리방침 변경
            </h2>
            <p>
              본 개인정보처리방침은 법령·정책 또는 보안기술의 변경에 따라
              내용의 추가·삭제 및 수정이 있을 경우 변경 최소 7일 전에
              서비스 내 공지사항을 통해 고지합니다.
            </p>
          </section>

          <p className="text-[12px] text-gray-400 mt-8">
            최종 업데이트: 2026-02-12
            <br />
            시행일: 2026-02-12
          </p>
        </div>
      </div>
    </Container>
  );
}
