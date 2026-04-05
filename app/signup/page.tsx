"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";

const POLICY_VIEWED_KEYS = {
  terms: "signup-policy-viewed-terms",
  privacy: "signup-policy-viewed-privacy",
} as const;

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/";
  const signupError = searchParams.get("error");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [agreements, setAgreements] = useState({
    terms: false,
    privacy: false,
    age: false,
  });
  const [viewedPolicies, setViewedPolicies] = useState({
    terms: false,
    privacy: false,
  });
  const [error, setError] = useState(
    signupError === "consent_required"
      ? "간편가입 전에 필수 약관에 동의해주세요."
      : signupError
        ? "소셜 로그인에 실패했습니다. 다시 시도해주세요."
        : "",
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setViewedPolicies({
      terms: window.sessionStorage.getItem(POLICY_VIEWED_KEYS.terms) === "1",
      privacy: window.sessionStorage.getItem(POLICY_VIEWED_KEYS.privacy) === "1",
    });
  }, []);

  function hasRequiredAgreements() {
    return agreements.terms && agreements.privacy && agreements.age;
  }

  function toggleAgreement(key: keyof typeof agreements) {
    if ((key === "terms" || key === "privacy") && !viewedPolicies[key]) {
      setError("전문보기를 한 번 확인한 뒤 동의 체크를 할 수 있습니다");
      return;
    }
    setAgreements((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function markPolicyViewed(key: keyof typeof viewedPolicies) {
    setViewedPolicies((prev) => ({ ...prev, [key]: true }));
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(POLICY_VIEWED_KEYS[key], "1");
    }
    setError("");
  }

  function validateRequiredAgreements() {
    if (!viewedPolicies.terms || !viewedPolicies.privacy) {
      setError("이용약관과 개인정보 수집·이용 전문보기를 먼저 확인해주세요");
      return false;
    }
    if (hasRequiredAgreements()) return true;
    setError("이용약관, 개인정보 수집·이용, 만 14세 이상 항목에 모두 동의해주세요");
    return false;
  }

  function handleSocialSignup(provider: "kakao" | "naver") {
    setError("");
    if (!validateRequiredAgreements()) return;
    window.location.href = `/api/auth/${provider}?intent=signup`;
  }

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

    if (!validateRequiredAgreements()) {
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
          agreements,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        setError(
          data?.error ||
            (res.status === 429
              ? "요청이 많아 잠시 후 다시 시도해주세요"
              : "회원가입에 실패했습니다"),
        );
        return;
      }

      const nextPath =
        next !== "/"
          ? next
          : typeof data.nextPath === "string" && data.nextPath
            ? data.nextPath
            : "/";

      // 자동 로그인 완료, 리다이렉트
      router.push(nextPath);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "네트워크 오류가 발생했습니다");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-104px)] flex items-center justify-center px-5">
      <div className="w-full max-w-[340px]">
        {/* Logo */}
        <h1 className="text-center text-[28px] font-extrabold tracking-tight mb-2">
          mikro
        </h1>
        <p className="text-center text-[14px] text-gray-500 mb-8">
          회원가입
        </p>
        <p className="text-center text-[13px] text-gray-500 mb-6 leading-relaxed">
          최초 가입 시 아카이빙회원(일반회원)으로 등록되며 개인 공간이 개설됩니다.
          판매 운영은 별도 판매자 승인 절차 완료 후 가능합니다.
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

          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <p className="text-[13px] font-semibold text-gray-900 mb-3">필수 약관 동의</p>
            <div className="space-y-2 text-[13px] text-gray-700">
              <div className="rounded-xl border border-gray-200 bg-white p-3">
                <div className="flex items-start justify-between gap-3">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={agreements.terms}
                      onChange={() => toggleAgreement("terms")}
                      className="mt-0.5 h-4 w-4 rounded border-gray-300 text-black focus:ring-black"
                      disabled={loading || !viewedPolicies.terms}
                    />
                    <span className={!viewedPolicies.terms ? "text-gray-400" : ""}>
                      [필수] 서비스 이용약관에 동의합니다.
                    </span>
                  </label>
                  <Link
                    href="/policy/terms"
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => markPolicyViewed("terms")}
                    className="shrink-0 rounded-full border border-gray-300 px-3 py-1 text-[12px] font-medium text-gray-700 hover:bg-gray-50"
                  >
                    전문보기
                  </Link>
                </div>
                {!viewedPolicies.terms && (
                  <p className="mt-2 text-[12px] text-amber-700">전문보기를 한 번 확인해야 체크할 수 있습니다.</p>
                )}
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-3">
                <div className="flex items-start justify-between gap-3">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={agreements.privacy}
                      onChange={() => toggleAgreement("privacy")}
                      className="mt-0.5 h-4 w-4 rounded border-gray-300 text-black focus:ring-black"
                      disabled={loading || !viewedPolicies.privacy}
                    />
                    <span className={!viewedPolicies.privacy ? "text-gray-400" : ""}>
                      [필수] 개인정보 수집·이용에 동의합니다.
                    </span>
                  </label>
                  <Link
                    href="/policy/privacy"
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => markPolicyViewed("privacy")}
                    className="shrink-0 rounded-full border border-gray-300 px-3 py-1 text-[12px] font-medium text-gray-700 hover:bg-gray-50"
                  >
                    전문보기
                  </Link>
                </div>
                {!viewedPolicies.privacy && (
                  <p className="mt-2 text-[12px] text-amber-700">전문보기를 한 번 확인해야 체크할 수 있습니다.</p>
                )}
              </div>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreements.age}
                  onChange={() => toggleAgreement("age")}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-black focus:ring-black"
                  disabled={loading}
                />
                <span>[필수] 만 14세 이상입니다.</span>
              </label>
            </div>
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
            onClick={() => handleSocialSignup("kakao")}
            className="w-full h-12 rounded-xl font-medium text-[15px] bg-[#FEE500] text-[#191919] flex items-center justify-center gap-2 active:brightness-95 transition-all"
            disabled={loading}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#191919">
              <path d="M12 3C6.48 3 2 6.36 2 10.44c0 2.62 1.75 4.93 4.38 6.24l-1.12 4.16c-.1.36.3.65.6.44l4.96-3.27c.38.04.77.07 1.18.07 5.52 0 10-3.36 10-7.64C22 6.36 17.52 3 12 3z" />
            </svg>
            카카오로 시작하기
          </button>

          <button
            type="button"
            onClick={() => handleSocialSignup("naver")}
            className="w-full h-12 rounded-xl font-medium text-[15px] bg-[#03C75A] text-white flex items-center justify-center gap-2 active:brightness-95 transition-all"
            disabled={loading}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="white">
              <path d="M16.27 3H7.73L7 3.73V12l5.27 8.27h1.46L14 20.27V12l3-4.27V3.73L16.27 3zM13 11h-2V5h2v6z" />
            </svg>
            네이버로 시작하기
          </button>
        </div>
        <p className="mt-3 text-center text-[12px] text-gray-500 leading-relaxed">
          간편가입도 위 필수 약관 동의 후 진행됩니다.
        </p>

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
