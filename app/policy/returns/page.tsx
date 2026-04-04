import Link from "next/link";
import Container from "@/components/Container";

export default function ReturnsPage() {
  return (
    <Container>
      <div className="py-6 pb-24">
        <h1 className="text-[24px] font-bold text-black mb-2">
          배송·교환·반품·환불 정책
        </h1>
        <p className="text-[13px] text-gray-500 mb-6">
          시행일: 2026.04.04
        </p>

        <section className="mb-6">
          <h2 className="text-[18px] font-bold text-black mb-3">1. 기본 원칙</h2>
          <div className="space-y-2 text-[14px] text-gray-700 leading-relaxed">
            <p>
              미크로는 통신판매중개자로서 플랫폼을 제공하며, 개별 상품의 실제 판매자는
              각 상품 상세 또는 주문 화면에 표시된 판매회원입니다.
            </p>
            <p>
              가격이 없는 아카이브 게시물은 주문·결제·배송 대상이 아니며,
              실제 판매 운영은 회사의 판매자 승인을 완료한 브랜드회원만 할 수 있습니다.
            </p>
          </div>
        </section>

        <section className="mb-6 p-4 bg-blue-50 rounded-xl border border-blue-100">
          <h2 className="text-[18px] font-bold text-black mb-3">
            2. 배송비 정책
          </h2>
          <div className="space-y-2 text-[14px] text-gray-700 leading-relaxed">
            <p>
              • 배송비는 <strong>판매자별로 다르게 적용</strong>됩니다.
            </p>
            <p>
              • 판매자마다 무료배송 기준 금액, 배송비, 출고지, 묶음배송 기준이
              다를 수 있으므로 주문 전 상품 상세 또는 주문 화면에서 확인해 주세요.
            </p>
            <p>
              • 여러 판매자의 상품을 함께 구매할 경우, 판매자별로 주문이
              생성되며 각 판매자의 배송비 정책이 적용됩니다.
            </p>
          </div>
        </section>

        <section className="mb-6">
          <h2 className="text-[18px] font-bold text-black mb-3">
            3. 교환·반품 가능 기간
          </h2>
          <div className="space-y-2 text-[14px] text-gray-700 leading-relaxed">
            <p>
              • 상품 수령일로부터 7일 이내에 교환·반품을 신청할 수 있습니다.
            </p>
            <p>
              • 다만 전자상거래 등 관련 법령 또는 개별 상품에 별도 고지된 기준이 있는 경우 해당 기준이 우선 적용될 수 있습니다.
            </p>
            <p>
              • 판매회원은 상품별 배송·반품 조건, 고객응대 연락처, 반품지 정보를 정확하게 제공해야 하며, 이용자는 주문 전 이를 확인해야 합니다.
            </p>
          </div>
        </section>

        <section className="mb-6">
          <h2 className="text-[18px] font-bold text-black mb-3">
            4. 교환·반품 불가 사유
          </h2>
          <div className="space-y-2 text-[14px] text-gray-700 leading-relaxed">
            <p>• 상품 택(tag)이 제거되었거나 훼손된 경우</p>
            <p>• 착용 흔적(세탁, 변형, 오염 등)이 있는 경우</p>
            <p>• 포장이 훼손되어 상품 가치가 상실된 경우</p>
            <p>• 주문 제작 상품 또는 맞춤 제작 상품인 경우</p>
            <p>• 할인·세일 상품 중 "교환·반품 불가" 표시가 있는 경우</p>
            <p>• 수령 후 7일이 경과한 경우</p>
            <p>
              • 기타 전자상거래법 및 소비자보호법에서 정한 청약철회 제한
              사유에 해당하는 경우
            </p>
          </div>
        </section>

        <section className="mb-6">
          <h2 className="text-[18px] font-bold text-black mb-3">5. 환불 처리</h2>
          <div className="space-y-2 text-[14px] text-gray-700 leading-relaxed">
            <p>
              • 주문 취소 또는 반품 승인 후 환불은 원결제 수단을 기준으로 처리됩니다.
            </p>
            <p>
              • 환불 일정은 결제사, PG사, 카드사, 은행 및 판매회원의 확인 절차에 따라 달라질 수 있습니다.
            </p>
            <p>
              • 반품 배송비는 구매자 부담이 원칙이나, 상품 하자 또는 오배송의 경우 판매회원이 부담합니다.
            </p>
            <p>
              • 회사는 통신판매중개자로서 환불·분쟁 해결을 지원할 수 있으나, 개별 판매계약의 직접 당사자는 해당 판매회원입니다.
            </p>
          </div>
        </section>

        <section className="mb-6">
          <h2 className="text-[18px] font-bold text-black mb-3">
            6. 문의 채널
          </h2>
          <div className="space-y-2 text-[14px] text-gray-700 leading-relaxed">
            <p>
              • 교환·반품·환불 관련 1차 문의는 상품 상세 또는 주문 화면에 고지된 판매회원 고객응대 채널을 우선 이용해 주세요.
            </p>
            <p>
              • 플랫폼 고객센터:{" "}
              <a
                href="mailto:mikrobrand25@gmail.com"
                className="text-blue-600 font-medium"
              >
                mikrobrand25@gmail.com
              </a>
            </p>
            <p>
              • 전화: 82-10-9186-5859
            </p>
            <p>
              • 사업자 정보 및 연락처는{" "}
              <Link href="/info" className="text-blue-600 font-medium underline">
                사업자 정보 페이지
              </Link>
              에서 확인하실 수 있습니다.
            </p>
          </div>
        </section>

        <section className="mb-6 p-4 bg-blue-50 rounded-xl border border-blue-100">
          <h2 className="text-[18px] font-bold text-black mb-3">
            7. 판매자 정보 및 중개자 고지
          </h2>
          <div className="space-y-2 text-[14px] text-gray-700 leading-relaxed">
            <p>
              • 주문 화면에는 판매자 정보와 함께 미크로가 통신판매중개자라는 점이 고지됩니다.
            </p>
            <p>
              • 판매회원은 판매자 정보, 배송 조건, 고객응대 정보, 반품지, 환불 조건 등을 최신 상태로 유지해야 합니다.
            </p>
            <p>
              • 회사는 분쟁 예방 또는 소비자 보호를 위해 필요한 범위에서 사실 확인, 자료 요청, 노출 제한, 분쟁 대응 협조를 요구할 수 있습니다.
            </p>
          </div>
        </section>

        <div className="mt-8">
          <Link
            href="/info"
            className="block w-full h-[48px] bg-gray-100 text-gray-700 rounded-xl text-[15px] font-medium flex items-center justify-center active:bg-gray-200 transition-colors"
          >
            사업자 정보 / 고객센터 보기
          </Link>
        </div>
      </div>
    </Container>
  );
}
