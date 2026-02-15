import { NextRequest, NextResponse } from "next/server";
import { createPresignedPut, validateUpload, MAX_FILE_SIZE } from "@/lib/s3";
import { getSession } from "@/lib/auth";
import { requireSeller } from "@/lib/roleGuards";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    // Auth guard: SELLER only
    const _session = await getSession();
    const session = requireSeller(_session);

    const { fileName, contentType, fileSize } = await req.json();

    if (!fileName || !contentType) {
      return NextResponse.json(
        { error: "fileName and contentType are required" },
        { status: 400 },
      );
    }

    // ---- Validate file type ----
    const typeError = validateUpload(fileName, contentType);
    if (typeError) {
      return NextResponse.json({ error: typeError }, { status: 400 });
    }

    // ---- Validate file size (client-reported, defense in depth) ----
    if (typeof fileSize === "number" && fileSize > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `파일 크기는 ${MAX_FILE_SIZE / 1024 / 1024}MB 이하만 가능합니다` },
        { status: 400 },
      );
    }

    const sellerId = session.userId;

    // Key: products/{sellerId}/{uuid}.{ext} — path-locked to seller
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
