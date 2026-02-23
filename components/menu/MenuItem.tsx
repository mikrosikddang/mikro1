import Link from "next/link";

type MenuItemProps = {
  label: string;
  href: string;
  showChevron?: boolean;
  icon?: React.ReactNode;
};

export default function MenuItem({
  label,
  href,
  showChevron = false,
  icon,
}: MenuItemProps) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between h-[52px] px-4 text-[17px] font-medium text-gray-900 hover:bg-gray-50 active:bg-gray-100 rounded-lg transition-colors"
    >
      <div className="flex items-center gap-3">
        {icon && <div className="w-[18px] h-[18px] flex-shrink-0">{icon}</div>}
        <span>{label}</span>
      </div>

      {showChevron && (
        <svg
          className="w-5 h-5 text-gray-400"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 5l7 7-7 7"
          />
        </svg>
      )}
    </Link>
  );
}
