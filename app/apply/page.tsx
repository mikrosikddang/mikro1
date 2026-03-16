import Link from "next/link";
import Container from "@/components/Container";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function ApplyPage() {
  const session = await getSession();
  const sellerProfile = session
    ? await prisma.sellerProfile.findUnique({
        where: { userId: session.userId },
        select: { status: true },
      })
    : null;

  const ctaHref = !session
    ? "/login?next=/apply/seller"
    : sellerProfile?.status === "APPROVED"
      ? "/seller"
      : "/apply/seller";
  const ctaLabel = !session
    ? "지금 신청하기"
    : sellerProfile?.status === "PENDING"
      ? "심사중"
      : sellerProfile?.status === "REJECTED"
        ? "신청 정보 수정하기"
        : sellerProfile?.status === "APPROVED"
          ? "판매자 센터로 이동"
          : "지금 신청하기";
  return (
    <Container>
      <div className="pt-4 pb-20">
        <h1 className="text-[22px] font-bold text-black mb-2">입점 안내</h1>
        <p className="text-[14px] text-gray-500 mb-8">
          미크로를 통해 나만의 상점을 가져보세요
        </p>

        {/* 입점 조건 */}
        <section className="mb-8">
          <h2 className="text-[16px] font-bold text-black mb-3">입점 조건</h2>
          <div className="space-y-3">
            <div className="p-4 bg-gray-50 rounded-xl">
              <p className="text-[14px] font-medium text-gray-900">필수 자격</p>
              <p className="text-[13px] text-gray-500 mt-1">
                정식 판매를 위해 사업자등록증과 통신판매업 신고증을 필수로 보유하고 있어야 합니다.
              </p>
            </div>
            <div className="p-4 bg-gray-50 rounded-xl">
              <p className="text-[14px] font-medium text-gray-900">준비 서류</p>
              <p className="text-[13px] text-gray-500 mt-1">
                사업자등록증 1부, 통신판매업 신고증 1부, 통장 사본을 준비해주세요.
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
                <p className="text-[14px] font-medium text-gray-900">고객용 회원가입</p>
                <p className="text-[13px] text-gray-500 mt-0.5">
                  먼저 미크로에 일반 회원으로 가입하세요
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-7 h-7 bg-black text-white rounded-full flex items-center justify-center text-[13px] font-bold shrink-0">
                2
              </div>
              <div>
                <p className="text-[14px] font-medium text-gray-900">입점 신청</p>
                <p className="text-[13px] text-gray-500 mt-0.5">
                  회원가입 후 입점 신청서를 작성해 주세요
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
            href={ctaHref}
            className="w-full h-14 bg-black text-white rounded-xl text-[16px] font-bold flex items-center justify-center active:bg-gray-800 transition-colors"
          >
            {ctaLabel}
          </Link>

          <div className="p-5 bg-gray-50 rounded-xl text-center">
            <p className="text-[14px] font-medium text-gray-700 mb-1">
              입점 문의
            </p>
            <p className="text-[13px] text-gray-500">mikrobrand25@gmail.com</p>
          </div>
        </section>
      </div>
    </Container>
  );
}
