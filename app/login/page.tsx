"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/";

  const [id, setId] = useState("");
  const [pw, setPw] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!id.trim() || !pw.trim()) {
      setError("아이디와 비밀번호를 입력해주세요");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: id.trim(), pw: pw.trim() }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        setError(data.message || "로그인에 실패했습니다");
        setLoading(false);
        return;
      }

      // Redirect to `next` or home
      router.push(next);
      router.refresh(); // reload server components to pick up new cookie
    } catch {
      setError("네트워크 오류가 발생했습니다");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-104px)] flex items-center justify-center px-5">
      <div className="w-full max-w-[340px]">
        {/* Logo */}
        <h1 className="text-center text-[28px] font-extrabold tracking-tight mb-8">
          mikro
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="text"
              value={id}
              onChange={(e) => setId(e.target.value)}
              placeholder="아이디"
              autoComplete="username"
              className="w-full h-12 px-4 rounded-xl border border-gray-200 text-[15px] placeholder:text-gray-400 focus:outline-none focus:border-black transition-colors"
              disabled={loading}
            />
          </div>

          <div>
            <input
              type="password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              placeholder="비밀번호"
              autoComplete="current-password"
              className="w-full h-12 px-4 rounded-xl border border-gray-200 text-[15px] placeholder:text-gray-400 focus:outline-none focus:border-black transition-colors"
              disabled={loading}
            />
          </div>

          {error && (
            <p className="text-[13px] text-red-500 text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 bg-black text-white rounded-xl text-[16px] font-bold active:bg-gray-800 transition-colors disabled:opacity-50"
          >
            {loading ? "로그인 중..." : "로그인"}
          </button>
        </form>

        {/* Signup link */}
        <div className="mt-4 text-center">
          <p className="text-[14px] text-gray-600">
            계정이 없으신가요?{" "}
            <a
              href="/signup"
              className="text-black font-medium underline"
            >
              회원가입
            </a>
          </p>
        </div>

      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[calc(100vh-104px)] flex items-center justify-center">
          <span className="text-gray-400">로딩 중...</span>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
