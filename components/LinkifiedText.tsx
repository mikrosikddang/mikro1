// Renders plain text with http/https URLs turned into clickable links.
// Security: no dangerouslySetInnerHTML — text is split into React nodes (XSS-safe).

import SmartLink from "@/components/SmartLink";

const URL_SPLIT = /(https?:\/\/[^\s]+)/g;
const IS_URL = /^https?:\/\//;
// Common trailing punctuation that shouldn't be part of the link.
const TRAILING_PUNCT = /[.,;:!?)\]}>"']+$/;

export default function LinkifiedText({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const parts = text.split(URL_SPLIT);

  return (
    <p className={className}>
      {parts.map((part, i) => {
        if (!IS_URL.test(part)) return part;

        // Strip trailing punctuation off the URL, keep it as plain text.
        const match = TRAILING_PUNCT.exec(part);
        const trailing = match ? match[0] : "";
        const href = trailing ? part.slice(0, part.length - trailing.length) : part;

        return (
          <span key={i}>
            <SmartLink href={href} className="text-blue-600 underline break-all">
              {href}
            </SmartLink>
            {trailing}
          </span>
        );
      })}
    </p>
  );
}
