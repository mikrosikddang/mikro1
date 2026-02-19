"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

const tabs = [
  { label: "판매중", value: "active" },
  { label: "숨김", value: "hidden" },
  { label: "품절", value: "sold-out" },
];

export default function SellerProductTabs({
  counts
}: {
  counts: { active: number; hidden: number; soldOut: number }
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get('tab') || 'active';

  const handleTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', value);
    router.push(`${pathname}?${params.toString()}`);
  };

  const getCount = (value: string): number => {
    if (value === 'active') return counts.active;
    if (value === 'hidden') return counts.hidden;
    if (value === 'sold-out') return counts.soldOut;
    return 0;
  };

  return (
    <div className="flex gap-2 border-b border-gray-200 mb-4 -mx-4 px-4">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          onClick={() => handleTabChange(tab.value)}
          className={`pb-3 px-4 text-[14px] font-medium border-b-2 transition-colors ${
            activeTab === tab.value
              ? "border-black text-black"
              : "border-transparent text-gray-500"
          }`}
        >
          {tab.label}
          <span className="ml-1.5 text-[13px]">
            ({getCount(tab.value)})
          </span>
        </button>
      ))}
    </div>
  );
}
