import { prisma } from "@/lib/prisma";

/**
 * 알림 생성 헬퍼
 * 에러 발생 시 console.error로 기록하되, 호출자에게 throw하지 않음 (알림 실패가 비즈니스 로직을 막으면 안 됨)
 */
export async function createNotification(
  userId: string,
  type: string,
  title: string,
  body?: string,
  link?: string,
): Promise<void> {
  try {
    await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        body: body ?? null,
        link: link ?? null,
      },
    });
  } catch (error) {
    console.error("[createNotification] Failed:", { userId, type, title }, error);
  }
}

/**
 * 주문 상태 변경 시 알림 생성 (바이어/셀러 양쪽)
 */
export async function notifyOrderStatusChange(
  orderId: string,
  orderNo: string,
  buyerId: string,
  sellerId: string,
  newStatus: string,
): Promise<void> {
  const orderLink = `/orders/${orderId}`;
  const sellerOrderLink = `/seller/orders`;

  switch (newStatus) {
    case "PAID":
      await createNotification(
        buyerId,
        "ORDER_STATUS",
        "결제가 완료되었습니다",
        `주문번호 ${orderNo}의 결제가 완료되었습니다.`,
        orderLink,
      );
      await createNotification(
        sellerId,
        "ORDER_STATUS",
        "새 주문이 접수되었습니다",
        `주문번호 ${orderNo}의 결제가 완료되었습니다. 발송을 준비해주세요.`,
        sellerOrderLink,
      );
      break;

    case "SHIPPED":
      await createNotification(
        buyerId,
        "ORDER_STATUS",
        "상품이 발송되었습니다",
        `주문번호 ${orderNo}의 상품이 발송되었습니다.`,
        orderLink,
      );
      break;

    case "COMPLETED":
      await createNotification(
        buyerId,
        "ORDER_STATUS",
        "거래가 완료되었습니다",
        `주문번호 ${orderNo}의 거래가 완료되었습니다. 리뷰를 작성해보세요!`,
        orderLink,
      );
      break;

    case "REFUND_REQUESTED":
      await createNotification(
        sellerId,
        "ORDER_STATUS",
        "환불 요청이 접수되었습니다",
        `주문번호 ${orderNo}에 대한 환불 요청이 접수되었습니다.`,
        sellerOrderLink,
      );
      break;

    case "REFUNDED":
      await createNotification(
        buyerId,
        "ORDER_STATUS",
        "환불이 완료되었습니다",
        `주문번호 ${orderNo}의 환불이 완료되었습니다.`,
        orderLink,
      );
      break;

    case "CANCELLED":
      await createNotification(
        buyerId,
        "ORDER_STATUS",
        "주문이 취소되었습니다",
        `주문번호 ${orderNo}이 취소되었습니다.`,
        orderLink,
      );
      break;
  }
}

/**
 * 문의 답변 시 알림 생성
 */
export async function notifyInquiryAnswer(
  inquiryUserId: string,
  productTitle: string,
  productId: string,
): Promise<void> {
  await createNotification(
    inquiryUserId,
    "INQUIRY_ANSWER",
    "상품 문의에 답변이 달렸습니다",
    `"${productTitle}" 상품 문의에 답변이 등록되었습니다.`,
    `/p/${productId}`,
  );
}
