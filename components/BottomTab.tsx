import Link from "next/link";

const tabs = [
  { label: "홈", href: "/" },
  { label: "관심", href: "#" },
  { label: "뉴스", href: "#" },
  { label: "채팅", href: "#" },
  { label: "MY", href: "#" },
];

export default function BottomTab() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100">
      <div className="mx-auto w-full max-w-[420px] flex items-center justify-around h-[52px]">
        {tabs.map((tab) => (
          <Link
            key={tab.label}
            href={tab.href}
            className="flex flex-col items-center justify-center gap-0.5 text-xs text-gray-500 hover:text-black transition-colors"
          >
            <span className="text-[13px] font-medium">{tab.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
