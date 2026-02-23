"use client";

import Link from "next/link";
import { useSession } from "@/components/SessionProvider";
import { canAccessSellerFeatures, isAdmin } from "@/lib/roles";

export default function MenuProfileRow() {
  const session = useSession();

  if (!session) {
    // Not logged in - show login button
    return (
      <div className="px-4 py-4 border-b border-gray-100">
        <Link
          href="/login"
          className="flex items-center gap-3 py-2 px-3 hover:bg-gray-50 rounded-lg transition-colors"
        >
          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
            <svg
              className="w-4 h-4 text-gray-600"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          </div>
          <span className="text-[15px] font-medium text-gray-900">로그인</span>
        </Link>
      </div>
    );
  }

  // Logged in - show profile
  const isSeller = canAccessSellerFeatures(session.role);
  const isAdminUser = isAdmin(session.role);

  // Use userId for display name (first 8 characters)
  const displayName = session.userId.substring(0, 8);
  const roleLabel = isAdminUser ? "관리자" : isSeller ? "판매자" : "고객";
  const roleBadgeColor = isAdminUser
    ? "bg-purple-100 text-purple-700"
    : isSeller
    ? "bg-blue-100 text-blue-700"
    : "bg-gray-100 text-gray-600";

  // Avatar initial (use role initial)
  const initial = roleLabel.charAt(0);

  return (
    <div className="px-4 py-4 border-b border-gray-100">
      <Link
        href="/my"
        className="flex items-center gap-3 py-2 px-3 hover:bg-gray-50 rounded-lg transition-colors"
      >
        {/* Avatar */}
        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
          <span className="text-[14px] font-bold text-gray-700">{initial}</span>
        </div>

        {/* Name + Role */}
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-semibold text-gray-900 truncate">
            {displayName}
          </p>
          <span
            className={`inline-block mt-0.5 px-2 py-0.5 rounded-full text-[11px] font-medium ${roleBadgeColor}`}
          >
            {roleLabel}
          </span>
        </div>

        {/* Chevron */}
        <svg
          className="w-5 h-5 text-gray-400 flex-shrink-0"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 5l7 7-7 7"
          />
        </svg>
      </Link>
    </div>
  );
}
