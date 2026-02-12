import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3 = new S3Client({
  region: process.env.AWS_REGION || "ap-northeast-2",
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
});
const BUCKET = process.env.S3_BUCKET!;

/* ---------- Upload safety limits ---------- */
const ALLOWED_CONTENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);
const ALLOWED_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "gif"]);
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export function validateUpload(fileName: string, contentType: string) {
  // Content type whitelist
  if (!ALLOWED_CONTENT_TYPES.has(contentType)) {
    return "허용되지 않는 파일 형식입니다 (jpg, png, webp, gif만 가능)";
  }
  // Extension whitelist
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return "허용되지 않는 파일 확장자입니다";
  }
  return null; // valid
}

export { MAX_FILE_SIZE };

export async function createPresignedPut(key: string, contentType: string) {
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 });
  // Store as proxy path – bucket is private, images served via /api/images/[...path]
  const publicUrl = `/api/images/${key}`;

  return { uploadUrl, publicUrl };
}

export async function createPresignedGet(key: string) {
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: key,
  });
  return getSignedUrl(s3, command, { expiresIn: 3600 });
}
