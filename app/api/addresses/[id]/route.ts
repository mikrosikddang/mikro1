import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, canAccessSellerFeatures } from "@/lib/auth";

export const runtime = "nodejs";

type Props = { params: Promise<{ id: string }> };

interface UpdateAddressRequest {
  name?: string;
  phone?: string;
  zipCode?: string;
  addr1?: string;
  addr2?: string;
  isDefault?: boolean;
}

/**
 * PATCH /api/addresses/[id]
 * Update address (CUSTOMER only, must own the address)
 */
export async function PATCH(request: Request, { params }: Props) {
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

    const { id } = await params;
    const body = (await request.json()) as UpdateAddressRequest;

    // Verify ownership
    const existing = await prisma.address.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Address not found" },
        { status: 404 }
      );
    }

    if (existing.userId !== session.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const address = await prisma.$transaction(async (tx) => {
      // If setting as default, unset all other defaults
      if (body.isDefault === true) {
        await tx.address.updateMany({
          where: { userId: session.userId, id: { not: id } },
          data: { isDefault: false },
        });
      }

      // Update the address
      return await tx.address.update({
        where: { id },
        data: {
          name: body.name,
          phone: body.phone,
          zipCode: body.zipCode,
          addr1: body.addr1,
          addr2: body.addr2,
          isDefault: body.isDefault,
        },
      });
    });

    return NextResponse.json(address);
  } catch (error) {
    console.error("PATCH /api/addresses/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to update address" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/addresses/[id]
 * Delete address (CUSTOMER only, must own the address)
 */
export async function DELETE(request: Request, { params }: Props) {
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

    const { id } = await params;

    // Verify ownership
    const existing = await prisma.address.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Address not found" },
        { status: 404 }
      );
    }

    if (existing.userId !== session.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.$transaction(async (tx) => {
      const wasDefault = existing.isDefault;

      // Delete the address
      await tx.address.delete({ where: { id } });

      // If deleting default, set most recent remaining address as default
      if (wasDefault) {
        const remaining = await tx.address.findFirst({
          where: { userId: session.userId },
          orderBy: { createdAt: "desc" },
        });

        if (remaining) {
          await tx.address.update({
            where: { id: remaining.id },
            data: { isDefault: true },
          });
        }
      }
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/addresses/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to delete address" },
      { status: 500 }
    );
  }
}
