import Container from "@/components/Container";

export default function SellerPolicyPage() {
  return (
    <Container>
      <div className="pt-4 pb-20">
        <h1 className="text-[22px] font-bold text-black mb-2">판매자 전환 및 운영정책</h1>
        <p className="text-[14px] text-gray-500 mb-8">
          내 공간 운영, 아카이브 게시물, 판매자 승인 흐름에 대한 안내입니다.
        </p>

        <div className="space-y-6 text-[14px] text-gray-700 leading-relaxed">
          <section>
            <h2 className="text-[16px] font-bold text-black mb-2">1. 가입 즉시 내 공간 개설</h2>
            <p>
              회원가입이 완료되면 기본 공간이 즉시 생성되며, 공간 주소와 프로필을 바탕으로
              아카이브 게시물을 공개할 수 있습니다.
            </p>
          </section>

          <section>
            <h2 className="text-[16px] font-bold text-black mb-2">2. 아카이브 게시물</h2>
            <p>
              아카이브 게시물은 가격과 옵션이 없는 기록형 게시물입니다. 장바구니, 주문,
              결제 대상이 아니며 이미지와 설명 중심으로 공간에 노출됩니다.
            </p>
          </section>

          <section>
            <h2 className="text-[16px] font-bold text-black mb-2">3. 판매자 전환</h2>
            <p>
              실제 판매를 운영하려면 별도의 판매자 입점 신청과 승인 절차가 필요합니다.
              승인 전 공간은 아카이브·쇼룸 용도로만 운영할 수 있습니다.
            </p>
          </section>

          <section>
            <h2 className="text-[16px] font-bold text-black mb-2">4. 제출 서류</h2>
            <p>
              판매자 입점 신청 시 사업자등록증, 통신판매업 신고증, 정산 통장 사본 등
              필요한 서류를 제출해야 하며, 심사 완료 전까지 판매 기능은 활성화되지 않습니다.
            </p>
          </section>

          <section>
            <h2 className="text-[16px] font-bold text-black mb-2">5. 운영 유의사항</h2>
            <p>
              판매 상품은 승인된 판매자만 등록·노출할 수 있습니다. 회사는 정책 위반,
              권리 침해, 허위 정보 등록 등 운영상 문제가 확인되는 경우 게시물 노출을 제한할 수 있습니다.
            </p>
          </section>

          <p className="text-[12px] text-gray-400">시행일: 2026년 4월 4일</p>
        </div>
      </div>
    </Container>
  );
}
