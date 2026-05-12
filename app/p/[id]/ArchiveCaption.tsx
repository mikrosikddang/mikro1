"use client";

import { useEffect, useRef, useState } from "react";

type ArchiveCaptionProps = {
  title: string;
  body?: string | null;
};

export default function ArchiveCaption({ title, body }: ArchiveCaptionProps) {
  const [expanded, setExpanded] = useState(false);
  const [canExpand, setCanExpand] = useState(false);
  const bodyRef = useRef<HTMLParagraphElement>(null);
  const normalizedBody = body?.trim() ?? "";

  useEffect(() => {
    const el = bodyRef.current;
    if (!el || !normalizedBody) {
      setCanExpand(false);
      return;
    }

    setCanExpand(el.scrollHeight > el.clientHeight + 1);
  }, [normalizedBody]);

  return (
    <section className="space-y-2">
      <h1 className="text-[15px] font-bold leading-snug text-black">
        {title}
      </h1>

      {normalizedBody && (
        <button
          type="button"
          onClick={() => canExpand && setExpanded((prev) => !prev)}
          className="block w-full text-left"
          aria-expanded={canExpand ? expanded : undefined}
        >
          <p
            ref={bodyRef}
            className={`whitespace-pre-wrap text-[14px] leading-relaxed text-gray-800 ${
              expanded ? "" : "line-clamp-2"
            }`}
          >
            {normalizedBody}
          </p>
          {canExpand && !expanded && (
            <span className="mt-0.5 inline-block text-[14px] leading-relaxed text-gray-400">
              ... 더보기
            </span>
          )}
        </button>
      )}
    </section>
  );
}
