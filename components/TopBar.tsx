import Link from "next/link";

export default function TopBar() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-100">
      <div className="mx-auto w-full max-w-[420px] flex items-center gap-3 px-4 h-[52px]">
        {/* Logo */}
        <Link href="/" className="text-[22px] font-extrabold tracking-tight shrink-0">
          mikro
        </Link>

        {/* Search bar placeholder */}
        <div className="flex-1 h-9 bg-gray-100 rounded-lg flex items-center px-3">
          <svg
            className="w-4 h-4 text-gray-400 shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <span className="ml-2 text-sm text-gray-400">검색</span>
        </div>

        {/* Hamburger menu placeholder */}
        <button className="shrink-0 p-1" aria-label="메뉴">
          <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>
    </header>
  );
}
