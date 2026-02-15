import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, canAccessSellerFeatures } from "@/lib/auth";
import { OrderStatus, PaymentStatus } from "@prisma/client";

export const runtime = "nodejs";

interface SimulatePaymentFailRequest {
  orderIds: string[];
}

/**
 * POST /api/payments/simulate-fail
 * Simulate payment failure
 * Phase 2: All authenticated users (including sellers) can purchase
 *
 * Sets Payment.status = FAILED but keeps Order.status = PENDING
 * to allow retry. Does NOT deduct stock.
 * Idempotent: ignores orders that are not PENDING.
 */
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as SimulatePaymentFailRequest;

    if (!body.orderIds || !Array.isArray(body.orderIds) || body.orderIds.length === 0) {
      return NextResponse.json(
        { error: "orderIds array is required" },
        { status: 400 }
      );
    }

    await prisma.$transaction(async (tx) => {
      for (const orderId of body.orderIds) {
        const order = await tx.order.findUnique({
          where: { id: orderId },
          include: {
            payment: true,
          },
        });

        if (!order) {
          throw new Error(`Order not found: ${orderId}`);
        }

        if (order.buyerId !== session.userId) {
          throw new Error(`Forbidden: Order ${orderId} does not belong to you`);
        }

        if (order.status !== OrderStatus.PENDING) {
          continue;
        }

        if (order.payment) {
          await tx.payment.update({
            where: { id: order.payment.id },
            data: {
              status: PaymentStatus.FAILED,
            },
          });
        } else {
          await tx.payment.create({
            data: {
              orderId: order.id,
              status: PaymentStatus.FAILED,
              amountKrw: order.totalPayKrw || order.totalAmountKrw,
              method: "TEST_SIMULATION",
            },
          });
        }
      }
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    if (error.message.includes("Forbidden")) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }

    if (error.message.includes("not found")) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Failed to process payment failure" },
      { status: 500 }
    );
  }
}
