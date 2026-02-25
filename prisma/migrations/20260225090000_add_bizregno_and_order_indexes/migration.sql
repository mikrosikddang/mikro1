-- AlterTable: SellerProfile에 사업자등록번호 필드 추가
ALTER TABLE "SellerProfile" ADD COLUMN "bizRegNo" TEXT;

-- CreateIndex: 셀러 주문관리 상태별 필터 최적화
CREATE INDEX "Order_sellerId_status_idx" ON "Order"("sellerId", "status");

-- CreateIndex: 주문 목록 시간순 정렬 최적화
CREATE INDEX "Order_createdAt_idx" ON "Order"("createdAt");
