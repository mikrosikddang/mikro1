"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/components/SessionProvider";

type FollowButtonProps = {
  sellerId: string;
  size?: "sm" | "md";
  className?: string;
};

export default function FollowButton({
  sellerId,
  size = "md",
  className = "",
}: FollowButtonProps) {
  const router = useRouter();
  const session = useSession();
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  const isSelf = session ? session.userId === sellerId : false;

  // 팔로우 상태 조회
  const checkFollowStatus = useCallback(async () => {
    if (!session || isSelf) {
      setChecking(false);
      return;
    }

    try {
      const res = await fetch(`/api/sellers/${sellerId}/follow`);
      if (res.ok) {
        const data = await res.json();
        setFollowing(data.followed);
      }
    } catch (error) {
      console.error("Failed to check follow status:", error);
    } finally {
      setChecking(false);
    }
  }, [session, sellerId, isSelf]);

  useEffect(() => {
    checkFollowStatus();
  }, [checkFollowStatus]);

  // 팔로우/언팔로우 토글
  const handleClick = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // 로그인 필요
      if (!session) {
        alert("로그인이 필요합니다");
        router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`);
        return;
      }

      // 이미 로딩 중이면 무시
      if (loading) return;

      setLoading(true);
      try {
        const method = following ? "DELETE" : "POST";
        const res = await fetch(`/api/sellers/${sellerId}/follow`, { method });

        if (!res.ok) {
          const data = await res.json();
          if (res.status === 409) {
            alert("자신을 팔로우할 수 없습니다");
          } else {
            alert(data.error || "오류가 발생했습니다");
          }
          return;
        }

        const data = await res.json();
        setFollowing(data.followed);
      } catch (error) {
        console.error("Failed to toggle follow:", error);
        alert("오류가 발생했습니다");
      } finally {
        setLoading(false);
      }
    },
    [session, sellerId, following, loading, router]
  );

  // self인 경우 렌더링 안 함
  if (isSelf) return null;

  // 체킹 중일 때 placeholder
  if (checking) {
    const sizeClasses =
      size === "sm"
        ? "h-8 px-3 text-[12px]"
        : "h-10 px-4 text-[14px]";

    return (
      <div
        className={`${sizeClasses} rounded-full border border-gray-300 bg-gray-50 opacity-50 ${className}`}
      />
    );
  }

  const sizeClasses =
    size === "sm"
      ? "h-8 px-3 text-[12px]"
      : "h-10 px-4 text-[14px]";

  const styleClasses = following
    ? "bg-gray-100 border-gray-200 text-gray-700"
    : "border-gray-300 text-gray-900 hover:bg-gray-50";

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className={`${sizeClasses} rounded-full border font-semibold transition-all active:scale-95 ${styleClasses} ${loading ? "opacity-60 cursor-wait" : ""} ${className}`}
    >
      {following ? "팔로잉" : "팔로우"}
    </button>
  );
}
