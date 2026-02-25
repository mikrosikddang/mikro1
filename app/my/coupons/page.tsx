"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Container from "@/components/Container";
import { formatKrw } from "@/lib/format";

interface MyCoupon {
  id: string;
  couponId: string;
  name: string;
  code: string;
  discountType: "PERCENT" | "FIXED";
  discountValue: number;
  minOrderAmount: number | null;
  maxDiscountAmount: number | null;
  expiresAt: string | null;
  usedAt: string | null;
  status: "available" | "used" | "expired";
  createdAt: string;
}

type Tab = "available" | "used";

export default function MyCouponsPage() {
  const router = useRouter();
  const [coupons, setCoupons] = useState<MyCoupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("available");
  const [couponCode, setCouponCode] = useState("");
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [counts, setCounts] = useState({ available: 0, used: 0, expired: 0 });

  useEffect(() => {
    loadCoupons();
  }, []);

  const loadCoupons = async () => {
    try {
      const res = await fetch("/api/my/coupons");
      if (res.status === 401) {
        router.push("/login?next=/my/coupons");
        return;
      }
      if (!res.ok) return;
      const data = await res.json();
      setCoupons(data.coupons || []);
      setCounts(data.counts || { available: 0, used: 0, expired: 0 });
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    const code = couponCode.trim();
    if (!code) {
      setError("쿠폰 코드를 입력해주세요");
      return;
    }

    setRegistering(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/coupons/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "쿠폰 등록에 실패했습니다");
      }

      setSuccess("쿠폰이 등록되었습니다");
      setCouponCode("");
      await loadCoupons();
    } catch (err) {
      setError(err instanceof Error ? err.message : "쿠폰 등록에 실패했습니다");
    } finally {
      setRegistering(false);
    }
  };

  const availableCoupons = coupons.filter((c) => c.status === "available");
  const usedOrExpiredCoupons = coupons.filter((c) => c.status === "used" || c.status === "expired");
  const displayCoupons = tab === "available" ? availableCoupons : usedOrExpiredCoupons;

  return (
    <Container>
      <div className="pt-4 pb-20">
        <h1 className="text-[22px] font-bold text-black mb-6">내 쿠폰</h1>

        {/* Coupon Code Input */}
        <div className="mb-6 p-4 bg-gray-50 rounded-xl">
          <label className="block text-[14px] font-medium text-gray-700 mb-2">
            쿠폰 코드 등록
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
              placeholder="쿠폰 코드 입력"
              className="flex-1 h-11 px-4 rounded-lg border border-gray-200 text-[15px] placeholder:text-gray-400 focus:outline-none focus:border-black transition-colors"
              disabled={registering}
            />
            <button
              type="button"
              onClick={handleRegister}
              disabled={registering || couponCode.trim().length === 0}
              className="h-11 px-5 bg-black text-white rounded-lg text-[14px] font-semibold active:bg-gray-800 transition-colors disabled:opacity-50"
            >
              {registering ? "등록 중..." : "등록"}
            </button>
          </div>
          {error && (
            <p className="text-[13px] text-red-500 mt-2">{error}</p>
          )}
          {success && (
            <p className="text-[13px] text-green-600 mt-2">{success}</p>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 mb-4">
          <button
            type="button"
            onClick={() => setTab("available")}
            className={`flex-1 py-3 text-[15px] font-medium text-center transition-colors ${
              tab === "available"
                ? "text-black border-b-2 border-black"
                : "text-gray-400"
            }`}
          >
            사용가능 ({counts.available})
          </button>
          <button
            type="button"
            onClick={() => setTab("used")}
            className={`flex-1 py-3 text-[15px] font-medium text-center transition-colors ${
              tab === "used"
                ? "text-black border-b-2 border-black"
                : "text-gray-400"
            }`}
          >
            사용완료·만료 ({counts.used + counts.expired})
          </button>
        </div>

        {/* Coupon List */}
        {loading ? (
          <div className="py-8 text-center text-gray-400 text-[14px]">
            불러오는 중...
          </div>
        ) : displayCoupons.length === 0 ? (
          <div className="py-8 text-center text-gray-400 text-[14px]">
            {tab === "available" ? "사용 가능한 쿠폰이 없습니다" : "사용완료·만료된 쿠폰이 없습니다"}
          </div>
        ) : (
          <div className="space-y-3">
            {displayCoupons.map((uc) => {
              const inactive = uc.status !== "available";

              return (
                <div
                  key={uc.id}
                  className={`p-4 bg-white rounded-xl border border-gray-100 ${
                    inactive ? "opacity-50" : ""
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-[16px] font-bold text-black">
                        {uc.discountType === "PERCENT"
                          ? `${uc.discountValue}% 할인`
                          : `${formatKrw(uc.discountValue)} 할인`}
                      </p>
                      <p className="text-[14px] text-gray-700 mt-0.5">
                        {uc.name}
                      </p>
                    </div>
                    {uc.status === "used" && (
                      <span className="ml-2 px-2 py-1 bg-gray-100 text-gray-500 text-[11px] font-bold rounded">
                        사용완료
                      </span>
                    )}
                    {uc.status === "expired" && (
                      <span className="ml-2 px-2 py-1 bg-gray-100 text-gray-500 text-[11px] font-bold rounded">
                        만료
                      </span>
                    )}
                  </div>
                  <div className="space-y-0.5 text-[12px] text-gray-400">
                    {uc.minOrderAmount != null && uc.minOrderAmount > 0 && (
                      <p>{formatKrw(uc.minOrderAmount)} 이상 주문 시 사용</p>
                    )}
                    {uc.discountType === "PERCENT" && uc.maxDiscountAmount != null && (
                      <p>최대 {formatKrw(uc.maxDiscountAmount)} 할인</p>
                    )}
                    {uc.expiresAt && (
                      <p>
                        유효기간: ~{new Date(uc.expiresAt).toLocaleDateString("ko-KR")}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Container>
  );
}
