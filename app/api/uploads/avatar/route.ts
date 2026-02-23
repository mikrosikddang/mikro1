import { NextRequest, NextResponse } from "next/server";
import { writeFile, unlink, readdir } from "fs/promises";
import { join } from "path";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canAccessSellerFeatures } from "@/lib/roles";

const MAX_FILE_SIZE = 3 * 1024 * 1024; // 3MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

/**
 * POST /api/uploads/avatar
 * 프로필 이미지 업로드 (판매자 전용, self만)
 */
export async function POST(req: NextRequest) {
  const session = await getSession();

  // 로그인 필수
  if (!session) {
    return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  }

  // 판매자 권한 확인
  if (!canAccessSellerFeatures(session.role)) {
    return NextResponse.json(
      { error: "판매자 권한이 필요합니다" },
      { status: 403 }
    );
  }

  try {
    // SellerProfile 조회 (소유권 확인)
    const sellerProfile = await prisma.sellerProfile.findUnique({
      where: { userId: session.userId },
    });

    if (!sellerProfile) {
      return NextResponse.json(
        { error: "판매자 프로필을 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    // FormData 파싱
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "파일을 선택해주세요" },
        { status: 400 }
      );
    }

    // 파일 타입 검증
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "JPG, PNG, WEBP 이미지만 업로드 가능합니다" },
        { status: 400 }
      );
    }

    // 파일 크기 검증
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "파일 크기는 3MB 이하여야 합니다" },
        { status: 400 }
      );
    }

    // 파일명 생성: avatar_<userId>_<timestamp>.webp
    const timestamp = Date.now();
    const extension = file.type.split("/")[1];
    const filename = `avatar_${session.userId}_${timestamp}.${extension}`;
    const filepath = join(process.cwd(), "public", "uploads", "avatars", filename);

    // 파일 저장
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filepath, buffer);

    // 공개 URL 생성
    const publicUrl = `/uploads/avatars/${filename}`;

    // 기존 아바타 파일 정리 (최신 5개만 유지)
    try {
      const avatarsDir = join(process.cwd(), "public", "uploads", "avatars");
      const files = await readdir(avatarsDir);
      const userFiles = files
        .filter((f) => f.startsWith(`avatar_${session.userId}_`))
        .sort()
        .reverse();

      // 최신 5개를 제외한 나머지 삭제
      for (const oldFile of userFiles.slice(5)) {
        const oldFilepath = join(avatarsDir, oldFile);
        await unlink(oldFilepath).catch(() => {
          // 삭제 실패 시 무시
        });
      }
    } catch (error) {
      // 정리 실패해도 업로드는 성공으로 처리
      console.error("Failed to cleanup old avatars:", error);
    }

    return NextResponse.json({
      url: publicUrl,
      width: 256,
      height: 256,
    });
  } catch (error) {
    console.error("Avatar upload error:", error);
    return NextResponse.json(
      { error: "파일 업로드 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
