import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, canAccessSellerFeatures } from "@/lib/auth";

export const runtime = "nodejs";

interface CreateAddressRequest {
  name: string;
  phone: string;
  zipCode: string;
  addr1: string;
  addr2?: string;
  isDefault?: boolean;
}

/**
 * GET /api/addresses
 * Get all addresses for current user (CUSTOMER only)
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (canAccessSellerFeatures(session.role)) {
      return NextResponse.json(
        { error: "Sellers cannot manage addresses" },
        { status: 403 }
      );
    }

    const addresses = await prisma.address.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(addresses);
  } catch (error) {
    console.error("GET /api/addresses error:", error);
    return NextResponse.json(
      { error: "Failed to fetch addresses" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/addresses
 * Create new address (CUSTOMER only)
 */
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (canAccessSellerFeatures(session.role)) {
      return NextResponse.json(
        { error: "Sellers cannot manage addresses" },
        { status: 403 }
      );
    }

    const body = (await request.json()) as CreateAddressRequest;

    if (!body.name || !body.phone || !body.zipCode || !body.addr1) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const address = await prisma.$transaction(async (tx) => {
      // Check if user has any addresses
      const existingCount = await tx.address.count({
        where: { userId: session.userId },
      });

      // If first address, force isDefault=true
      const shouldBeDefault = existingCount === 0 || body.isDefault === true;

      // If setting as default, unset all other defaults
      if (shouldBeDefault) {
        await tx.address.updateMany({
          where: { userId: session.userId },
          data: { isDefault: false },
        });
      }

      // Create new address
      return await tx.address.create({
        data: {
          userId: session.userId,
          name: body.name,
          phone: body.phone,
          zipCode: body.zipCode,
          addr1: body.addr1,
          addr2: body.addr2 || null,
          isDefault: shouldBeDefault,
        },
      });
    });

    return NextResponse.json(address);
  } catch (error) {
    console.error("POST /api/addresses error:", error);
    return NextResponse.json(
      { error: "Failed to create address" },
      { status: 500 }
    );
  }
}
