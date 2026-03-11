import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uploadToS3 } from "@/lib/s3";
import { hasSellerPortalAccess } from "@/lib/sellerPortal";

const MAX_FILE_SIZE = 3 * 1024 * 1024; // 3MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const EXT_MAP: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export const runtime = "nodejs";

/**
 * POST /api/uploads/avatar
 * 프로필 이미지 업로드 (판매자 전용, self만)
 * S3에 직접 업로드 후 이미지 프록시 URL 반환
 */
export async function POST(req: NextRequest) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  }

  if (!(await hasSellerPortalAccess(session))) {
    return NextResponse.json(
      { error: "판매자 권한이 필요합니다" },
      { status: 403 },
    );
  }

  try {
    const sellerProfile = await prisma.sellerProfile.findUnique({
      where: { userId: session.userId },
    });

    if (!sellerProfile) {
      return NextResponse.json(
        { error: "판매자 프로필을 찾을 수 없습니다" },
        { status: 404 },
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "파일을 선택해주세요" },
        { status: 400 },
      );
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "JPG, PNG, WEBP 이미지만 업로드 가능합니다" },
        { status: 400 },
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "파일 크기는 3MB 이하여야 합니다" },
        { status: 400 },
      );
    }

    // S3 key: avatars/{userId}/{timestamp}.{ext}
    const timestamp = Date.now();
    const ext = EXT_MAP[file.type] || "jpg";
    const key = `avatars/${session.userId}/${timestamp}.${ext}`;

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const url = await uploadToS3(key, buffer, file.type);

    return NextResponse.json({ url });
  } catch (error) {
    console.error("Avatar upload error:", error);
    return NextResponse.json(
      { error: "파일 업로드 중 오류가 발생했습니다" },
      { status: 500 },
    );
  }
}
