/**
 * Price typography component
 * Used in product detail page for consistent price styling
 * Includes tabular-nums and baseline correction for ₩ symbol
 */

interface PriceTextProps {
  amount: number;
}

export default function PriceText({ amount }: PriceTextProps) {
  return (
    <div className="flex items-baseline gap-1">
      <span className="text-[14px] text-gray-700 relative top-[1px]">₩</span>
      <span className="text-[22px] font-bold text-black tabular-nums">
        {amount.toLocaleString()}
      </span>
    </div>
  );
}
