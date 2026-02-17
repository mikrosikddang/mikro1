import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, isCustomer, isSeller, isAdmin } from "@/lib/auth";
import { OrderStatus } from "@prisma/client";
import { canTransition, assertTransition, OrderTransitionError } from "@/lib/orderState";

export const runtime = "nodejs";

interface UpdateStatusRequest {
  to: OrderStatus;
}

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * PATCH /api/orders/[id]/status
 *
 * Update order status with strict role-based permissions and state machine validation.
 * PRODUCTION-GRADE GOVERNANCE: Seller-driven operations, Admin oversight only.
 *
 * Auth rules:
 * - CUSTOMER can:
 *   - PENDING -> CANCELLED (cancel before payment)
 *   - PAID/SHIPPED -> REFUND_REQUESTED (request refund)
 * - SELLER can:
 *   - PAID -> SHIPPED (ship order)
 *   - SHIPPED -> COMPLETED (mark as completed)
 *   - REFUND_REQUESTED -> REFUNDED (approve refund + restore stock)
 * - ADMIN:
 *   - NOT allowed normal transitions
 *   - Must use override endpoint for dispute resolution
 *
 * Ownership rules:
 * - CUSTOMER must match order.buyerId
 * - SELLER must match order.sellerId
 * - ADMIN does not use this endpoint
 *
 * Responses:
 * - 200: Success
 * - 401: Not authenticated
 * - 403: Role mismatch, ownership violation, or ADMIN attempted normal transition
 * - 404: Order not found
 * - 400: Invalid transition
 * - 409: Conflict (concurrent update or already in target state)
 */
export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    // 1. Authentication
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const body = (await request.json()) as UpdateStatusRequest;

    if (!body.to) {
      return NextResponse.json(
        { error: "Missing required field: to" },
        { status: 400 }
      );
    }

    // Validate enum value
    const validStatuses = Object.values(OrderStatus);
    if (!validStatuses.includes(body.to)) {
      return NextResponse.json(
        { error: `Invalid status: ${body.to}` },
        { status: 400 }
      );
    }

    // 2. Execute transition in transaction with optimistic concurrency control
    const result = await prisma.$transaction(async (tx) => {
      // Load order with current status
      const order = await tx.order.findUnique({
        where: { id },
        include: {
          items: {
            include: {
              variant: true,
            },
          },
        },
      });

      if (!order) {
        throw new Error("ORDER_NOT_FOUND");
      }

      // 3. Role and ownership verification
      const isCustomerRole = isCustomer(session.role);
      const isSellerRole = isSeller(session.role);
      const isAdminRole = isAdmin(session.role);

      // ADMIN is NOT allowed to use normal transitions
      if (isAdminRole) {
        throw new Error("FORBIDDEN: ADMIN must use override endpoint for order status changes");
      }

      // Ownership checks
      if (isCustomerRole && order.buyerId !== session.userId) {
        throw new Error("FORBIDDEN: Order does not belong to you");
      }

      if (isSellerRole && order.sellerId !== session.userId) {
        throw new Error("FORBIDDEN: Order does not belong to your shop");
      }

      // 4. Check if already in target state (idempotent)
      if (order.status === body.to) {
        return { ok: true, order, alreadyDone: true };
      }

      // 5. Validate state transition
      try {
        assertTransition(order.status, body.to);
      } catch (error) {
        if (error instanceof OrderTransitionError) {
          throw new Error(`INVALID_TRANSITION: ${error.message}`);
        }
        throw error;
      }

      // 6. Role-based permission check for specific transitions
      if (isCustomerRole) {
        // CUSTOMER can: PENDING -> CANCELLED, PAID/SHIPPED -> REFUND_REQUESTED
        const allowedCustomerTransitions: [OrderStatus, OrderStatus][] = [
          [OrderStatus.PENDING, OrderStatus.CANCELLED],
          [OrderStatus.PAID, OrderStatus.REFUND_REQUESTED],
          [OrderStatus.SHIPPED, OrderStatus.REFUND_REQUESTED],
        ];

        const isAllowed = allowedCustomerTransitions.some(
          ([from, to]) => order.status === from && body.to === to
        );

        if (!isAllowed) {
          throw new Error(
            `FORBIDDEN: CUSTOMER cannot transition ${order.status} -> ${body.to}`
          );
        }
      } else if (isSellerRole) {
        // SELLER can: PAID -> SHIPPED, SHIPPED -> COMPLETED, REFUND_REQUESTED -> REFUNDED
        const allowedSellerTransitions: [OrderStatus, OrderStatus][] = [
          [OrderStatus.PAID, OrderStatus.SHIPPED],
          [OrderStatus.SHIPPED, OrderStatus.COMPLETED],
          [OrderStatus.REFUND_REQUESTED, OrderStatus.REFUNDED],
        ];

        const isAllowed = allowedSellerTransitions.some(
          ([from, to]) => order.status === from && body.to === to
        );

        if (!isAllowed) {
          throw new Error(
            `FORBIDDEN: SELLER cannot transition ${order.status} -> ${body.to}`
          );
        }
      } else {
        throw new Error("FORBIDDEN: Invalid role");
      }

      // 7. Special handling: REFUND (restore stock atomically)
      const warnings: string[] = [];

      if (body.to === OrderStatus.REFUNDED) {
        // Restore stock for all items
        for (const item of order.items) {
          if (!item.variantId) {
            warnings.push(`Item ${item.id}: No variantId, cannot restore stock`);
            continue;
          }

          if (!item.variant) {
            warnings.push(
              `Item ${item.id}: Variant ${item.variantId} not found, cannot restore stock`
            );
            continue;
          }

          // Atomic stock increment
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: {
              stock: {
                increment: item.quantity,
              },
            },
          });
        }
      }

      // 8. Update order status with optimistic concurrency control
      const updateResult = await tx.order.updateMany({
        where: {
          id,
          status: order.status, // Only update if status hasn't changed
        },
        data: {
          status: body.to,
        },
      });

      if (updateResult.count === 0) {
        throw new Error(
          "CONFLICT: Order status was changed by another request. Please retry."
        );
      }

      // 9. Reload order with new status
      const updatedOrder = await tx.order.findUnique({
        where: { id },
      });

      return {
        ok: true,
        order: updatedOrder,
        warnings: warnings.length > 0 ? warnings : undefined,
      };
    });

    return NextResponse.json(result);
  } catch (error: any) {
    if (error.message.includes("ORDER_NOT_FOUND")) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (error.message.includes("FORBIDDEN")) {
      return NextResponse.json(
        { error: error.message.replace("FORBIDDEN: ", "") },
        { status: 403 }
      );
    }

    if (error.message.includes("INVALID_TRANSITION")) {
      return NextResponse.json(
        { error: error.message.replace("INVALID_TRANSITION: ", "") },
        { status: 400 }
      );
    }

    if (error.message.includes("CONFLICT")) {
      return NextResponse.json(
        { error: error.message.replace("CONFLICT: ", "") },
        { status: 409 }
      );
    }

    console.error("Order status update error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update order status" },
      { status: 500 }
    );
  }
}
