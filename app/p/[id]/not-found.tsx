import Link from "next/link";
import Container from "@/components/Container";

export default function ProductNotFound() {
  return (
    <Container>
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <p className="text-[48px] mb-4">🫥</p>
        <h2 className="text-[18px] font-bold text-gray-900 mb-2">
          상품을 찾을 수 없어요
        </h2>
        <p className="text-[14px] text-gray-500 mb-8">
          삭제되었거나 존재하지 않는 상품입니다.
        </p>
        <Link
          href="/"
          className="px-6 py-3 bg-black text-white rounded-xl text-[14px] font-medium"
        >
          홈으로 돌아가기
        </Link>
      </div>
    </Container>
  );
}
