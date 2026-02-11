import { NextRequest, NextResponse } from "next/server";
import { createPresignedPut } from "@/lib/s3";
import { requireRole } from "@/lib/auth";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    // Auth guard: SELLER only
    const session = await requireRole("SELLER");
    if (!session) {
      return NextResponse.json(
        { error: "로그인이 필요합니다 (판매자 전용)" },
        { status: 401 },
      );
    }

    const { fileName, contentType } = await req.json();

    if (!fileName || !contentType) {
      return NextResponse.json(
        { error: "fileName and contentType are required" },
        { status: 400 },
      );
    }

    const sellerId = session.userId;

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
