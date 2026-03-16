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
          최종 업데이트: 2026-02-12
        </p>

        {/* Shipping */}
        <section className="mb-6">
          <h2 className="text-[18px] font-bold text-black mb-3">1. 배송</h2>
          <div className="space-y-2 text-[14px] text-gray-700 leading-relaxed">
            <p>
              • 주문 완료 후 영업일 기준 1~3일 이내 출고되며, 출고 후 1~2일
              내 배송됩니다.
            </p>
            <p>
              • 주말 및 공휴일은 배송이 진행되지 않으며, 영업일 기준으로
              배송됩니다.
            </p>
            <p>
              • 배송 지연이 발생할 경우 판매자가 별도로 안내할 수 있습니다.
            </p>
          </div>
        </section>

        {/* Shipping Fee */}
        <section className="mb-6 p-4 bg-blue-50 rounded-xl border border-blue-100">
          <h2 className="text-[18px] font-bold text-black mb-3">
            2. 배송비 정책
          </h2>
          <div className="space-y-2 text-[14px] text-gray-700 leading-relaxed">
            <p>
              • 배송비는 <strong>판매자별로 다르게 적용</strong>됩니다.
            </p>
            <p>
              • 판매자마다 무료배송 기준 금액과 배송비가 다를 수 있으니, 주문
              전 확인해 주세요.
            </p>
            <p>
              • 여러 판매자의 상품을 함께 구매할 경우, 판매자별로 주문이
              생성되며 각 판매자의 배송비 정책이 적용됩니다.
            </p>
          </div>
        </section>

        {/* Exchange & Return Period */}
        <section className="mb-6">
          <h2 className="text-[18px] font-bold text-black mb-3">
            3. 교환·반품 가능 기간
          </h2>
          <div className="space-y-2 text-[14px] text-gray-700 leading-relaxed">
            <p>
              • 상품 수령일로부터 7일 이내에 교환·반품을 신청할 수 있습니다.
            </p>
            <p>
              • 교환·반품 신청 시 고객센터 이메일로 연락 주시면 안내해
              드립니다.
            </p>
          </div>
        </section>

        {/* Cannot Exchange/Return */}
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

        {/* Refund */}
        <section className="mb-6">
          <h2 className="text-[18px] font-bold text-black mb-3">5. 환불 처리</h2>
          <div className="space-y-2 text-[14px] text-gray-700 leading-relaxed">
            <p>
              • 주문 취소 및 반품 승인 후, 결제 수단에 따라 환불이
              진행됩니다.
            </p>
            <p>
              • 현재 서비스는 테스트 결제 단계로, 실제 결제 모듈 연동 시
              결제사별 환불 정책이 적용됩니다.
            </p>
            <p>
              • 환불 처리는 영업일 기준 3~7일 이내에 완료되며, 결제사 사정에
              따라 지연될 수 있습니다.
            </p>
            <p>• 반품 배송비는 고객 부담이 원칙입니다.</p>
            <p>
              • 단, 상품 하자 또는 오배송의 경우 판매자가 배송비를
              부담합니다.
            </p>
          </div>
        </section>

        {/* Contact */}
        <section className="mb-6">
          <h2 className="text-[18px] font-bold text-black mb-3">
            6. 문의 채널
          </h2>
          <div className="space-y-2 text-[14px] text-gray-700 leading-relaxed">
            <p>
              • 교환·반품·환불 관련 문의는 고객센터 이메일로 연락해 주세요.
            </p>
            <p>
              • 공식 이메일:{" "}
              <a
                href="mailto:mikrobrand25@gmail.com"
                className="text-blue-600 font-medium"
              >
                mikrobrand25@gmail.com
              </a>
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

        {/* Policy Application Notice */}
        <section className="mb-6 p-4 bg-blue-50 rounded-xl border border-blue-100">
          <h2 className="text-[18px] font-bold text-black mb-3">
            7. 정책 적용 기준
          </h2>
          <div className="space-y-2 text-[14px] text-gray-700 leading-relaxed">
            <p>
              • 본 정책은 최종 업데이트 시행일 이후 주문 건부터 적용됩니다.
            </p>
            <p>
              • 시행일 이전에 발생한 주문 건은 주문 당시 유효했던 정책이
              적용됩니다.
            </p>
            <p>
              • 정책 변경 시 사전 공지를 원칙으로 하며, 고객에게 불리한 내용은
              소급 적용되지 않습니다.
            </p>
          </div>
        </section>

        {/* Bottom Link */}
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
