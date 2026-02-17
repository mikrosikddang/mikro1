import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, isAdmin } from "@/lib/auth";
import { OrderStatus } from "@prisma/client";

export const runtime = "nodejs";

interface OverrideRequest {
  to: OrderStatus;
  reason: string;
}

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/admin/orders/[id]/override
 *
 * ADMIN ONLY: Override order status for dispute resolution.
 * This endpoint bypasses normal transition rules and logs all actions for audit.
 *
 * Requirements:
 * - User must have ADMIN role
 * - Reason must be provided (min 10 characters)
 * - All transitions are allowed (ANY -> ANY)
 * - Uses optimistic concurrency control
 * - Logs override event in OrderAuditLog
 *
 * Request body:
 * {
 *   "to": "REFUNDED",
 *   "reason": "Customer dispute resolved - issuing refund per legal requirement"
 * }
 *
 * Responses:
 * - 200: Override successful
 * - 401: Not authenticated
 * - 403: Not an admin
 * - 404: Order not found
 * - 400: Missing/invalid fields
 * - 409: Concurrent update conflict
 */
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    // 1. Authentication and authorization
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isAdmin(session.role)) {
      return NextResponse.json(
        { error: "Forbidden: ADMIN role required" },
        { status: 403 }
      );
    }

    const { id } = await context.params;
    const body = (await request.json()) as OverrideRequest;

    // 2. Validate request
    if (!body.to) {
      return NextResponse.json(
        { error: "Missing required field: to" },
        { status: 400 }
      );
    }

    if (!body.reason || body.reason.length < 10) {
      return NextResponse.json(
        { error: "Reason must be at least 10 characters" },
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

    // 3. Execute override in transaction with audit logging
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

      const fromStatus = order.status;

      // Check if already in target state (idempotent)
      if (fromStatus === body.to) {
        return { ok: true, order, alreadyDone: true };
      }

      // 4. Stock restoration if transitioning to REFUNDED
      const warnings: string[] = [];

      if (body.to === OrderStatus.REFUNDED && fromStatus !== OrderStatus.REFUNDED) {
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

      // 5. Update order status with optimistic concurrency control
      const updateResult = await tx.order.updateMany({
        where: {
          id,
          status: fromStatus, // Only update if status hasn't changed
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

      // 6. Log audit record
      await tx.orderAuditLog.create({
        data: {
          orderId: id,
          adminId: session.userId,
          from: fromStatus,
          to: body.to,
          reason: body.reason,
        },
      });

      // 7. Reload order with new status
      const updatedOrder = await tx.order.findUnique({
        where: { id },
      });

      return {
        ok: true,
        order: updatedOrder,
        fromStatus,
        toStatus: body.to,
        warnings: warnings.length > 0 ? warnings : undefined,
      };
    });

    return NextResponse.json(result);
  } catch (error: any) {
    if (error.message.includes("ORDER_NOT_FOUND")) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (error.message.includes("CONFLICT")) {
      return NextResponse.json(
        { error: error.message.replace("CONFLICT: ", "") },
        { status: 409 }
      );
    }

    console.error("Admin override error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to override order status" },
      { status: 500 }
    );
  }
}
