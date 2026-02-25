"use client";

import { useState, useEffect } from "react";
import { useSession } from "@/components/SessionProvider";

export default function NotificationBadge() {
  const session = useSession();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!session) {
      setCount(0);
      return;
    }

    const load = async () => {
      try {
        const res = await fetch("/api/notifications?limit=1");
        if (!res.ok) return;
        const data = await res.json();
        setCount(data.unreadCount ?? 0);
      } catch {
        // silently fail
      }
    };

    load();

    // Poll every 60 seconds
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, [session]);

  if (count <= 0) return null;

  const display = count > 9 ? "9+" : String(count);

  return (
    <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold min-w-[16px] h-4 rounded-full flex items-center justify-center px-1">
      {display}
    </span>
  );
}
