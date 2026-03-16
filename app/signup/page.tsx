"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [error, setError] = useState(searchParams.get("error") ? "소셜 로그인에 실패했습니다. 다시 시도해주세요." : "");
  const [loading, setLoading] = useState(false);

  function formatPhone(value: string) {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 3) return digits;
    if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!email.trim() || !phone.trim() || !password.trim() || !passwordConfirm.trim()) {
      setError("모든 필드를 입력해주세요");
      return;
    }

    const normalizedPhone = formatPhone(phone.trim());
    setPhone(normalizedPhone);

    const phoneRegex = /^010-\d{4}-\d{4}$/;
    if (!phoneRegex.test(normalizedPhone)) {
      setError("전화번호는 010-0000-0000 형식으로 입력해주세요");
      return;
    }

    if (password !== passwordConfirm) {
      setError("비밀번호가 일치하지 않습니다");
      return;
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
    if (!passwordRegex.test(password)) {
      setError("비밀번호는 최소 8자, 대문자, 소문자, 숫자, 특수문자 혼용이어야 합니다");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || undefined,
          email: email.trim(),
          phone: normalizedPhone,
          password: password.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        setError(data.error || "회원가입에 실패했습니다");
        setLoading(false);
        return;
      }

      // 자동 로그인 완료, 리다이렉트
      router.push(next);
      router.refresh();
    } catch {
      setError("네트워크 오류가 발생했습니다");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-104px)] flex items-center justify-center px-5">
      <div className="w-full max-w-[340px]">
        {/* Logo */}
        <h1 className="text-center text-[28px] font-extrabold tracking-tight mb-2">
          미크로
        </h1>
        <p className="text-center text-[14px] text-gray-500 mb-8">
          회원가입
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="이름"
              autoComplete="name"
              className="w-full h-12 px-4 rounded-xl border border-gray-200 text-[15px] placeholder:text-gray-400 focus:outline-none focus:border-black transition-colors"
              disabled={loading}
            />
          </div>

          <div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="이메일"
              autoComplete="email"
              className="w-full h-12 px-4 rounded-xl border border-gray-200 text-[15px] placeholder:text-gray-400 focus:outline-none focus:border-black transition-colors"
              disabled={loading}
            />
          </div>

          <div>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(formatPhone(e.target.value))}
              onBlur={() => setPhone((prev) => formatPhone(prev))}
              placeholder="전화번호 (010-0000-0000)"
              autoComplete="tel"
              inputMode="numeric"
              maxLength={13}
              className="w-full h-12 px-4 rounded-xl border border-gray-200 text-[15px] placeholder:text-gray-400 focus:outline-none focus:border-black transition-colors"
              disabled={loading}
            />
          </div>

          <div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호는 최소 8자, 대문자, 소문자, 숫자, 특수문자 혼용"
              autoComplete="new-password"
              className="w-full h-12 px-4 rounded-xl border border-gray-200 text-[15px] placeholder:text-gray-400 focus:outline-none focus:border-black transition-colors"
              disabled={loading}
            />
          </div>

          <div>
            <input
              type="password"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              placeholder="비밀번호 확인"
              autoComplete="new-password"
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
            {loading ? "가입 중..." : "회원가입"}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-[13px] text-gray-400">또는</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        {/* Social signup */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => { window.location.href = "/api/auth/kakao"; }}
            className="w-full h-12 rounded-xl font-medium text-[15px] bg-[#FEE500] text-[#191919] flex items-center justify-center gap-2 active:brightness-95 transition-all"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#191919">
              <path d="M12 3C6.48 3 2 6.36 2 10.44c0 2.62 1.75 4.93 4.38 6.24l-1.12 4.16c-.1.36.3.65.6.44l4.96-3.27c.38.04.77.07 1.18.07 5.52 0 10-3.36 10-7.64C22 6.36 17.52 3 12 3z" />
            </svg>
            카카오로 시작하기
          </button>

          <button
            type="button"
            onClick={() => { window.location.href = "/api/auth/naver"; }}
            className="w-full h-12 rounded-xl font-medium text-[15px] bg-[#03C75A] text-white flex items-center justify-center gap-2 active:brightness-95 transition-all"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="white">
              <path d="M16.27 3H7.73L7 3.73V12l5.27 8.27h1.46L14 20.27V12l3-4.27V3.73L16.27 3zM13 11h-2V5h2v6z" />
            </svg>
            네이버로 시작하기
          </button>
        </div>

        {/* Login link */}
        <div className="mt-6 text-center">
          <p className="text-[14px] text-gray-600">
            이미 계정이 있으신가요?{" "}
            <Link
              href="/login"
              className="text-black font-medium underline"
            >
              로그인
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[calc(100vh-104px)] flex items-center justify-center">
          <span className="text-gray-400">로딩 중...</span>
        </div>
      }
    >
      <SignupForm />
    </Suspense>
  );
}
