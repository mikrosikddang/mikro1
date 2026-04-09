"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CampaignStatus, SellerKind } from "@prisma/client";
import { formatKrw } from "@/lib/format";
import { sellerKindLabel } from "@/lib/sellerTypes";
import { buildCanonicalUrl } from "@/lib/siteUrl";

type ProductOption = {
  id: string;
  title: string;
  isActive: boolean;
  priceKrw: number;
  salePriceKrw: number | null;
  images: { url: string }[];
};

type CampaignItem = {
  id: string;
  title: string;
  slug: string;
  refCode: string;
  status: CampaignStatus;
  landingHeadline: string | null;
  startsAt: string | null;
  endsAt: string | null;
  defaultCommissionRateBps: number | null;
  products: Array<{
    id: string;
    product: {
      id: string;
      title: string;
      images: { url: string }[];
    };
  }>;
  metrics: {
    visits: number;
    attributedOrders: number;
    grossSalesKrw: number;
    expectedCommissionKrw: number;
    payableCommissionKrw: number;
  };
};

type SellerProfileSummary = {
  shopName: string;
  sellerKind: SellerKind;
  creatorSlug: string | null;
  commissionRateBps: number;
};

const STATUS_OPTIONS: Array<{ value: CampaignStatus; label: string }> = [
  { value: CampaignStatus.ACTIVE, label: "운영중" },
  { value: CampaignStatus.DRAFT, label: "초안" },
  { value: CampaignStatus.ENDED, label: "종료" },
  { value: CampaignStatus.ARCHIVED, label: "보관" },
];

