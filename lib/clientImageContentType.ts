/**
 * 브라우저/리사이즈 후 Blob·File의 type이 비어 있거나 누락될 때
 * presign API에 넘길 image/* 를 안정적으로 맞춘다.
 */

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export function resolveClientImageContentType(file: File, resized: Blob): string {
  const fromBlob = resized.type?.trim();
  if (fromBlob && ALLOWED.has(fromBlob)) return fromBlob;

  const fromFile = file.type?.trim();
  if (fromFile && ALLOWED.has(fromFile)) return fromFile;

  const n = file.name.toLowerCase();
  if (n.endsWith(".png")) return "image/png";
  if (n.endsWith(".webp")) return "image/webp";
  if (n.endsWith(".gif")) return "image/gif";
  if (n.endsWith(".jpg") || n.endsWith(".jpeg")) return "image/jpeg";

  return "image/jpeg";
}
