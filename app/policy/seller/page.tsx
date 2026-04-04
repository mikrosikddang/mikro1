import Container from "@/components/Container";

export default function SellerPolicyPage() {
  return (
    <Container>
      <div className="pt-4 pb-20">
        <h1 className="text-[22px] font-bold text-black mb-2">판매자 전환 및 운영정책</h1>
        <p className="text-[13px] text-gray-500 mb-6">시행일: 2026.04.04 / 버전: v1.0</p>

        <div className="space-y-6 text-[14px] text-gray-700 leading-relaxed">
          <section>
            <h2 className="text-[16px] font-bold text-black mb-2">제1조 (목적)</h2>
            <p>
              본 정책은 아카이빙회원의 브랜드회원 전환, 판매 승인, 상품 운영,
              고객응대, 수수료, 정산, 제재 기준 등 판매 운영에 관한 세부사항을
              정함을 목적으로 합니다.
            </p>
          </section>

          <section>
            <h2 className="text-[16px] font-bold text-black mb-2">제2조 (적용대상)</h2>
            <p>
              본 정책은 판매자 승인을 신청하는 회원 및 판매자 승인 후 판매를 운영하는
              브랜드회원에게 적용됩니다.
            </p>
          </section>

          <section>
            <h2 className="text-[16px] font-bold text-black mb-2">제3조 (판매자 전환 기본원칙)</h2>
            <ol className="list-decimal list-inside space-y-1">
              <li>공간 개설과 판매 권한 부여는 별개의 절차입니다.</li>
              <li>시스템상 게시물 등록이 가능하다는 사실만으로 판매 권한이 부여된 것으로 보지 않습니다.</li>
              <li>회사의 최종 승인 전까지 회원의 공간은 원칙적으로 아카이브·쇼룸 공간으로 취급됩니다.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-[16px] font-bold text-black mb-2">제4조 (제출자료 및 승인기준)</h2>
            <ol className="list-decimal list-inside space-y-1">
              <li>회사는 사업자등록 관련 자료, 통신판매 관련 자료, 고객응대 연락처, 반품지, 정산계좌, 세무처리 자료 등을 요구할 수 있습니다.</li>
              <li>회사는 제출자료의 진정성, 판매 예정 상품의 적정성, 민원 가능성, 운영 역량 등을 종합 검토하여 승인 여부를 결정합니다.</li>
              <li>회사는 필요 시 추가 보완자료 제출, 정보 수정 또는 화면 안내 문구 추가를 요구할 수 있습니다.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-[16px] font-bold text-black mb-2">제5조 (판매자 정보 노출)</h2>
            <ol className="list-decimal list-inside space-y-1">
              <li>판매자 승인 시 제출된 정보는 소비자 보호를 위하여 상품 상세 화면, 주문 화면 또는 회사가 정한 위치에 노출될 수 있습니다.</li>
              <li>브랜드회원은 판매자 정보 노출에 동의하여야 하며, 변경 시 즉시 최신 정보로 수정하여야 합니다.</li>
            </ol>
          </section>

          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <h2 className="text-[16px] font-bold text-black mb-2">제6조 (수수료 및 정산)</h2>
            <ol className="list-decimal list-inside space-y-1">
              <li>브랜드회원의 판매 수수료는 판매대금의 15%로 합니다.</li>
              <li>회사는 PG사 또는 회사가 지정한 정산 시스템을 통한 분리 정산을 원칙으로 합니다.</li>
              <li>정산은 원칙적으로 매월 15일 진행합니다.</li>
              <li>환불, 차감, 분쟁, 세금 처리, 공휴일 또는 정산 시스템 사정이 있는 경우 정산일은 조정될 수 있습니다.</li>
              <li>회원의 귀책 사유로 정산계좌 정보가 부정확하거나 세무 자료가 누락된 경우 회사는 이에 따른 정산 오류 또는 지연에 대해 책임지지 않습니다.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-[16px] font-bold text-black mb-2">제7조 (상품 및 게시물 운영)</h2>
            <ol className="list-decimal list-inside space-y-1">
              <li>브랜드회원은 가격, 옵션, 재고, 설명, 배송·반품 조건 등 거래에 필요한 정보를 정확하게 입력하여야 합니다.</li>
              <li>가격을 입력하지 않은 게시물은 아카이브·쇼룸 게시물로 분류될 수 있으며, 정상 판매게시물로 보지 않습니다.</li>
              <li>승인 전 회원이 임의로 가격을 기재하거나 결제를 유도한 경우 회사는 해당 게시물의 정확성이나 거래의 안전을 보장하지 않습니다.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-[16px] font-bold text-black mb-2">제8조 (고객응대 및 반품)</h2>
            <ol className="list-decimal list-inside space-y-1">
              <li>브랜드회원은 고객응대 연락처, 반품지, 환불 처리 정보를 정확하게 등록하여야 합니다.</li>
              <li>고객응대 정보가 부정확하거나 누락되어 분쟁이 발생한 경우 그 책임은 해당 브랜드회원에게 있습니다.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-[16px] font-bold text-black mb-2">제9조 (저작권 및 권리침해 게시물)</h2>
            <ol className="list-decimal list-inside space-y-1">
              <li>회원이 게시한 이미지, 브랜드 사진, 잡지 컷, 상세페이지 등으로 인해 제3자의 권리 침해가 발생한 경우 모든 책임은 회원에게 있습니다.</li>
              <li>회사는 권리 침해가 의심되는 콘텐츠를 즉시 삭제, 비공개 또는 노출 제한할 수 있습니다.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-[16px] font-bold text-black mb-2">제10조 (미승인 판매 및 외부거래 금지)</h2>
            <ol className="list-decimal list-inside space-y-1">
              <li>판매자 승인 전 회원은 외부 주문 접수, 외부 결제 유도, 예약금 수취, 사실상 판매 행위를 할 수 없습니다.</li>
              <li>이를 위반한 경우 회사는 게시물 삭제, 계정 영구 정지, 손해배상 청구 등 필요한 조치를 할 수 있습니다.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-[16px] font-bold text-black mb-2">제11조 (경고 문구 및 Soft-lock)</h2>
            <ol className="list-decimal list-inside space-y-1">
              <li>회사는 미승인 회원의 공간 또는 게시물에 판매 자격이 검증되지 않은 아카이브 전용 공간이라는 취지의 경고 문구를 상시 표시할 수 있습니다.</li>
              <li>회사는 가격 입력 필드, 판매자 전환 화면, 게시물 상세 화면 등에 경고 문구 또는 안내 문구를 노출할 수 있습니다.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-[16px] font-bold text-black mb-2">제12조 (정책 변경)</h2>
            <ol className="list-decimal list-inside space-y-1">
              <li>수수료율, 정산 주기, 승인 절차 등 구체적 운영 기준은 회사의 운영정책 또는 서비스 화면 안내를 통하여 고지할 수 있습니다.</li>
              <li>약관과 달리 세부 수치·절차는 운영정책에서 조정될 수 있으며, 중요한 변경은 사전에 공지합니다.</li>
            </ol>
          </section>

          <p className="text-[12px] text-gray-400">
            문의: mikrobrand25@gmail.com / 82-10-9186-5859
          </p>
        </div>
      </div>
    </Container>
  );
}
