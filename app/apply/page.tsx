import Link from "next/link";
import Container from "@/components/Container";

export default function ApplyPage() {
  return (
    <Container>
      <div className="pt-4 pb-20">
        <h1 className="text-[22px] font-bold text-black mb-2">입점 안내</h1>
        <p className="text-[14px] text-gray-500 mb-8">
          mikro와 함께 동대문 패션을 온라인으로 판매하세요
        </p>

        {/* 입점 조건 */}
        <section className="mb-8">
          <h2 className="text-[16px] font-bold text-black mb-3">입점 조건</h2>
          <div className="space-y-3">
            <div className="p-4 bg-gray-50 rounded-xl">
              <p className="text-[14px] font-medium text-gray-900">사업자등록증 보유</p>
              <p className="text-[13px] text-gray-500 mt-1">
                개인사업자 또는 법인사업자 모두 가능합니다
              </p>
            </div>
            <div className="p-4 bg-gray-50 rounded-xl">
              <p className="text-[14px] font-medium text-gray-900">동대문 매장 운영</p>
              <p className="text-[13px] text-gray-500 mt-1">
                APM, 누죤, 디자이너클럽, 밀리오레 등 동대문 상권 매장
              </p>
            </div>
            <div className="p-4 bg-gray-50 rounded-xl">
              <p className="text-[14px] font-medium text-gray-900">자체 상품 보유</p>
              <p className="text-[13px] text-gray-500 mt-1">
                직접 제작 또는 독점 유통하는 패션 상품
              </p>
            </div>
          </div>
        </section>

        {/* 신청 방법 */}
        <section className="mb-8">
          <h2 className="text-[16px] font-bold text-black mb-3">신청 방법</h2>
          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="w-7 h-7 bg-black text-white rounded-full flex items-center justify-center text-[13px] font-bold shrink-0">
                1
              </div>
              <div>
                <p className="text-[14px] font-medium text-gray-900">문의 접수</p>
                <p className="text-[13px] text-gray-500 mt-0.5">
                  아래 이메일로 입점 문의를 보내주세요
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-7 h-7 bg-black text-white rounded-full flex items-center justify-center text-[13px] font-bold shrink-0">
                2
              </div>
              <div>
                <p className="text-[14px] font-medium text-gray-900">서류 제출</p>
                <p className="text-[13px] text-gray-500 mt-0.5">
                  사업자등록증, 매장 사진, 대표 상품 이미지를 첨부해주세요
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-7 h-7 bg-black text-white rounded-full flex items-center justify-center text-[13px] font-bold shrink-0">
                3
              </div>
              <div>
                <p className="text-[14px] font-medium text-gray-900">심사 및 승인</p>
                <p className="text-[13px] text-gray-500 mt-0.5">
                  접수 후 영업일 기준 3일 이내 안내드립니다
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="space-y-4">
          <Link
            href="/seller/apply"
            className="block w-full h-14 bg-black text-white rounded-xl text-[16px] font-bold flex items-center justify-center active:bg-gray-800 transition-colors"
          >
            지금 신청하기
          </Link>

          <div className="p-5 bg-gray-50 rounded-xl text-center">
            <p className="text-[14px] font-medium text-gray-700 mb-1">
              입점 문의
            </p>
            <p className="text-[13px] text-gray-500">partner@mikro.kr</p>
          </div>
        </section>
      </div>
    </Container>
  );
}
