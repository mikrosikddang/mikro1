"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";

interface UserItem {
  id: string;
  email: string | null;
  phone: string | null;
  name: string | null;
  role: string;
  provider: string;
  createdAt: string;
  sellerProfile: {
    id: string;
    shopName: string;
    status: "PENDING" | "APPROVED" | "REJECTED";
    sellerKind: string;
    storeSlug: string | null;
  } | null;
  _count: {
    orders: number;
  };
}

type RoleFilter = "ALL" | "CUSTOMER" | "SELLER" | "ADMIN";

const roleLabels: Record<RoleFilter, string> = {
  ALL: "전체",
  CUSTOMER: "고객",
  SELLER: "셀러",
  ADMIN: "어드민",
};

const roleDisplayLabels: Record<string, string> = {
  CUSTOMER: "고객",
  SELLER_PENDING: "셀러(대기)",
  SELLER_ACTIVE: "셀러",
  ADMIN: "어드민",
};

const roleBadgeColors: Record<string, string> = {
  CUSTOMER: "bg-blue-100 text-blue-800",
  SELLER_PENDING: "bg-yellow-100 text-yellow-800",
  SELLER_ACTIVE: "bg-green-100 text-green-800",
  ADMIN: "bg-red-100 text-red-800",
};

const sellerStatusLabels: Record<string, string> = {
  PENDING: "심사중",
  APPROVED: "승인",
  REJECTED: "거부",
};

const sellerStatusColors: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  APPROVED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-800",
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("ALL");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [counts, setCounts] = useState({ all: 0, customer: 0, seller: 0, admin: 0 });

  const loadUsers = useCallback(
    async (cursor?: string) => {
      if (cursor) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      try {
        const params = new URLSearchParams();
        if (roleFilter !== "ALL") params.set("role", roleFilter);
        if (search) params.set("search", search);
        if (cursor) params.set("cursor", cursor);

        const url = `/api/admin/users${params.toString() ? `?${params.toString()}` : ""}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("사용자 목록을 불러오는데 실패했습니다");
        const data = await res.json();

        if (cursor) {
          setUsers((prev) => [...prev, ...data.users]);
        } else {
          setUsers(data.users || []);
        }
        setNextCursor(data.nextCursor);
        setCounts(data.counts);
      } catch (error) {
        console.error("사용자 로딩 오류:", error);
        alert("사용자 목록을 불러오는데 실패했습니다");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [roleFilter, search],
  );

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput.trim());
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">사용자 관리</h1>
        <p className="mt-1 text-sm text-gray-500">
          플랫폼에 가입한 모든 사용자를 조회합니다
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2">
          {(["ALL", "CUSTOMER", "SELLER", "ADMIN"] as const).map((role) => (
            <button
              key={role}
              onClick={() => setRoleFilter(role)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                roleFilter === role
                  ? "bg-red-900 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-100"
              }`}
            >
              {roleLabels[role]}
              <span className="ml-1 text-xs opacity-70">
                {role === "ALL"
                  ? counts.all
                  : role === "CUSTOMER"
                    ? counts.customer
                    : role === "SELLER"
                      ? counts.seller
                      : counts.admin}
              </span>
            </button>
          ))}
        </div>

        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="이름, 이메일, 전화번호 검색"
            className="h-10 w-64 rounded-lg border border-gray-200 px-3 text-sm focus:border-black focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            검색
          </button>
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearchInput("");
                setSearch("");
              }}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
            >
              초기화
            </button>
          )}
        </form>
      </div>

      {/* User list */}
      {loading ? (
        <div className="py-12 text-center text-gray-500">로딩 중...</div>
      ) : users.length === 0 ? (
        <div className="py-12 text-center text-gray-500">
          {search
            ? `"${search}" 검색 결과가 없습니다`
            : `${roleLabels[roleFilter]} 사용자가 없습니다`}
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    사용자
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    역할
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    가입 경로
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    주문 수
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    상점 정보
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    가입일
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-900">
                        {user.name || "-"}
                      </p>
                      <p className="text-xs text-gray-500">
                        {user.email || user.phone || "-"}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-bold ${
                          roleBadgeColors[user.role] || "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {roleDisplayLabels[user.role] || user.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {user.provider === "email"
                        ? "이메일"
                        : user.provider === "kakao"
                          ? "카카오"
                          : user.provider === "naver"
                            ? "네이버"
                            : user.provider}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {user._count.orders}건
                    </td>
                    <td className="px-4 py-3">
                      {user.sellerProfile ? (
                        <div>
                          <Link
                            href={`/admin/sellers?userId=${user.id}`}
                            className="text-sm font-medium text-blue-600 hover:underline"
                          >
                            {user.sellerProfile.shopName}
                          </Link>
                          <span
                            className={`ml-2 inline-block rounded-full px-2 py-0.5 text-xs font-bold ${
                              sellerStatusColors[user.sellerProfile.status] ||
                              "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {sellerStatusLabels[user.sellerProfile.status] ||
                              user.sellerProfile.status}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(user.createdAt).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Load more */}
          {nextCursor && (
            <div className="mt-4 text-center">
              <button
                onClick={() => loadUsers(nextCursor)}
                disabled={loadingMore}
                className="rounded-lg border border-gray-200 px-6 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                {loadingMore ? "로딩 중..." : "더 보기"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
