"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "@/components/SessionProvider";

export default function NotificationBadge() {
  const session = useSession();
  const [count, setCount] = useState(0);

  const load = useCallback(async () => {
    if (!session) return;
    try {
      const res = await fetch("/api/notifications?limit=1");
      if (!res.ok) return;
      const data = await res.json();
      setCount(data.unreadCount ?? 0);
    } catch {
      // silently fail
    }
  }, [session]);

  useEffect(() => {
    if (!session) {
      setCount(0);
      return;
    }

    load();

    // Poll every 60 seconds
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, [session, load]);

  // Listen for notification-read events from other components
  useEffect(() => {
    const handleRefresh = () => load();
    window.addEventListener("notification-read", handleRefresh);
    return () => window.removeEventListener("notification-read", handleRefresh);
  }, [load]);

  if (count <= 0) return null;

  const display = count > 9 ? "9+" : String(count);

  return (
    <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold min-w-[16px] h-4 rounded-full flex items-center justify-center px-1">
      {display}
    </span>
  );
}
