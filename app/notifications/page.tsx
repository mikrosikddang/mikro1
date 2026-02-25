"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Container from "@/components/Container";

interface Notification {
  id: string;
  title: string;
  body: string | null;
  link: string | null;
  isRead: boolean;
  createdAt: string;
}

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const diff = now - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "방금 전";
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}일 전`;
  return new Date(dateStr).toLocaleDateString("ko-KR");
}

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);

  const loadNotifications = useCallback(async (cursor?: string | null) => {
    try {
      const params = new URLSearchParams({ limit: "20" });
      if (cursor) params.set("cursor", cursor);
      const res = await fetch(`/api/notifications?${params}`);
      if (res.status === 401) {
        router.push("/login?next=/notifications");
        return;
      }
      if (!res.ok) return;
      const json = await res.json();
      if (!cursor) {
        setNotifications(json.notifications || []);
      } else {
        setNotifications((prev) => [...prev, ...(json.notifications || [])]);
      }
      setNextCursor(json.nextCursor ?? null);
      setTotalCount(json.totalCount ?? 0);
      setUnreadCount(json.unreadCount ?? 0);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const handleReadAll = async () => {
    try {
      const res = await fetch("/api/notifications/read-all", { method: "PATCH" });
      if (!res.ok) return;
      // Mark all as read locally
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {
      // silently fail
    }
  };

  const handleClick = async (notification: Notification) => {
    // Mark as read
    if (!notification.isRead) {
      try {
        await fetch(`/api/notifications/${notification.id}/read`, { method: "PATCH" });
        setNotifications((prev) =>
          prev.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch {
        // continue navigation even if read fails
      }
    }

    // Navigate
    if (notification.link) {
      router.push(notification.link);
    }
  };

  return (
    <Container>
      <div className="pt-4 pb-20">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-[22px] font-bold text-black">알림</h1>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleReadAll}
              className="text-[14px] text-blue-600 font-medium active:text-blue-800"
            >
              모두 읽음
            </button>
          )}
        </div>

        {/* List */}
        {loading ? (
          <div className="py-8 text-center text-gray-400 text-[14px]">
            불러오는 중...
          </div>
        ) : totalCount === 0 ? (
          <div className="py-20 text-center">
            <p className="text-[40px] mb-3">🔔</p>
            <p className="text-[15px] text-gray-500">
              알림이 없습니다
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {notifications.map((notification) => (
              <button
                key={notification.id}
                type="button"
                onClick={() => handleClick(notification)}
                className={`w-full text-left p-4 rounded-xl transition-colors ${
                  notification.isRead
                    ? "bg-white"
                    : "bg-gray-50"
                } active:bg-gray-100`}
              >
                <div className="flex items-start gap-3">
                  {/* Unread indicator dot */}
                  {!notification.isRead && (
                    <span className="w-2 h-2 rounded-full bg-red-500 mt-1.5 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                <p className={`text-[14px] ${
                  notification.isRead
                    ? "font-medium text-gray-700"
                    : "font-semibold text-black"
                }`}>
                  {notification.title}
                </p>
                {notification.body && (
                  <p className="text-[13px] text-gray-500 mt-0.5 line-clamp-2">
                    {notification.body}
                  </p>
                )}
                <p className="text-[12px] text-gray-400 mt-1">
                  {formatRelativeTime(notification.createdAt)}
                </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Load More */}
        {nextCursor && (
          <button
            type="button"
            onClick={() => loadNotifications(nextCursor)}
            className="w-full mt-4 py-3 text-[14px] font-medium text-gray-600 bg-gray-50 rounded-xl active:bg-gray-100 transition-colors"
          >
            더보기
          </button>
        )}
      </div>
    </Container>
  );
}
