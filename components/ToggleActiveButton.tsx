"use client";

export default function ToggleActiveButton({
  productId,
  isActive,
}: {
  productId: string;
  isActive: boolean;
}) {
  async function handleToggle() {
    try {
      const res = await fetch(`/api/seller/products/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive }),
      });
      if (res.ok) {
        window.location.reload();
      }
    } catch {
      alert("상태 변경에 실패했습니다");
    }
  }

  return (
    <button
      onClick={handleToggle}
      className={`flex-1 h-9 flex items-center justify-center rounded-lg text-[13px] font-medium transition-colors ${
        isActive
          ? "border border-gray-200 text-gray-700 active:bg-gray-50"
          : "bg-black text-white active:bg-gray-800"
      }`}
    >
      {isActive ? "숨기기" : "다시 판매"}
    </button>
  );
}
