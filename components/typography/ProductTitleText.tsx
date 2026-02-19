/**
 * Product title typography component
 * Used in product detail page for consistent product title styling
 */

interface ProductTitleTextProps {
  title: string;
}

export default function ProductTitleText({ title }: ProductTitleTextProps) {
  return (
    <h1 className="text-[22px] font-bold text-black tracking-tight leading-snug">
      {title}
    </h1>
  );
}
