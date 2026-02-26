"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Container from "@/components/Container";

type ChatRoom = {
  id: string;
  otherUserId: string;
  otherName: string;
  otherAvatarUrl: string | null;
  lastMessage: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
};

function formatRelativeTime(dateStr: string): string {
  const now = new Date();
  const d = new Date(dateStr);
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "방금";
  if (diffMin < 60) return `${diffMin}분 전`;

  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}시간 전`;

  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay}일 전`;

  return d.toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
}

export default function ChatListPage() {
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const loadRooms = async () => {
      try {
        const res = await fetch("/api/chat/rooms");
        if (!res.ok) return;
        const data = await res.json();
        if (active) setRooms(data.rooms ?? []);
      } catch {
        // silently fail
      } finally {
        if (active) setLoading(false);
      }
    };

    loadRooms();
    const interval = setInterval(loadRooms, 2000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <Container>
      <div className="pt-4 pb-20">
        <h1 className="text-[22px] font-bold text-black mb-6">채팅</h1>

        {loading ? (
          <div className="py-20 text-center text-gray-400 text-sm">
            로딩 중...
          </div>
        ) : rooms.length === 0 ? (
          <div className="py-20 text-center">
            <svg
              className="w-12 h-12 mx-auto text-gray-300 mb-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            <p className="text-[15px] text-gray-500">채팅 내역이 없습니다</p>
            <p className="text-[13px] text-gray-400 mt-1">
              상품 문의를 시작해보세요
            </p>
          </div>
        ) : (
          <div>
            {rooms.map((room) => (
              <Link
                key={room.id}
                href={`/chat/${room.id}`}
                className="flex items-center gap-3 px-1 py-3 hover:bg-gray-50 transition-colors rounded-lg"
              >
                {/* Avatar */}
                {room.otherAvatarUrl ? (
                  <img
                    src={room.otherAvatarUrl}
                    alt={room.otherName}
                    className="w-14 h-14 rounded-full object-cover shrink-0"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-gray-200 flex items-center justify-center text-[18px] font-bold text-gray-500 shrink-0">
                    {room.otherName.charAt(0)}
                  </div>
                )}

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[15px] font-bold text-black">
                      {room.otherName}
                    </span>
                    {room.lastMessageAt && (
                      <span className="text-[12px] text-gray-400">
                        {formatRelativeTime(room.lastMessageAt)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-[14px] text-gray-500 truncate pr-2">
                      {room.lastMessage || "새로운 채팅"}
                    </p>
                    {room.unreadCount > 0 && (
                      <span className="shrink-0 min-w-[20px] h-5 px-1.5 bg-red-500 text-white text-[11px] font-bold rounded-full flex items-center justify-center">
                        {room.unreadCount > 99 ? "99+" : room.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Container>
  );
}
