"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ChatButton({
  sellerId,
  orderId,
}: {
  sellerId: string;
  orderId: string;
}) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleClick = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/chat/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sellerId, orderId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "채팅방을 열 수 없습니다");
      }
      const data = await res.json();
      router.push(`/chat/${data.roomId}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : "채팅방을 열 수 없습니다");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="h-11 px-4 bg-black text-white rounded-xl text-[14px] font-medium active:bg-gray-800 transition-colors disabled:opacity-50"
    >
      {loading ? "연결 중..." : "채팅하기"}
    </button>
  );
}
