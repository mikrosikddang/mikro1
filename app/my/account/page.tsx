"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CANONICAL_HOST, buildCanonicalUrl } from "@/lib/siteUrl";
import { isReservedStoreSlug, normalizeStoreSlug } from "@/lib/sellerTypes";

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

type PendingConnect = {
  provider: "kakao" | "naver";
  providerName: string;
  providerPhone: string;
};

type SpaceProfileData = {
  storeSlug: string | null;
  shopName: string | null;
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
  const [spaceProfile, setSpaceProfile] = useState<SpaceProfileData | null>(null);
  const [spaceStoreSlug, setSpaceStoreSlug] = useState("");
  const [linkSaving, setLinkSaving] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [linkSuccessMessage, setLinkSuccessMessage] = useState<string | null>(null);

  // Password
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState(false);

  // Social connect mismatch confirmation
  const [pendingConnect, setPendingConnect] = useState<PendingConnect | null>(null);
  const [connectLoading, setConnectLoading] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [connectSuccess, setConnectSuccess] = useState<string | null>(null);

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

  useEffect(() => {
    if (!user) return;
    const fetchPending = async () => {
      try {
        const res = await fetch("/api/auth/connect/pending");
        if (!res.ok) return;
        const data = await res.json();
        setPendingConnect(data.pending ?? null);
      } catch {
        // ignore
      }
    };
    fetchPending();

    const params = new URLSearchParams(window.location.search);
    const successProvider = params.get("connectSuccess");
    const errorCode = params.get("connectError");
    if (successProvider === "kakao" || successProvider === "naver") {
      setConnectSuccess(`${successProvider === "kakao" ? "카카오" : "네이버"} 계정이 연동되었습니다`);
      params.delete("connectSuccess");
      window.history.replaceState({}, "", `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}`);
    }
    if (errorCode) {
      const errorMap: Record<string, string> = {
        kakao_failed: "카카오 연동에 실패했습니다",
        kakao_state: "카카오 연동 검증에 실패했습니다. 다시 시도해주세요",
        kakao_token: "카카오 인증 토큰 발급에 실패했습니다",
        kakao_profile: "카카오 프로필 조회에 실패했습니다",
        kakao_required_info: "카카오 계정의 이름/전화번호 동의가 필요합니다",
        kakao_already_linked: "이미 다른 계정에 연동된 카카오 계정입니다",
        naver_failed: "네이버 연동에 실패했습니다",
        naver_state: "네이버 연동 검증에 실패했습니다. 다시 시도해주세요",
        naver_token: "네이버 인증 토큰 발급에 실패했습니다",
        naver_profile: "네이버 프로필 조회에 실패했습니다",
        naver_required_info: "네이버 계정의 이름/전화번호 동의가 필요합니다",
        naver_already_linked: "이미 다른 계정에 연동된 네이버 계정입니다",
      };
      setConnectError(errorMap[errorCode] ?? "소셜 계정 연동에 실패했습니다");
      params.delete("connectError");
      window.history.replaceState({}, "", `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}`);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const fetchSpaceProfile = async () => {
      try {
        const res = await fetch("/api/space/profile");
        if (!res.ok) return;
        const data = (await res.json()) as SpaceProfileData;
        setSpaceProfile(data);
        setSpaceStoreSlug(data.storeSlug ?? "");
      } catch {
        // ignore
      }
    };
    fetchSpaceProfile();
  }, [user]);

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

  const handleProfileLinkSave = async () => {
    setLinkError(null);
    setLinkSuccessMessage(null);

    const nextStoreSlug = normalizeStoreSlug(spaceStoreSlug);
    if (!nextStoreSlug) {
      setLinkError("프로필 링크를 입력해주세요");
      return;
    }
    if (!/^[a-z0-9][a-z0-9-_]{1,39}$/.test(nextStoreSlug)) {
      setLinkError("프로필 링크 형식을 확인해주세요");
      return;
    }
    if (isReservedStoreSlug(nextStoreSlug)) {
      setLinkError("사용할 수 없는 프로필 링크입니다");
      return;
    }
    if (
      spaceProfile?.storeSlug &&
      nextStoreSlug !== spaceProfile.storeSlug &&
      !window.confirm(
        "프로필 링크를 변경하시겠습니까?\n\n기존 링크로 들어온 방문자는 새 주소로 자동 이동됩니다.",
      )
    ) {
      return;
    }

    setLinkSaving(true);
    try {
      const res = await fetch("/api/space/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeSlug: nextStoreSlug }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || "프로필 링크 저장에 실패했습니다");
      }

      setSpaceProfile((prev) => ({
        storeSlug: data.storeSlug ?? nextStoreSlug,
        shopName: data.shopName ?? prev?.shopName ?? null,
      }));
      setSpaceStoreSlug(data.storeSlug ?? nextStoreSlug);
      setLinkSuccessMessage("프로필 링크가 저장되었습니다");
      setTimeout(() => setLinkSuccessMessage(null), 3000);
    } catch (err) {
      setLinkError(err instanceof Error ? err.message : "프로필 링크 저장에 실패했습니다");
    } finally {
      setLinkSaving(false);
    }
  };

  const handleCopyProfileLink = async () => {
    const nextStoreSlug = normalizeStoreSlug(spaceStoreSlug);
    if (!nextStoreSlug) {
      setLinkError("먼저 사용할 프로필 링크를 입력해주세요");
      return;
    }

    try {
      await navigator.clipboard.writeText(buildCanonicalUrl(`/${nextStoreSlug}`));
      setLinkError(null);
      setLinkSuccessMessage("프로필 링크가 복사되었습니다");
      setTimeout(() => setLinkSuccessMessage(null), 3000);
    } catch {
      setLinkError("프로필 링크 복사에 실패했습니다");
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

  const startConnect = (provider: "kakao" | "naver") => {
    setConnectError(null);
    window.location.href = `/api/auth/${provider}/connect`;
  };

  const handlePendingDecision = async (applyUpdates: boolean) => {
    setConnectLoading(true);
    setConnectError(null);
    try {
      const res = await fetch("/api/auth/connect/pending", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applyUpdates }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || data.message || "연동 처리에 실패했습니다");
      }

      if (data.cancelled) {
        setPendingConnect(null);
        setConnectSuccess("소셜 계정 연동을 취소했습니다");
        return;
      }

      setPendingConnect(null);
      setConnectSuccess("소셜 계정 연동이 완료되었습니다");
      const meRes = await fetch("/api/user/me");
      if (meRes.ok) {
        const me = await meRes.json();
        setUser(me);
        setName(me.name ?? "");
        setPhone(me.phone ?? "");
      }
    } catch (err) {
      setConnectError(err instanceof Error ? err.message : "연동 처리에 실패했습니다");
    } finally {
      setConnectLoading(false);
    }
  };

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

      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
        <h2 className="text-[16px] font-bold text-black mb-1">내 프로필 링크</h2>
        <p className="text-[13px] text-gray-500 mb-4">
          인스타그램 등 외부 채널에 바로 걸 수 있는 공개 프로필 주소입니다.
        </p>

        <div>
          <label className={labelClass}>프로필 링크</label>
          <input
            type="text"
            value={spaceStoreSlug}
            onChange={(e) => {
              setSpaceStoreSlug(normalizeStoreSlug(e.target.value));
              setLinkError(null);
              setLinkSuccessMessage(null);
            }}
            placeholder="예: mikrobrand"
            maxLength={40}
            className={inputClass}
          />
          <p className="mt-2 text-[12px] text-gray-500">
            공개 주소: <code>{`${CANONICAL_HOST}/${spaceStoreSlug || "your-link"}`}</code>
          </p>
          {spaceProfile?.shopName ? (
            <p className="mt-1 text-[12px] text-gray-400">
              현재 프로필명: {spaceProfile.shopName}
            </p>
          ) : null}
        </div>

        {linkError && (
          <p className="mt-3 text-[12px] text-red-500">{linkError}</p>
        )}
        {linkSuccessMessage && (
          <p className="mt-3 text-[13px] text-green-600">{linkSuccessMessage}</p>
        )}

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={handleCopyProfileLink}
            className="h-11 rounded-xl bg-gray-100 text-[14px] font-medium text-gray-700 active:bg-gray-200 transition-colors"
          >
            링크 복사
          </button>
          <button
            type="button"
            onClick={handleProfileLinkSave}
            disabled={linkSaving}
            className="h-11 rounded-xl bg-black text-[14px] font-bold text-white active:bg-gray-800 transition-colors disabled:bg-gray-300"
          >
            {linkSaving ? "저장 중..." : "링크 저장"}
          </button>
        </div>
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

        {pendingConnect && (
          <div className="mb-4 p-3 bg-amber-50 rounded-lg">
            <p className="text-[13px] text-amber-800 font-medium mb-2">
              {pendingConnect.provider === "kakao" ? "카카오" : "네이버"} 정보와 현재 회원정보가 다릅니다
            </p>
            <div className="space-y-1 text-[12px] text-amber-900">
              <p>현재 정보: {user.name ?? "-"} / {user.phone ?? "-"}</p>
              <p>
                소셜 정보: {pendingConnect.providerName} / {pendingConnect.providerPhone}
              </p>
            </div>
            <p className="mt-2 text-[12px] text-amber-800">
              기존 정보를 수정해야만 연동할 수 있습니다.
            </p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => handlePendingDecision(true)}
                disabled={connectLoading}
                className="flex-1 h-9 rounded-lg bg-black text-white text-[13px] font-medium disabled:opacity-50"
              >
                {connectLoading ? "처리 중..." : "기존 정보 수정 후 연동"}
              </button>
              <button
                type="button"
                onClick={() => handlePendingDecision(false)}
                disabled={connectLoading}
                className="flex-1 h-9 rounded-lg bg-gray-100 text-gray-700 text-[13px] font-medium disabled:opacity-50"
              >
                연동 취소
              </button>
            </div>
          </div>
        )}

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
                onClick={() => startConnect("kakao")}
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
                onClick={() => startConnect("naver")}
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

        {connectError && (
          <p className="mt-3 text-[12px] text-red-500">{connectError}</p>
        )}
        {connectSuccess && (
          <p className="mt-3 text-[13px] text-green-600">{connectSuccess}</p>
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
                timeZone: "Asia/Seoul",
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
