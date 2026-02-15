import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, canAccessSellerFeatures } from "@/lib/auth";
import { generateOrderNo } from "@/lib/order-utils";
import { OrderStatus } from "@prisma/client";

export const runtime = "nodejs";

interface CreateOrderItem {
  productId: string;
  variantId: string;
  quantity: number;
}

interface CreateOrderAddress {
  name: string;
  phone: string;
  zipCode: string;
  addr1: string;
  addr2?: string;
  memo?: string;
}

interface CreateOrderRequest {
  items: CreateOrderItem[];
  address?: CreateOrderAddress;
}

/**
 * POST /api/orders
 * 장바구니 기반 주문 생성 (재고 검증만, 재고 차감은 결제 확정 시)
 */
export async function POST(request: Request) {
  try {
    // 1) CUSTOMER 인증 필수
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // SELLER는 주문 생성 불가
    if (canAccessSellerFeatures(session.role)) {
      return NextResponse.json(
        { error: "Sellers cannot create orders" },
        { status: 403 }
      );
    }

    const body = (await request.json()) as CreateOrderRequest;

    if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json(
        { error: "Items array is required" },
        { status: 400 }
      );
    }

    // 2) seller별로 아이템 그룹화 (Order는 seller별로 생성)
    const itemsBySeller = new Map<string, CreateOrderItem[]>();

    // 트랜잭션으로 처리
    const orders = await prisma.$transaction(async (tx) => {
      // 3) 각 아이템 검증 및 그룹화
      for (const item of body.items) {
        if (!item.productId || !item.variantId || item.quantity <= 0) {
          throw new Error("Invalid item data");
        }

        // variant 조회
        const variant = await tx.productVariant.findUnique({
          where: { id: item.variantId },
          include: {
            product: {
              include: { seller: true },
            },
          },
        });

        if (!variant) {
          throw new Error(`Variant not found: ${item.variantId}`);
        }

        // product 검증
        const product = variant.product;
        if (product.id !== item.productId) {
          throw new Error("Product/variant mismatch");
        }

        if (product.isDeleted || !product.isActive) {
          throw new Error(`Product is not available: ${product.title}`);
        }

        // 재고 검증
        if (item.quantity > variant.stock) {
          throw new Error(
            `Insufficient stock for ${product.title} (${variant.sizeLabel}): requested ${item.quantity}, available ${variant.stock}`
          );
        }

        // seller별 그룹화
        const sellerId = product.sellerId;
        if (!itemsBySeller.has(sellerId)) {
          itemsBySeller.set(sellerId, []);
        }
        itemsBySeller.get(sellerId)!.push(item);
      }

      // 4) seller별로 Order 생성
      const createdOrders = [];

      for (const [sellerId, sellerItems] of itemsBySeller) {
        // 각 item의 현재 priceKrw 계산
        let totalAmountKrw = 0;
        const orderItemsData = [];

        for (const item of sellerItems) {
          const variant = await tx.productVariant.findUnique({
            where: { id: item.variantId },
            include: { product: true },
          });

          if (!variant) throw new Error("Variant disappeared");

          const unitPrice = variant.product.priceKrw;
          totalAmountKrw += unitPrice * item.quantity;

          orderItemsData.push({
            productId: item.productId,
            variantId: item.variantId,
            quantity: item.quantity,
            unitPriceKrw: unitPrice,
          });
        }

        // Get seller profile for shipping fee calculation
        const seller = await tx.user.findUnique({
          where: { id: sellerId },
          include: { sellerProfile: true },
        });

        const shippingFeeKrw = seller?.sellerProfile?.shippingFeeKrw || 3000;
        const freeShippingThreshold = seller?.sellerProfile?.freeShippingThreshold || 50000;

        // Calculate shipping fee
        let calculatedShippingFee = shippingFeeKrw;
        if (totalAmountKrw >= freeShippingThreshold) {
          calculatedShippingFee = 0;
        }

        const totalPayKrw = totalAmountKrw + calculatedShippingFee;

        // Set expiration: 30 minutes from now
        const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

        // Order 생성
        const order = await tx.order.create({
          data: {
            orderNo: generateOrderNo(),
            buyerId: session.userId,
            sellerId,
            status: OrderStatus.PENDING,
            totalAmountKrw,
            itemsSubtotalKrw: totalAmountKrw,
            shippingFeeKrw: calculatedShippingFee,
            totalPayKrw,
            shipToName: body.address?.name,
            shipToPhone: body.address?.phone,
            shipToZip: body.address?.zipCode,
            shipToAddr1: body.address?.addr1,
            shipToAddr2: body.address?.addr2,
            shipToMemo: body.address?.memo,
            expiresAt,
            items: {
              create: orderItemsData,
            },
          },
          include: {
            items: true,
          },
        });

        createdOrders.push(order);
      }

      // 재고 차감은 아직 하지 않음 (C-2 결제 확정에서 처리)

      return createdOrders;
    });

    // 5) 응답
    // 단일 seller인 경우 하나의 orderId, 여러 seller인 경우 배열로 반환
    if (orders.length === 1) {
      return NextResponse.json({
        ok: true,
        orderId: orders[0].id,
        totalAmount: orders[0].totalAmountKrw,
      });
    } else {
      return NextResponse.json({
        ok: true,
        orders: orders.map((o) => ({
          orderId: o.id,
          sellerId: o.sellerId,
          totalAmount: o.totalAmountKrw,
        })),
      });
    }
  } catch (error: any) {
    console.error("POST /api/orders error:", error);

    // 재고 부족 등 비즈니스 에러는 409
    if (
      error.message.includes("Insufficient stock") ||
      error.message.includes("not available")
    ) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    return NextResponse.json(
      { error: error.message || "Failed to create order" },
      { status: 500 }
    );
  }
}
