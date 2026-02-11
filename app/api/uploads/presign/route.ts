import { NextRequest, NextResponse } from "next/server";
import { createPresignedPut } from "@/lib/s3";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { fileName, contentType } = await req.json();

    if (!fileName || !contentType) {
      return NextResponse.json(
        { error: "fileName and contentType are required" },
        { status: 400 },
      );
    }

    const sellerId = process.env.MVP_SELLER_ID;
    if (!sellerId) {
      return NextResponse.json(
        { error: "MVP_SELLER_ID not configured" },
        { status: 500 },
      );
    }

    // Extract extension from fileName
    const ext = fileName.split(".").pop()?.toLowerCase() || "jpg";
    const key = `products/${sellerId}/${randomUUID()}.${ext}`;

    const { uploadUrl, publicUrl } = await createPresignedPut(key, contentType);

    return NextResponse.json({ uploadUrl, publicUrl });
  } catch (err) {
    console.error("presign error:", err);
    return NextResponse.json(
      { error: "Failed to create presigned URL" },
      { status: 500 },
    );
  }
}
