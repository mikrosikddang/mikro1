"use client";

import { useState, useEffect, useRef } from "react";

// Daum Postcode types
declare global {
  interface Window {
    daum: any;
  }
}

interface Props {
  onSaved: () => void;
  onCancel: () => void;
}

export default function AddressForm({ onSaved, onCancel }: Props) {
  const [zipCode, setZipCode] = useState("");
  const [addr1, setAddr1] = useState("");
  const [addr2, setAddr2] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [scriptError, setScriptError] = useState(false);
  const [showPostcode, setShowPostcode] = useState(false);
  const postcodeRef = useRef<HTMLDivElement>(null);

  const loadPostcodeScript = () => {
    setScriptError(false);
    setScriptLoaded(false);

    // Check if script already exists
    const existingScript = document.querySelector(
      'script[src*="postcode.v2.js"]'
    );
    if (existingScript) {
      existingScript.remove();
    }

    const script = document.createElement("script");
    script.src = "https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
    script.async = true;
    script.onload = () => {
      setScriptLoaded(true);
      setScriptError(false);
    };
    script.onerror = () => {
      setScriptError(true);
      setScriptLoaded(false);
    };
    document.body.appendChild(script);
  };

  useEffect(() => {
    loadPostcodeScript();

    return () => {
      const script = document.querySelector(
        'script[src*="postcode.v2.js"]'
      );
      if (script) {
        script.remove();
      }
    };
  }, []);

  const handleSearchAddress = () => {
    if (!scriptLoaded || !window.daum) {
      setError("주소 검색 서비스를 불러오는 중입니다");
      return;
    }

    setShowPostcode(true);
  };

  // Embed postcode widget when showPostcode becomes true
  useEffect(() => {
    if (!showPostcode || !postcodeRef.current || !window.daum) return;

    new window.daum.Postcode({
      oncomplete: function (data: any) {
        setZipCode(data.zonecode);
        setAddr1(data.roadAddress || data.jibunAddress);
        setError("");
        setShowPostcode(false);
      },
      width: "100%",
      height: "100%",
    }).embed(postcodeRef.current);
  }, [showPostcode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!zipCode.trim() || !addr1.trim()) {
      setError("주소 검색 버튼을 눌러 주소를 선택해주세요");
      return;
    }

    if (!addr2.trim()) {
      setError("상세 주소를 입력해주세요");
      return;
    }

    if (!name.trim()) {
      setError("받는 분 이름을 입력해주세요");
      return;
    }

    if (!phone.trim()) {
      setError("받는 분 전화번호를 입력해주세요");
      return;
    }

    try {
      setLoading(true);

      const res = await fetch("/api/addresses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          zipCode: zipCode.trim(),
          addr1: addr1.trim(),
          addr2: addr2.trim(),
          isDefault,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "배송지 저장 실패");
      }

      onSaved();
    } catch (err: any) {
      setError(err.message || "배송지 저장 중 오류가 발생했습니다");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-[20px] font-bold text-black mb-4">배송지 추가</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Address search */}
          <div>
            <label className="block text-[14px] font-medium text-gray-700 mb-2">
              주소 *
            </label>
            <button
              type="button"
              onClick={handleSearchAddress}
              disabled={loading || (!scriptLoaded && !scriptError)}
              className="w-full h-12 px-4 rounded-xl border border-gray-200 text-left text-[15px] bg-gray-50 hover:bg-gray-100 active:bg-gray-200 transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              {zipCode && addr1 ? (
                <span className="text-black">
                  ({zipCode}) {addr1}
                </span>
              ) : !scriptLoaded && !scriptError ? (
                <span className="text-gray-400">주소 검색 준비 중...</span>
              ) : (
                <span className="text-gray-400">주소 검색</span>
              )}
            </button>
            {scriptError && (
              <div className="mt-2 p-3 bg-red-50 rounded-lg">
                <p className="text-[13px] text-red-600 mb-2">
                  주소 검색 서비스를 불러오지 못했습니다
                </p>
                <button
                  type="button"
                  onClick={loadPostcodeScript}
                  className="text-[13px] text-red-600 font-medium underline"
                >
                  다시 시도
                </button>
              </div>
            )}
          </div>

          {/* Detailed address (manual input) */}
          {zipCode && addr1 && (
            <div>
              <label className="block text-[14px] font-medium text-gray-700 mb-2">
                상세 주소 *
              </label>
              <input
                type="text"
                value={addr2}
                onChange={(e) => setAddr2(e.target.value)}
                placeholder="동/호수 등 상세 주소 입력"
                className="w-full h-12 px-4 rounded-xl border border-gray-200 text-[15px] placeholder:text-gray-400 focus:outline-none focus:border-black transition-colors"
                disabled={loading}
              />
            </div>
          )}

          {/* Recipient name */}
          <div>
            <label className="block text-[14px] font-medium text-gray-700 mb-2">
              받는 분 *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="이름"
              className="w-full h-12 px-4 rounded-xl border border-gray-200 text-[15px] placeholder:text-gray-400 focus:outline-none focus:border-black transition-colors"
              disabled={loading}
            />
          </div>

          {/* Recipient phone */}
          <div>
            <label className="block text-[14px] font-medium text-gray-700 mb-2">
              전화번호 *
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="010-1234-5678"
              className="w-full h-12 px-4 rounded-xl border border-gray-200 text-[15px] placeholder:text-gray-400 focus:outline-none focus:border-black transition-colors"
              disabled={loading}
            />
          </div>

          {/* Is default checkbox */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isDefault"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              disabled={loading}
              className="w-5 h-5 rounded border-gray-300 text-black focus:ring-0 focus:ring-offset-0"
            />
            <label htmlFor="isDefault" className="text-[14px] text-gray-700 cursor-pointer">
              기본 배송지로 설정
            </label>
          </div>

          {/* Error message */}
          {error && (
            <p className="text-[13px] text-red-500 text-center">{error}</p>
          )}

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="flex-1 h-12 bg-gray-200 text-gray-700 rounded-xl text-[16px] font-bold active:bg-gray-300 transition-colors disabled:opacity-50"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 h-12 bg-black text-white rounded-xl text-[16px] font-bold active:bg-gray-800 transition-colors disabled:opacity-50"
            >
              {loading ? "저장 중..." : "저장"}
            </button>
          </div>
        </form>
      </div>

      {/* Daum Postcode embed overlay */}
      {showPostcode && (
        <div className="fixed inset-0 z-[70] bg-white flex flex-col">
          <div className="flex items-center justify-between px-4 h-[52px] border-b border-gray-100 shrink-0">
            <h2 className="text-[16px] font-semibold text-black">주소 검색</h2>
            <button
              type="button"
              onClick={() => setShowPostcode(false)}
              className="text-[14px] text-gray-500 active:text-gray-700"
            >
              닫기
            </button>
          </div>
          <div ref={postcodeRef} className="flex-1" />
        </div>
      )}
    </div>
  );
}
