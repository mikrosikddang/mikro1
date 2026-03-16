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
  const [error, setError] = useState(searchParams.get("error") ? "소셜 로그인에 실패했습니다. 다시 시도해주세요." : "");
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
          미크로
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

        {/* Divider */}
        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-[13px] text-gray-400">또는</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        {/* Social login */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => { window.location.href = "/api/auth/kakao"; }}
            className="w-full h-12 rounded-xl font-medium text-[15px] bg-[#FEE500] text-[#191919] flex items-center justify-center gap-2 active:brightness-95 transition-all"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#191919">
              <path d="M12 3C6.48 3 2 6.36 2 10.44c0 2.62 1.75 4.93 4.38 6.24l-1.12 4.16c-.1.36.3.65.6.44l4.96-3.27c.38.04.77.07 1.18.07 5.52 0 10-3.36 10-7.64C22 6.36 17.52 3 12 3z" />
            </svg>
            카카오로 로그인
          </button>

          <button
            type="button"
            onClick={() => { window.location.href = "/api/auth/naver"; }}
            className="w-full h-12 rounded-xl font-medium text-[15px] bg-[#03C75A] text-white flex items-center justify-center gap-2 active:brightness-95 transition-all"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="white">
              <path d="M16.27 3H7.73L7 3.73V12l5.27 8.27h1.46L14 20.27V12l3-4.27V3.73L16.27 3zM13 11h-2V5h2v6z" />
            </svg>
            네이버로 로그인
          </button>
        </div>

        {/* Signup link */}
        <div className="mt-6 text-center">
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