export default function SellerCampaignsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [sellerProfile, setSellerProfile] = useState<SellerProfileSummary | null>(null);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignItem[]>([]);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [form, setForm] = useState<{
    title: string;
    landingHeadline: string;
    description: string;
    landingBody: string;
    startsAt: string;
    endsAt: string;
    defaultCommissionRateBps: string;
    status: CampaignStatus;
  }>({
    title: "",
    landingHeadline: "",
    description: "",
    landingBody: "",
    startsAt: "",
    endsAt: "",
    defaultCommissionRateBps: "1200",
    status: CampaignStatus.ACTIVE,
  });

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/seller/campaigns");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "캠페인 정보를 불러오지 못했습니다");
      setSellerProfile(data.sellerProfile);
      setProducts(data.products || []);
      setCampaigns(data.campaigns || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "캠페인 정보를 불러오지 못했습니다");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const totalSummary = useMemo(() => {
    return campaigns.reduce(
      (acc, campaign) => {
        acc.visits += campaign.metrics.visits;
        acc.orders += campaign.metrics.attributedOrders;
        acc.grossSalesKrw += campaign.metrics.grossSalesKrw;
        acc.expectedCommissionKrw += campaign.metrics.expectedCommissionKrw;
        return acc;
      },
      {
        visits: 0,
        orders: 0,
        grossSalesKrw: 0,
        expectedCommissionKrw: 0,
      },
    );
  }, [campaigns]);

  const toggleProduct = (productId: string) => {
    setSelectedProductIds((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId],
    );
  };

  const copyLink = async (campaign: CampaignItem) => {
    const url = buildCanonicalUrl(
      `/c/${campaign.slug}?campaign=${campaign.slug}&ref=${sellerProfile?.creatorSlug || campaign.refCode}`,
    );
    await navigator.clipboard.writeText(url);
    setSuccess("캠페인 링크를 복사했습니다.");
    window.setTimeout(() => setSuccess(null), 2500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      setError("캠페인명을 입력해주세요.");
      return;
    }
    if (selectedProductIds.length === 0) {
      setError("캠페인에 연결할 상품을 1개 이상 선택해주세요.");
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      const res = await fetch("/api/seller/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim(),
          landingHeadline: form.landingHeadline.trim() || null,
          description: form.description.trim() || null,
          landingBody: form.landingBody.trim() || null,
          startsAt: form.startsAt || null,
          endsAt: form.endsAt || null,
          defaultCommissionRateBps: Number(form.defaultCommissionRateBps || "0"),
          status: form.status,
          productIds: selectedProductIds,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "캠페인 생성에 실패했습니다.");

      setForm({
        title: "",
        landingHeadline: "",
        description: "",
        landingBody: "",
        startsAt: "",
        endsAt: "",
        defaultCommissionRateBps: String(sellerProfile?.commissionRateBps ?? 1200),
        status: CampaignStatus.ACTIVE,
      });
      setSelectedProductIds([]);
      setSuccess("캠페인을 생성했습니다.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "캠페인 생성에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="py-8 text-center text-gray-500">불러오는 중...</div>;
  }

  return (
    <div className="py-4">
      <div className="mb-5">
        <h1 className="text-[20px] font-bold text-black">공동구매 캠페인</h1>
        <p className="mt-1 text-[14px] text-gray-500">
          링크 유입, 주문 귀속, 예상 정산을 캠페인 단위로 관리합니다.
        </p>
      </div>

      {sellerProfile && (
        <div className="mb-4 rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex flex-wrap items-center gap-2 text-[13px] text-gray-600">
            <span className="rounded-full bg-gray-100 px-2.5 py-1">
              {sellerKindLabel(sellerProfile.sellerKind)}
            </span>
            <span className="rounded-full bg-gray-100 px-2.5 py-1">
              기본 수수료 {sellerProfile.commissionRateBps / 100}%
            </span>
            <span className="rounded-full bg-gray-100 px-2.5 py-1">
              ref {sellerProfile.creatorSlug || "-"}
            </span>
          </div>
        </div>
      )}

      <div className="mb-5 grid grid-cols-2 gap-2.5">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-[13px] text-gray-500">총 방문</p>
          <p className="mt-1 text-[24px] font-bold text-black">{totalSummary.visits}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-[13px] text-gray-500">귀속 주문</p>
          <p className="mt-1 text-[24px] font-bold text-black">{totalSummary.orders}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-[13px] text-gray-500">귀속 매출</p>
          <p className="mt-1 text-[18px] font-bold text-black">
            {formatKrw(totalSummary.grossSalesKrw)}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-[13px] text-gray-500">예상 수수료</p>
          <p className="mt-1 text-[18px] font-bold text-black">
            {formatKrw(totalSummary.expectedCommissionKrw)}
          </p>
        </div>
      </div>

      <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-5">
        <h2 className="mb-4 text-[16px] font-bold text-black">새 캠페인 만들기</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="mb-1 block text-[13px] font-medium text-gray-700">
              캠페인명
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-[14px] focus:border-black focus:outline-none"
              placeholder="예: 봄 라이브 공동구매"
            />
          </div>

          <div className="mb-3">
            <label className="mb-1 block text-[13px] font-medium text-gray-700">
              랜딩 헤드라인
            </label>
            <input
              type="text"
              value={form.landingHeadline}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, landingHeadline: e.target.value }))
              }
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-[14px] focus:border-black focus:outline-none"
              placeholder="예: 라이브 한정 혜택으로 만나보세요"
            />
          </div>

          <div className="mb-3">
            <label className="mb-1 block text-[13px] font-medium text-gray-700">
              캠페인 설명
            </label>
            <textarea
              value={form.description}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, description: e.target.value }))
              }
              rows={2}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-[14px] focus:border-black focus:outline-none"
              placeholder="캠페인 소개를 짧게 적어주세요"
            />
          </div>

          <div className="mb-3">
            <label className="mb-1 block text-[13px] font-medium text-gray-700">
              랜딩 상세 문구
            </label>
            <textarea
              value={form.landingBody}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, landingBody: e.target.value }))
              }
              rows={4}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-[14px] focus:border-black focus:outline-none"
              placeholder="혜택, 마감 일정, 배송 유의사항 등을 적어주세요"
            />
          </div>

          <div className="mb-3 grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[13px] font-medium text-gray-700">
                시작일
              </label>
              <input
                type="datetime-local"
                value={form.startsAt}
                onChange={(e) => setForm((prev) => ({ ...prev, startsAt: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-[14px] focus:border-black focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-[13px] font-medium text-gray-700">
                종료일
              </label>
              <input
                type="datetime-local"
                value={form.endsAt}
                onChange={(e) => setForm((prev) => ({ ...prev, endsAt: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-[14px] focus:border-black focus:outline-none"
              />
            </div>
          </div>

          <div className="mb-4 grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[13px] font-medium text-gray-700">
                수수료율
              </label>
              <input
                type="number"
                min={0}
                max={10000}
                value={form.defaultCommissionRateBps}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    defaultCommissionRateBps: e.target.value,
                  }))
                }
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-[14px] focus:border-black focus:outline-none"
              />
              <p className="mt-1 text-[12px] text-gray-500">
                bps 기준입니다. `1200` = 12%
              </p>
            </div>
            <div>
              <label className="mb-1 block text-[13px] font-medium text-gray-700">
                상태
              </label>
              <select
                value={form.status}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    status: e.target.value as CampaignStatus,
                  }))
                }
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-[14px] focus:border-black focus:outline-none"
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mb-4">
            <label className="mb-2 block text-[13px] font-medium text-gray-700">
              연결 상품
            </label>
            <div className="space-y-2">
              {products.length === 0 ? (
                <div className="rounded-lg border border-dashed border-gray-200 p-4 text-[13px] text-gray-500">
                  <p>등록된 상품이 없습니다.</p>
                  <Link
                    href="/seller/products/new"
                    className="mt-2 inline-block font-medium text-blue-600 underline"
                  >
                    상품 등록하러 가기
                  </Link>
                </div>
              ) : (
                products.map((product) => (
                  <label
                    key={product.id}
                    className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-200 p-3"
                  >
                    <input
                      type="checkbox"
                      checked={selectedProductIds.includes(product.id)}
                      onChange={() => toggleProduct(product.id)}
                    />
                    <div className="h-14 w-14 overflow-hidden rounded-lg bg-gray-100">
                      {product.images[0]?.url ? (
                        <Image
                          src={product.images[0].url}
                          alt={product.title}
                          width={56}
                          height={56}
                          className="h-full w-full object-cover"
                        />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-medium text-black">
                        {product.title}
                      </p>
                      <p className="text-[12px] text-gray-500">
                        {formatKrw(product.salePriceKrw ?? product.priceKrw)}
                        {!product.isActive && " · 비노출"}
                      </p>
                    </div>
                  </label>
                ))
              )}
            </div>
          </div>

          {error && (
            <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-[13px] text-red-600">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-3 rounded-lg bg-green-50 px-3 py-2 text-[13px] text-green-600">
              {success}
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="h-11 w-full rounded-xl bg-black text-[15px] font-semibold text-white disabled:opacity-50"
          >
            {saving ? "생성 중..." : "캠페인 생성"}
          </button>
        </form>
      </div>

      <div>
        <h2 className="mb-3 text-[16px] font-bold text-black">내 캠페인</h2>
        {campaigns.length === 0 ? (
          <div className="rounded-xl bg-gray-50 p-6 text-center text-[14px] text-gray-500">
            아직 생성한 캠페인이 없습니다.
          </div>
        ) : (
          <div className="space-y-3">
            {campaigns.map((campaign) => (
              <div
                key={campaign.id}
                className="rounded-xl border border-gray-200 bg-white p-4"
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-[16px] font-bold text-black">
                      {campaign.title}
                    </h3>
                    <p className="mt-1 text-[13px] text-gray-500">
                      /c/{campaign.slug} · ref {campaign.refCode}
                    </p>
                  </div>
                  <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[12px] font-medium text-gray-700">
                    {STATUS_OPTIONS.find((item) => item.value === campaign.status)?.label}
                  </span>
                </div>

                {campaign.landingHeadline && (
                  <p className="mb-3 text-[14px] text-gray-700">
                    {campaign.landingHeadline}
                  </p>
                )}

                <div className="mb-3 grid grid-cols-2 gap-2 text-[13px]">
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-gray-500">방문</p>
                    <p className="mt-1 text-[18px] font-bold text-black">
                      {campaign.metrics.visits}
                    </p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-gray-500">귀속 주문</p>
                    <p className="mt-1 text-[18px] font-bold text-black">
                      {campaign.metrics.attributedOrders}
                    </p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-gray-500">귀속 매출</p>
                    <p className="mt-1 text-[16px] font-bold text-black">
                      {formatKrw(campaign.metrics.grossSalesKrw)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-gray-500">예상 수수료</p>
                    <p className="mt-1 text-[16px] font-bold text-black">
                      {formatKrw(campaign.metrics.expectedCommissionKrw)}
                    </p>
                  </div>
                </div>

                <div className="mb-3 flex flex-wrap gap-2">
                  {campaign.products.map((item) => (
                    <span
                      key={item.id}
                      className="rounded-full bg-gray-100 px-2.5 py-1 text-[12px] text-gray-700"
                    >
                      {item.product.title}
                    </span>
                  ))}
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => copyLink(campaign)}
                    className="flex-1 rounded-lg bg-black px-3 py-2 text-[13px] font-medium text-white"
                  >
                    링크 복사
                  </button>
                  <a
                    href={`/c/${campaign.slug}?campaign=${campaign.slug}&ref=${sellerProfile?.creatorSlug || campaign.refCode}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-center text-[13px] font-medium text-gray-700"
                  >
                    랜딩 보기
                  </a>
                </div>
              <p className="mt-2 text-[12px] text-gray-500">
                방문 수는 같은 세션의 짧은 시간 내 반복 새로고침을 제외한 기준입니다.
              </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
