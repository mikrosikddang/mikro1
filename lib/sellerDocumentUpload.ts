import { uploadToS3 } from "@/lib/s3";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const EXT_MAP: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export type SellerDocumentKind =
  | "biz-license"
  | "mail-order-report"
  | "passbook";

export function validateSellerDocument(file: File) {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return "JPG, PNG, WEBP 이미지만 업로드 가능합니다";
  }

  if (file.size > MAX_FILE_SIZE) {
    return "파일 크기는 5MB 이하여야 합니다";
  }

  return null;
}

export async function uploadSellerDocument(
  userId: string,
  file: File,
  kind: SellerDocumentKind,
) {
  if (!process.env.S3_BUCKET) {
    throw new Error("이미지 업로드 서비스가 설정되지 않았습니다. 관리자에게 문의하세요.");
  }

  const validationError = validateSellerDocument(file);
  if (validationError) {
    throw new Error(validationError);
  }

  const timestamp = Date.now();
  const ext = EXT_MAP[file.type] || "jpg";
  const key = `seller-docs/${userId}/${kind}-${timestamp}.${ext}`;
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  return uploadToS3(key, buffer, file.type);
}
