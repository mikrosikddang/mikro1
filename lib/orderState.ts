/**
 * Order State Machine
 *
 * Defines strict state transitions for order status management.
 * NO illegal state transitions are possible through this interface.
 */

import { OrderStatus } from "@prisma/client";

/**
 * Allowed state transitions.
 * Key = current status, Value = array of allowed next statuses.
 *
 * Transition rules:
 * - PENDING -> PAID (payment success)
 * - PENDING -> CANCELLED (customer cancels before payment)
 * - PAID -> SHIPPED (seller ships the order)
 * - PAID -> REFUND_REQUESTED (customer requests refund)
 * - SHIPPED -> COMPLETED (seller marks as completed)
 * - SHIPPED -> REFUND_REQUESTED (customer requests refund during shipping)
 * - REFUND_REQUESTED -> RETURN_STARTED (seller accepts return)
 * - RETURN_STARTED -> REFUNDED (inspection passed, refund)
 * - RETURN_STARTED -> RETURN_REJECTED (inspection failed)
 * - FAILED -> (no transitions, terminal state)
 * - CANCELLED -> (no transitions, terminal state)
 * - COMPLETED -> (no transitions, terminal state)
 * - REFUNDED -> (no transitions, terminal state)
 * - RETURN_REJECTED -> (no transitions, terminal state)
 * - EXPIRED -> (no transitions, terminal state)
 */
export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["PAID", "WAITING_DEPOSIT", "CANCELLED"],
  WAITING_DEPOSIT: ["PAID", "CANCELLED", "EXPIRED"],
  PAID: ["SHIPPED", "REFUND_REQUESTED"],
  SHIPPED: ["COMPLETED", "REFUND_REQUESTED"],
  REFUND_REQUESTED: ["RETURN_STARTED"],
  RETURN_STARTED: ["REFUNDED", "RETURN_REJECTED"],
  RETURN_REJECTED: [],
  FAILED: [],
  CANCELLED: [],
  COMPLETED: [],
  REFUNDED: [],
  EXPIRED: [],
};

/**
 * Check if a status transition is allowed.
 *
 * @param from - Current order status
 * @param to - Target order status
 * @returns true if transition is allowed, false otherwise
 */
export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  const allowedTransitions = ORDER_TRANSITIONS[from];
  return allowedTransitions.includes(to);
}

/**
 * Assert that a status transition is valid.
 * Throws an error if the transition is not allowed.
 *
 * @param from - Current order status
 * @param to - Target order status
 * @throws {OrderTransitionError} if transition is not allowed
 */
export function assertTransition(from: OrderStatus, to: OrderStatus): void {
  if (!canTransition(from, to)) {
    throw new OrderTransitionError(from, to);
  }
}

/**
 * Custom error for invalid order status transitions.
 */
export class OrderTransitionError extends Error {
  constructor(from: OrderStatus, to: OrderStatus) {
    super(
      `Invalid order status transition: ${from} -> ${to}. ` +
      `Allowed transitions from ${from}: [${ORDER_TRANSITIONS[from].join(", ")}]`
    );
    this.name = "OrderTransitionError";
  }
}

/**
 * Get human-readable label for order status (Korean).
 */
export function getStatusLabel(status: OrderStatus): string {
  const labels: Record<OrderStatus, string> = {
    PENDING: "결제 대기",
    WAITING_DEPOSIT: "입금 대기",
    PAID: "결제 완료",
    SHIPPED: "배송중",
    COMPLETED: "거래 완료",
    CANCELLED: "주문 취소",
    REFUND_REQUESTED: "환불 요청",
    RETURN_STARTED: "반품 진행중",
    RETURN_REJECTED: "반품 거절",
    REFUNDED: "환불 완료",
    FAILED: "주문 실패",
    EXPIRED: "기간 만료",
  };
  return labels[status];
}

/**
 * Get status badge color class for UI.
 */
export function getStatusColor(status: OrderStatus): string {
  const colors: Record<OrderStatus, string> = {
    PENDING: "bg-gray-100 text-gray-700",
    WAITING_DEPOSIT: "bg-amber-100 text-amber-700",
    PAID: "bg-blue-100 text-blue-700",
    SHIPPED: "bg-purple-100 text-purple-700",
    COMPLETED: "bg-green-100 text-green-700",
    CANCELLED: "bg-red-100 text-red-700",
    REFUND_REQUESTED: "bg-orange-100 text-orange-700",
    RETURN_STARTED: "bg-amber-100 text-amber-700",
    RETURN_REJECTED: "bg-red-100 text-red-700",
    REFUNDED: "bg-gray-800 text-white",
    FAILED: "bg-red-100 text-red-700",
    EXPIRED: "bg-gray-100 text-gray-500",
  };
  return colors[status];
}
