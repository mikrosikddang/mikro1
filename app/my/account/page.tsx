"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

type UserData = {
  name: string | null;
  email: string | null;
  phone: string | null;
  provider: string | null;
  kakaoId: boolean;
  naverId: boolean;
  hasPassword: boolean;
  createdAt: string;
};

export default function AccountPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserData | null>(null);

  // Basic info
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [infoSaving, setInfoSaving] = useState(false);
  const [infoError, setInfoError] = useState<string | null>(null);
  const [infoSuccess, setInfoSuccess] = useState(false);

  // Password
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState(false);

  useEffect(() => {
    fetch("/api/user/me")
      .then((res) => {
        if (res.status === 401) {
          router.push("/login?next=/my/account");
          return null;
        }
        if (!res.ok) throw new Error("정보를 불러올 수 없습니다");
        return res.json();
      })
      .then((data) => {
        if (!data) return;
        setUser(data);
        setName(data.name ?? "");
        setPhone(data.phone ?? "");
        setEmail(data.email ?? "");
      })
      .catch((err) => setInfoError(err.message))
      .finally(() => setLoading(false));
  }, [router]);

  const handleInfoSave = async () => {
    setInfoSaving(true);
    setInfoError(null);
    setInfoSuccess(false);

    try {
      const res = await fetch("/api/user/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim() || null,
          ...(user?.provider !== "kakao" && user?.provider !== "naver" ? { email: email.trim() } : {}),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "저장에 실패했습니다");
      }

      setInfoSuccess(true);
      setTimeout(() => setInfoSuccess(false), 3000);
    } catch (err) {
      setInfoError(err instanceof Error ? err.message : "저장에 실패했습니다");
    } finally {
      setInfoSaving(false);
    }
  };

  const handlePasswordSave = async () => {
    setPwError(null);
    setPwSuccess(false);

    if (!newPw.trim()) {
      setPwError("새 비밀번호를 입력해주세요");
      return;
    }
    if (newPw.length < 8) {
      setPwError("비밀번호는 8자 이상이어야 합니다");
      return;
    }
    if (newPw !== confirmPw) {
      setPwError("새 비밀번호가 일치하지 않습니다");
      return;
    }
    if (user?.hasPassword && !currentPw.trim()) {
      setPwError("현재 비밀번호를 입력해주세요");
      return;
    }

    setPwSaving(true);

    try {
      const res = await fetch("/api/user/me/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(user?.hasPassword ? { currentPassword: currentPw } : {}),
          newPassword: newPw,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "비밀번호 변경에 실패했습니다");
      }

      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
      setPwSuccess(true);
      setUser((prev) => (prev ? { ...prev, hasPassword: true } : prev));
      setTimeout(() => setPwSuccess(false), 3000);
    } catch (err) {
      setPwError(err instanceof Error ? err.message : "비밀번호 변경에 실패했습니다");
    } finally {
      setPwSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-4 px-4">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-32" />
          <div className="h-4 bg-gray-200 rounded w-48" />
          <div className="h-40 bg-gray-200 rounded-xl" />
          <div className="h-40 bg-gray-200 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!user) return null;

  const isSocial = user.provider === "kakao" || user.provider === "naver";
  const providerLabel =
    user.provider === "kakao" ? "카카오" : user.provider === "naver" ? "네이버" : "이메일";

  const inputClass =
    "w-full px-3 py-2.5 rounded-lg border border-gray-200 text-[14px] focus:outline-none focus:border-black transition-colors";
  const labelClass = "block text-[13px] font-medium text-gray-700 mb-1";

  return (
    <div className="py-4 px-4">
      <div className="mb-4">
        <h1 className="text-[20px] font-bold text-black">회원정보 관리</h1>
      </div>

      {/* Section 1: 기본 정보 */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
        <h2 className="text-[16px] font-bold text-black mb-4">기본 정보</h2>

        <div className="space-y-3">
          <div>
            <label className={labelClass}>이름 *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setInfoError(null); }}
              placeholder="이름을 입력하세요"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>전화번호</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => { setPhone(e.target.value); setInfoError(null); }}
              placeholder="010-0000-0000"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>이메일 *</label>
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setInfoError(null); }}
              disabled={isSocial}
              className={`${inputClass} ${isSocial ? "bg-gray-100 text-gray-500" : ""}`}
            />
            {isSocial && (
              <p className="mt-1 text-[12px] text-gray-400">소셜 계정 이메일은 변경할 수 없습니다</p>
            )}
          </div>
        </div>

        {infoError && (
          <p className="mt-3 text-[12px] text-red-500">{infoError}</p>
        )}
        {infoSuccess && (
          <p className="mt-3 text-[13px] text-green-600">저장되었습니다</p>
        )}

        <button
          type="button"
          onClick={handleInfoSave}
          disabled={infoSaving}
          className="w-full h-12 mt-4 bg-black text-white rounded-xl text-[16px] font-bold active:bg-gray-800 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {infoSaving ? "저장 중..." : "저장"}
        </button>
      </div>

      {/* Section 2: 비밀번호 변경 */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
        <h2 className="text-[16px] font-bold text-black mb-4">
          비밀번호 {user.hasPassword ? "변경" : "설정"}
        </h2>

        {isSocial && !user.hasPassword && (
          <div className="p-3 bg-blue-50 rounded-lg mb-4">
            <p className="text-[13px] text-blue-700">
              {providerLabel} 계정으로 가입하셨습니다. 비밀번호를 설정하면 이메일로도 로그인할 수 있습니다.
            </p>
          </div>
        )}

        <div className="space-y-3">
          {user.hasPassword && (
            <div>
              <label className={labelClass}>현재 비밀번호</label>
              <input
                type="password"
                value={currentPw}
                onChange={(e) => { setCurrentPw(e.target.value); setPwError(null); }}
                placeholder="현재 비밀번호"
                className={inputClass}
              />
            </div>
          )}

          <div>
            <label className={labelClass}>새 비밀번호</label>
            <input
              type="password"
              value={newPw}
              onChange={(e) => { setNewPw(e.target.value); setPwError(null); }}
              placeholder="8자 이상"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>새 비밀번호 확인</label>
            <input
              type="password"
              value={confirmPw}
              onChange={(e) => { setConfirmPw(e.target.value); setPwError(null); }}
              placeholder="비밀번호 재입력"
              className={inputClass}
            />
          </div>
        </div>

        {pwError && (
          <p className="mt-3 text-[12px] text-red-500">{pwError}</p>
        )}
        {pwSuccess && (
          <p className="mt-3 text-[13px] text-green-600">
            비밀번호가 {user.hasPassword ? "변경" : "설정"}되었습니다
          </p>
        )}

        <button
          type="button"
          onClick={handlePasswordSave}
          disabled={pwSaving}
          className="w-full h-12 mt-4 bg-black text-white rounded-xl text-[16px] font-bold active:bg-gray-800 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {pwSaving ? "저장 중..." : user.hasPassword ? "비밀번호 변경" : "비밀번호 설정"}
        </button>
      </div>

      {/* Section 3: 소셜 계정 연동 */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
        <h2 className="text-[16px] font-bold text-black mb-4">소셜 계정 연동</h2>

        <div className="space-y-3">
          {/* Kakao */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-[#FEE500] flex items-center justify-center text-[14px] font-bold text-black">
                K
              </span>
              <span className="text-[14px] text-gray-900">카카오</span>
            </div>
            {user.kakaoId ? (
              <span className="text-[13px] text-green-600 font-medium">연동됨</span>
            ) : (
              <button
                type="button"
                onClick={() => alert("준비 중입니다")}
                className="px-3 py-1.5 rounded-lg bg-gray-100 text-[13px] text-gray-600 font-medium active:bg-gray-200 transition-colors"
              >
                연동하기
              </button>
            )}
          </div>

          {/* Naver */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-[#03C75A] flex items-center justify-center text-[14px] font-bold text-white">
                N
              </span>
              <span className="text-[14px] text-gray-900">네이버</span>
            </div>
            {user.naverId ? (
              <span className="text-[13px] text-green-600 font-medium">연동됨</span>
            ) : (
              <button
                type="button"
                onClick={() => alert("준비 중입니다")}
                className="px-3 py-1.5 rounded-lg bg-gray-100 text-[13px] text-gray-600 font-medium active:bg-gray-200 transition-colors"
              >
                연동하기
              </button>
            )}
          </div>
        </div>

        {/* Warning: last login method */}
        {isSocial && !user.hasPassword && (
          <div className="mt-3 p-3 bg-amber-50 rounded-lg">
            <p className="text-[12px] text-amber-700">
              {providerLabel} 계정이 유일한 로그인 수단입니다. 연동 해제하려면 먼저 비밀번호를 설정하세요.
            </p>
          </div>
        )}
      </div>

      {/* Section 4: 계정 정보 */}
      <div className="bg-gray-50 rounded-xl p-5 mb-4">
        <h2 className="text-[16px] font-bold text-black mb-3">계정 정보</h2>
        <dl className="space-y-2">
          <div className="flex text-[13px]">
            <dt className="w-20 text-gray-500 shrink-0">가입일</dt>
            <dd className="text-gray-700">
              {new Date(user.createdAt).toLocaleDateString("ko-KR", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </dd>
          </div>
          <div className="flex text-[13px]">
            <dt className="w-20 text-gray-500 shrink-0">가입 방법</dt>
            <dd className="text-gray-700">{providerLabel}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
