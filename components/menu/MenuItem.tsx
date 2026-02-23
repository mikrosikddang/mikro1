import Link from "next/link";

type MenuItemProps = {
  label: string;
  href?: string;
  showChevron?: boolean;
  icon?: React.ReactNode;
  subtitle?: string;
  onClick?: () => void;
  isSubmenu?: boolean;
};

export default function MenuItem({
  label,
  href,
  showChevron = false,
  icon,
  subtitle,
  onClick,
  isSubmenu = false,
}: MenuItemProps) {
  const content = (
    <div
      className={`flex items-center justify-between text-gray-900 active:bg-gray-50 rounded-xl transition-colors ${
        isSubmenu ? "pl-8 pr-4" : "px-4"
      } ${subtitle ? "h-[52px]" : "h-[44px]"}`}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {icon && <div className="w-[18px] h-[18px] flex-shrink-0">{icon}</div>}
        <div className="flex-1 min-w-0">
          <div
            className={
              subtitle
                ? "text-[16px] font-medium"
                : isSubmenu
                ? "text-[16px] font-medium"
                : "text-[17px] font-medium"
            }
          >
            {label}
          </div>
          {subtitle && (
            <div className="text-[13px] text-gray-500 mt-[2px]">{subtitle}</div>
          )}
        </div>
      </div>

      {showChevron && (
        <svg
          className="w-5 h-5 text-gray-300 flex-shrink-0"
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
    </div>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className="w-full text-left">
        {content}
      </button>
    );
  }

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}
