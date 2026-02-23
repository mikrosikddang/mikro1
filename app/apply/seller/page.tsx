"use client";

/**
 * Seller Application Page
 * Allows customers to apply to become sellers
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Container from "@/components/Container";

const SHOP_TYPES = ["도매", "브랜드", "사입", "기타"];

export default function SellerApplyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [existingProfile, setExistingProfile] = useState<any>(null);

  const [formData, setFormData] = useState({
    shopName: "",
    type: "",
    marketBuilding: "",
    floor: "",
    roomNo: "",
    managerPhone: "",
    csEmail: "",
  });

  const [error, setError] = useState("");

  useEffect(() => {
    checkExistingProfile();
  }, []);

  const checkExistingProfile = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/seller/apply");
      if (!res.ok) {
        // Not logged in, redirect to login
        if (res.status === 401) {
          router.push("/login?next=/apply/seller");
          return;
        }
        throw new Error("Failed to fetch profile");
      }

      const data = await res.json();
      if (data.exists) {
        setExistingProfile(data.profile);
        // Pre-fill form with existing data
        setFormData({
          shopName: data.profile.shopName || "",
          type: data.profile.type || "",
          marketBuilding: data.profile.marketBuilding || "",
          floor: data.profile.floor || "",
          roomNo: data.profile.roomNo || "",
          managerPhone: data.profile.managerPhone || "",
          csEmail: data.profile.csEmail || "",
        });
      }
    } catch (error) {
      console.error("Error checking profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.shopName.trim()) {
      setError("상점명은 필수입니다.");
      return;
    }

    if (!formData.type) {
      setError("상점 유형을 선택해주세요.");
      return;
    }

    if (!formData.managerPhone.trim()) {
      setError("담당자 전화번호는 필수입니다.");
      return;
    }

    if (!formData.csEmail.trim()) {
      setError("고객센터 이메일은 필수입니다.");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/seller/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "신청에 실패했습니다.");
        setSubmitting(false);
        return;
      }

      alert("판매자 신청이 완료되었습니다!\n심사 후 승인 여부를 안내드립니다.");
      router.push("/my");
    } catch (error) {
      console.error("Error submitting application:", error);
      setError("신청 중 오류가 발생했습니다.");
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Container>
        <div className="py-20 text-center text-gray-400 text-sm">
          로딩 중...
        </div>
      </Container>
    );
  }

  // Show status if profile exists and is approved
  if (existingProfile && existingProfile.status === "APPROVED") {
    return (
      <Container>
        <div className="py-8">
          <h1 className="text-[22px] font-bold text-black mb-4">
            판매자 가입 신청
          </h1>
          <div className="p-6 bg-green-50 rounded-xl text-center">
            <p className="text-[18px] font-bold text-green-800 mb-2">
              ✓ 승인 완료
            </p>
            <p className="text-[14px] text-green-700 mb-4">
              판매자로 승인되었습니다.
            </p>
            <button
              onClick={() => router.push("/seller")}
              className="px-6 py-2 bg-black text-white rounded-lg text-[14px] font-medium"
            >
              판매자 센터로 이동
            </button>
          </div>
        </div>
      </Container>
    );
  }

  // Show pending status
  if (existingProfile && existingProfile.status === "PENDING") {
    return (
      <Container>
        <div className="py-8">
          <h1 className="text-[22px] font-bold text-black mb-4">
            판매자 가입 신청
          </h1>
          <div className="p-6 bg-blue-50 rounded-xl text-center mb-6">
            <p className="text-[18px] font-bold text-blue-800 mb-2">
              심사 중
            </p>
            <p className="text-[14px] text-blue-700">
              판매자 승인 심사가 진행 중입니다.
              <br />
              결과는 이메일로 안내드립니다.
            </p>
          </div>
          <p className="text-[13px] text-gray-500 mb-4">
            신청 내용을 수정하려면 아래 양식을 다시 제출해주세요.
          </p>
        </div>
      </Container>
    );
  }

  // Show form
  return (
    <Container>
      <div className="py-8 pb-20">
        <h1 className="text-[22px] font-bold text-black mb-2">
          판매자 가입 신청
        </h1>
        <p className="text-[14px] text-gray-500 mb-6">
          판매자 정보를 입력하시면 심사 후 승인 여부를 안내드립니다.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Shop Name */}
          <div>
            <label className="block text-[14px] font-medium text-gray-700 mb-2">
              상점명 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.shopName}
              onChange={(e) =>
                setFormData({ ...formData, shopName: e.target.value })
              }
              placeholder="예: 동대문 의류도매"
              className="w-full h-12 px-4 rounded-xl border border-gray-200 text-[15px] focus:outline-none focus:border-black transition-colors"
              disabled={submitting}
            />
          </div>

          {/* Type */}
          <div>
            <label className="block text-[14px] font-medium text-gray-700 mb-2">
              상점 유형 <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.type}
              onChange={(e) =>
                setFormData({ ...formData, type: e.target.value })
              }
              className="w-full h-12 px-4 rounded-xl border border-gray-200 text-[15px] focus:outline-none focus:border-black transition-colors"
              disabled={submitting}
            >
              <option value="">선택해주세요</option>
              {SHOP_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          {/* Market Building */}
          <div>
            <label className="block text-[14px] font-medium text-gray-700 mb-2">
              상가명 (선택)
            </label>
            <input
              type="text"
              value={formData.marketBuilding}
              onChange={(e) =>
                setFormData({ ...formData, marketBuilding: e.target.value })
              }
              placeholder="예: 동대문종합시장"
              className="w-full h-12 px-4 rounded-xl border border-gray-200 text-[15px] focus:outline-none focus:border-black transition-colors"
              disabled={submitting}
            />
          </div>

          {/* Floor and Room */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[14px] font-medium text-gray-700 mb-2">
                층 (선택)
              </label>
              <input
                type="text"
                value={formData.floor}
                onChange={(e) =>
                  setFormData({ ...formData, floor: e.target.value })
                }
                placeholder="예: 3"
                className="w-full h-12 px-4 rounded-xl border border-gray-200 text-[15px] focus:outline-none focus:border-black transition-colors"
                disabled={submitting}
              />
            </div>
            <div>
              <label className="block text-[14px] font-medium text-gray-700 mb-2">
                호수 (선택)
              </label>
              <input
                type="text"
                value={formData.roomNo}
                onChange={(e) =>
                  setFormData({ ...formData, roomNo: e.target.value })
                }
                placeholder="예: 302"
                className="w-full h-12 px-4 rounded-xl border border-gray-200 text-[15px] focus:outline-none focus:border-black transition-colors"
                disabled={submitting}
              />
            </div>
          </div>

          {/* Manager Phone */}
          <div>
            <label className="block text-[14px] font-medium text-gray-700 mb-2">
              담당자 전화번호 <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              value={formData.managerPhone}
              onChange={(e) =>
                setFormData({ ...formData, managerPhone: e.target.value })
              }
              placeholder="010-1234-5678"
              className="w-full h-12 px-4 rounded-xl border border-gray-200 text-[15px] focus:outline-none focus:border-black transition-colors"
              disabled={submitting}
            />
            <p className="mt-1 text-[12px] text-gray-500">
              입점 심사 및 연락을 위한 담당자 전화번호입니다.
            </p>
          </div>

          {/* CS Email */}
          <div>
            <label className="block text-[14px] font-medium text-gray-700 mb-2">
              고객센터 이메일 <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={formData.csEmail}
              onChange={(e) =>
                setFormData({ ...formData, csEmail: e.target.value })
              }
              placeholder="cs@example.com"
              className="w-full h-12 px-4 rounded-xl border border-gray-200 text-[15px] focus:outline-none focus:border-black transition-colors"
              disabled={submitting}
            />
            <p className="mt-1 text-[12px] text-gray-500">
              고객 문의를 받을 이메일 주소입니다.
            </p>
          </div>

          {error && (
            <p className="text-[13px] text-red-500 text-center">{error}</p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full h-12 bg-black text-white rounded-xl text-[16px] font-bold active:bg-gray-800 transition-colors disabled:opacity-50"
          >
            {submitting ? "제출 중..." : "신청하기"}
          </button>
        </form>
      </div>
    </Container>
  );
}
