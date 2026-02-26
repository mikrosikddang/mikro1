"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import ChatBubbleList from "@/components/ChatBubble";
import ChatInput from "@/components/ChatInput";
import OrderAccordion from "@/components/OrderAccordion";

type Message = {
  id: string;
  senderId: string;
  content: string | null;
  imageUrl: string | null;
  type: "TEXT" | "IMAGE" | "SYSTEM";
  createdAt: string;
  readAt: string | null;
};

type RoomInfo = {
  otherUserId: string;
  otherName: string;
  otherAvatarUrl: string | null;
};

export default function ChatRoomPage({ params }: { params: { roomId: string } }) {
  const [roomId, setRoomId] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [roomInfo, setRoomInfo] = useState<RoomInfo | null>(null);
  const [currentUserId, setCurrentUserId] = useState("");
  const [lastReadMessageId, setLastReadMessageId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Unwrap params (Next.js 15 async params)
  useEffect(() => {
    Promise.resolve(params).then((p: any) => setRoomId(p.roomId));
  }, [params]);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const loadMessages = useCallback(async () => {
    if (!roomId) return;
    try {
      const res = await fetch(`/api/chat/rooms/${roomId}/messages`);
      if (!res.ok) return;
      const data = await res.json();
      setMessages(data.messages ?? []);
      setRoomInfo(data.roomInfo ?? null);
      setCurrentUserId(data.currentUserId ?? "");
      setLastReadMessageId(data.lastReadMessageId ?? null);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  // Initial load + mark as read
  useEffect(() => {
    if (!roomId) return;
    loadMessages();
    fetch(`/api/chat/rooms/${roomId}/read`, { method: "PATCH" }).catch(() => {});
  }, [roomId, loadMessages]);

  // 2-second polling
  useEffect(() => {
    if (!roomId) return;
    const interval = setInterval(() => {
      loadMessages();
      // Re-mark as read on each poll
      fetch(`/api/chat/rooms/${roomId}/read`, { method: "PATCH" }).catch(() => {});
    }, 2000);
    return () => clearInterval(interval);
  }, [roomId, loadMessages]);

  // Auto-scroll on new messages
  useEffect(() => {
    scrollToBottom();
  }, [messages.length, scrollToBottom]);

  const handleSent = () => {
    loadMessages();
    scrollToBottom();
  };

  return (
    <div className="fixed inset-0 z-40 bg-white flex flex-col">
      {/* Header */}
      <div className="shrink-0 flex items-center gap-3 px-4 h-[52px] border-b border-gray-100">
        <button
          type="button"
          onClick={() => router.back()}
          className="p-1 -ml-1"
        >
          <svg
            className="w-6 h-6 text-gray-700"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-[16px] font-bold text-black truncate">
            {roomInfo?.otherName ?? "채팅"}
          </h1>
        </div>
      </div>

      {/* Order accordion */}
      {roomId && <OrderAccordion roomId={roomId} />}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="py-20 text-center text-gray-400 text-sm">
            로딩 중...
          </div>
        ) : messages.length === 0 ? (
          <div className="py-20 text-center text-gray-400 text-sm">
            메시지가 없습니다
          </div>
        ) : (
          <ChatBubbleList
            messages={messages}
            currentUserId={currentUserId}
            otherAvatarUrl={roomInfo?.otherAvatarUrl}
            otherName={roomInfo?.otherName ?? ""}
            lastReadMessageId={lastReadMessageId}
          />
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <ChatInput roomId={roomId} onSent={handleSent} disabled={!roomId} />
    </div>
  );
}
