/**
 * Client-side image resize before upload.
 * Instagram-standard: max 1080×1350, JPEG 80% quality.
 * Skips GIF (animation) and images already within bounds.
 */
export async function resizeImage(
  file: File,
  maxWidth = 1080,
  maxHeight = 1350,
  quality = 0.8,
): Promise<Blob> {
  // Skip GIF to preserve animation
  if (file.type === "image/gif") return file;

  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let { width, height } = img;

      // No upscaling — return original if already within bounds
      if (width <= maxWidth && height <= maxHeight) {
        resolve(file);
        return;
      }

      // Scale down maintaining aspect ratio
      const ratio = Math.min(maxWidth / width, maxHeight / height);
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("리사이즈 실패"))),
        "image/jpeg",
        quality,
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("이미지 로드 실패"));
    };

    img.src = objectUrl;
  });
}
