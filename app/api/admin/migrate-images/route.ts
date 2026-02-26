import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const S3_BASE = "https://mikro-prod-assets-mikro-9012.s3.ap-northeast-2.amazonaws.com";
const PREFIX = "/api/images/";

/**
 * POST /api/admin/migrate-images
 * 기존 프록시 URL을 직접 S3 URL로 마이그레이션
 * 인증: X-ADMIN-PREFLIGHT-TOKEN 헤더 (환경변수 ADMIN_PREFLIGHT_TOKEN)
 *
 * Body: { dryRun?: boolean }
 * - dryRun=true: count만 반환 (기본값)
 * - dryRun=false: 실제 마이그레이션 실행
 */
export async function POST(request: Request) {
  try {
    const token = request.headers.get("X-ADMIN-PREFLIGHT-TOKEN");
    const expected = process.env.ADMIN_PREFLIGHT_TOKEN;
    if (!expected || !token || token !== expected) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const dryRun = body.dryRun !== false; // default true

    // 1. ProductImage URL
    const images = await prisma.productImage.findMany({
      where: { url: { startsWith: PREFIX } },
      select: { id: true, url: true },
    });

    // 2. SellerProfile avatarUrl
    const profiles = await prisma.sellerProfile.findMany({
      where: { avatarUrl: { startsWith: PREFIX } },
      select: { id: true, avatarUrl: true },
    });

    if (dryRun) {
      return NextResponse.json({
        dryRun: true,
        counts: {
          images: images.length,
          avatars: profiles.length,
        },
        sampleImages: images.slice(0, 3).map((img) => ({
          id: img.id,
          before: img.url,
          after: `${S3_BASE}/${img.url.slice(PREFIX.length)}`,
        })),
        sampleAvatars: profiles.slice(0, 3).map((p) => ({
          id: p.id,
          before: p.avatarUrl,
          after: `${S3_BASE}/${p.avatarUrl!.slice(PREFIX.length)}`,
        })),
      });
    }

    // 실제 마이그레이션
    let migratedImages = 0;
    let migratedAvatars = 0;

    for (const img of images) {
      const s3Url = `${S3_BASE}/${img.url.slice(PREFIX.length)}`;
      await prisma.productImage.update({
        where: { id: img.id },
        data: { url: s3Url },
      });
      migratedImages++;
    }

    for (const p of profiles) {
      const s3Url = `${S3_BASE}/${p.avatarUrl!.slice(PREFIX.length)}`;
      await prisma.sellerProfile.update({
        where: { id: p.id },
        data: { avatarUrl: s3Url },
      });
      migratedAvatars++;
    }

    return NextResponse.json({
      dryRun: false,
      migrated: {
        images: migratedImages,
        avatars: migratedAvatars,
      },
    });
  } catch (err) {
    console.error("POST /api/admin/migrate-images error:", err);
    return NextResponse.json(
      { error: "마이그레이션에 실패했습니다." },
      { status: 500 },
    );
  }
}
