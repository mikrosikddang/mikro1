/**
 * Price typography component
 * Used in product detail page for consistent price styling
 * Includes tabular-nums and baseline correction for ₩ symbol
 *
 * Supports sale price display:
 * - When salePrice is provided: shows original price with strikethrough + sale price + discount %
 * - PD design spec:
 *   - 정가: text-gray-400 line-through text-[13px]
 *   - 할인가: text-black font-bold (기존 가격 스타일)
 *   - 할인율: bg-red-500 text-white rounded px-1.5 py-0.5 text-[12px] font-bold (뱃지)
 */

interface PriceTextProps {
  amount: number;
  salePrice?: number | null;
}

export default function PriceText({ amount, salePrice }: PriceTextProps) {
  if (salePrice != null && salePrice < amount) {
    const discountRate = Math.round((1 - salePrice / amount) * 100);

    return (
      <div>
        <div className="flex items-baseline gap-1.5">
          <span className="bg-red-500 text-white rounded px-1.5 py-0.5 text-[12px] font-bold">{discountRate}%</span>
          <span className="text-[14px] text-gray-700 relative top-[1px]">₩</span>
          <span className="text-[22px] font-bold text-black tabular-nums">
            {salePrice.toLocaleString()}
          </span>
        </div>
        <p className="text-[13px] text-gray-400 line-through tabular-nums mt-0.5">
          ₩{amount.toLocaleString()}
        </p>
      </div>
    );
  }

  return (
    <div className="flex items-baseline gap-1">
      <span className="text-[14px] text-gray-700 relative top-[1px]">₩</span>
      <span className="text-[22px] font-bold text-black tabular-nums">
        {amount.toLocaleString()}
      </span>
    </div>
  );
}
