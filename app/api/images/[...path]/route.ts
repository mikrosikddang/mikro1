import { NextRequest, NextResponse } from "next/server";
import { createPresignedGet } from "@/lib/s3";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const key = path.join("/");

  try {
    const signedUrl = await createPresignedGet(key);
    return NextResponse.redirect(signedUrl, 302);
  } catch (err) {
    console.error("image proxy error:", err);
    return new NextResponse("Not Found", { status: 404 });
  }
}
