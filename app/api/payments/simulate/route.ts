import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, canAccessSellerFeatures } from "@/lib/auth";
import { OrderStatus } from "@prisma/client";

export const runtime = "nodejs";

interface SimulatePaymentRequest {
  orderIds: string[];
}

/**
 * POST /api/payments/simulate
 * Simulate payment success with atomic stock deduction
 * Phase 2: All authenticated users (including sellers) can purchase
 *
 * CRITICAL: This performs atomic stock deduction using updateMany with
 * WHERE stock >= quantity to prevent race conditions and overselling
 */
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as SimulatePaymentRequest;

    if (!body.orderIds || !Array.isArray(body.orderIds) || body.orderIds.length === 0) {
      return NextResponse.json(
        { error: "orderIds array is required" },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const orders = [];

      for (const orderId of body.orderIds) {
        const order = await tx.order.findUnique({
          where: { id: orderId },
          include: {
            items: {
              include: {
                product: true,
                variant: true,
              },
            },
            seller: {
              include: {
                sellerProfile: true,
              },
            },
            payment: true,
          },
        });

        if (!order) {
          throw new Error(`Order not found: ${orderId}`);
        }

        if (order.buyerId !== session.userId) {
          throw new Error(`Forbidden: Order ${orderId} does not belong to you`);
        }

        if (order.status === OrderStatus.PAID) {
          return { ok: true, alreadyPaid: true };
        }

        if (order.status !== OrderStatus.PENDING) {
          throw new Error(`Order ${orderId} is not in PENDING status`);
        }

        // Check expiration
        if (order.expiresAt && new Date() > order.expiresAt) {
          await tx.order.update({
            where: { id: order.id },
            data: { status: OrderStatus.CANCELLED },
          });
          throw new Error("ORDER_EXPIRED");
        }

        orders.push(order);
      }

      for (const order of orders) {
        for (const item of order.items) {
          if (!item.variant) {
            throw new Error(`Variant not found for order item ${item.id}`);
          }

          const result = await tx.productVariant.updateMany({
            where: {
              id: item.variant.id,
              stock: { gte: item.quantity },
            },
            data: {
              stock: { decrement: item.quantity },
            },
          });

          if (result.count === 0) {
            throw new Error(
              `OUT_OF_STOCK: ${item.product.title} (${item.variant.sizeLabel}): requested ${item.quantity}, insufficient stock`
            );
          }
        }

        // Use immutable snapshots - NO recalculation
        // All pricing is already stored in the order at creation time

        await tx.order.update({
          where: { id: order.id },
          data: {
            status: OrderStatus.PAID,
            expiresAt: null, // Clear expiration for paid orders
          },
        });

        if (order.payment) {
          await tx.payment.update({
            where: { id: order.payment.id },
            data: {
              status: "DONE",
              approvedAt: new Date(),
            },
          });
        } else {
          await tx.payment.create({
            data: {
              orderId: order.id,
              status: "DONE",
              amountKrw: order.totalPayKrw, // Use snapshot from order
              method: "TEST_SIMULATION",
              approvedAt: new Date(),
            },
          });
        }
      }

      // TRACK 3: Clear cart after successful payment
      // This ensures cart is cleaned up atomically with payment confirmation
      await tx.cartItem.deleteMany({
        where: { userId: session.userId },
      });

      return { ok: true, alreadyPaid: false };
    });

    return NextResponse.json(result);
  } catch (error: any) {
    if (error.message.includes("ORDER_EXPIRED")) {
      return NextResponse.json(
        { error: "ORDER_EXPIRED: 주문 시간이 만료되었습니다" },
        { status: 410 }
      );
    }

    if (error.message.includes("OUT_OF_STOCK")) {
      return NextResponse.json(
        { error: error.message },
        { status: 409 }
      );
    }

    if (error.message.includes("Forbidden")) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }

    if (
      error.message.includes("not in PENDING status") ||
      error.message.includes("not found")
    ) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Payment simulation failed" },
      { status: 500 }
    );
  }
}
