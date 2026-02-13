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
 * - REFUND_REQUESTED -> REFUNDED (admin approves refund)
 * - FAILED -> (no transitions, terminal state)
 * - CANCELLED -> (no transitions, terminal state)
 * - COMPLETED -> (no transitions, terminal state)
 * - REFUNDED -> (no transitions, terminal state)
 */
export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["PAID", "CANCELLED"],
  PAID: ["SHIPPED", "REFUND_REQUESTED"],
  SHIPPED: ["COMPLETED", "REFUND_REQUESTED"],
  REFUND_REQUESTED: ["REFUNDED"],
  FAILED: [],
  CANCELLED: [],
  COMPLETED: [],
  REFUNDED: [],
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
    PAID: "결제 완료",
    SHIPPED: "배송중",
    COMPLETED: "거래 완료",
    CANCELLED: "주문 취소",
    REFUND_REQUESTED: "환불 요청",
    REFUNDED: "환불 완료",
    FAILED: "주문 실패",
  };
  return labels[status];
}

/**
 * Get status badge color class for UI.
 */
export function getStatusColor(status: OrderStatus): string {
  const colors: Record<OrderStatus, string> = {
    PENDING: "bg-gray-100 text-gray-700",
    PAID: "bg-blue-100 text-blue-700",
    SHIPPED: "bg-purple-100 text-purple-700",
    COMPLETED: "bg-green-100 text-green-700",
    CANCELLED: "bg-red-100 text-red-700",
    REFUND_REQUESTED: "bg-orange-100 text-orange-700",
    REFUNDED: "bg-gray-800 text-white",
    FAILED: "bg-red-100 text-red-700",
  };
  return colors[status];
}
