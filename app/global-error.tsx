"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ko">
      <body className="bg-white text-gray-900 font-sans antialiased">
        <div className="flex flex-col items-center justify-center min-h-screen px-4">
          <h2 className="text-[18px] font-semibold mb-4">오류가 발생했습니다</h2>
          <button
            onClick={() => reset()}
            className="px-4 py-2 bg-black text-white rounded-lg text-sm"
          >
            다시 시도
          </button>
        </div>
      </body>
    </html>
  );
}
