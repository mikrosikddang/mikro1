import { NextRequest, NextResponse } from "next/server";
import {
  createPresignedPut,
  validateUpload,
  resolveUploadExtension,
  MAX_FILE_SIZE,
} from "@/lib/s3";
import { getSession } from "@/lib/auth";
import { requireBuyerFeatures } from "@/lib/roleGuards";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    // S3 설정 확인
    if (!process.env.S3_BUCKET) {
      return NextResponse.json(
        { error: "이미지 업로드 서비스가 설정되지 않았습니다. 관리자에게 문의하세요." },
        { status: 503 },
      );
    }

    // Auth guard: any logged-in member can upload to their own space/product draft
    const _session = await getSession();
    const session = requireBuyerFeatures(_session);

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

    const ownerId = session.userId;

    // Key: products/{ownerId}/{uuid}.{ext} — path-locked to the current member
    const ext = resolveUploadExtension(fileName, contentType);
    const key = `products/${ownerId}/${randomUUID()}.${ext}`;

    const { uploadUrl, publicUrl } = await createPresignedPut(key, contentType);

    return NextResponse.json({ uploadUrl, publicUrl });
  } catch (err) {
    if (err instanceof Response) {
      return err;
    }
    console.error("presign error:", err);
    return NextResponse.json(
      { error: "이미지 업로드 준비에 실패했습니다. 잠시 후 다시 시도해주세요." },
      { status: 500 },
    );
  }
}
