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
    return NextResponse.redirect(signedUrl, {
      status: 302,
      headers: {
        "Cache-Control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400",
      },
    });
  } catch (err) {
    console.error("image proxy error:", err);
    return new NextResponse("Not Found", { status: 404 });
  }
}
