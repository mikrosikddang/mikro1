import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { uploadSellerDocument } from "@/lib/sellerDocumentUpload";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "파일을 선택해주세요" }, { status: 400 });
    }

    const url = await uploadSellerDocument(session.userId, file, "passbook");

    return NextResponse.json({ url });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "파일 업로드 중 오류가 발생했습니다";
    const status = message.includes("설정되지 않았습니다")
      ? 503
      : message.includes("업로드 가능합니다") || message.includes("5MB")
        ? 400
        : 500;

    console.error("Passbook upload error:", error);
    return NextResponse.json({ error: message }, { status });
  }
}
