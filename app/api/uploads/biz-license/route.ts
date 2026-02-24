import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { getSession } from "@/lib/auth";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

/**
 * POST /api/uploads/biz-license
 * 사업자등록증 이미지 업로드 (로그인 사용자 전용)
 */
export async function POST(req: NextRequest) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "파일을 선택해주세요" },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "JPG, PNG, WEBP 이미지만 업로드 가능합니다" },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "파일 크기는 5MB 이하여야 합니다" },
        { status: 400 }
      );
    }

    const timestamp = Date.now();
    const extension = file.type.split("/")[1];
    const filename = `biz_${session.userId}_${timestamp}.${extension}`;
    const dir = join(process.cwd(), "public", "uploads", "biz-license");
    await mkdir(dir, { recursive: true });
    const filepath = join(dir, filename);

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filepath, buffer);

    const publicUrl = `/uploads/biz-license/${filename}`;

    return NextResponse.json({ url: publicUrl });
  } catch (error) {
    console.error("Biz license upload error:", error);
    return NextResponse.json(
      { error: "파일 업로드 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
