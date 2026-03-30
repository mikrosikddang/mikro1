import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3 = new S3Client({
  region: process.env.AWS_REGION || "ap-northeast-2",
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
});
const BUCKET = process.env.S3_BUCKET ?? "";
const REGION = process.env.AWS_REGION || "ap-northeast-2";

/** Direct public S3 URL for a given key */
function s3PublicUrl(key: string): string {
  return `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`;
}

/* ---------- Upload safety limits ---------- */
const ALLOWED_CONTENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);
const ALLOWED_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "gif"]);
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

/**
 * S3 키용 확장자. 파일명에 확장자가 없거나(iOS 등) 알 수 없을 때는 MIME으로 결정한다.
 */
export function resolveUploadExtension(fileName: string, contentType: string): string {
  const fromName = fileName.split(".").pop()?.toLowerCase() || "";
  if (ALLOWED_EXTENSIONS.has(fromName)) {
    return fromName === "jpeg" ? "jpg" : fromName;
  }
  const fromMime: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
  };
  return fromMime[contentType] || "jpg";
}

/** fileName은 로깅·힌트용. 검증의 기준은 contentType이다. */
export function validateUpload(fileName: string, contentType: string) {
  void fileName;
  if (!ALLOWED_CONTENT_TYPES.has(contentType)) {
    return "허용되지 않는 파일 형식입니다 (jpg, png, webp, gif만 가능)";
  }
  return null;
}

export { MAX_FILE_SIZE };

export async function createPresignedPut(key: string, contentType: string) {
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 });
  // Direct public S3 URL (bucket is public)
  const publicUrl = s3PublicUrl(key);

  return { uploadUrl, publicUrl };
}

/**
 * Upload a buffer directly to S3 (server-side upload).
 * Returns the direct public S3 URL.
 */
export async function uploadToS3(key: string, body: Buffer, contentType: string) {
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: body,
    ContentType: contentType,
  });
  await s3.send(command);
  return s3PublicUrl(key);
}

export async function createPresignedGet(key: string) {
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: key,
  });
  return getSignedUrl(s3, command, { expiresIn: 3600 });
}
