"use client";

import { useRef, useState, useEffect, useCallback } from "react";

type Props = {
  images: { url: string }[];
  aspect?: string;
  /** Show dot indicators (default true) */
  dots?: boolean;
  /** Extra CSS classes on the wrapper */
  className?: string;
};

export default function ImageCarousel({
  images,
  aspect = "3/4",
  dots = true,
  className = "",
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [current, setCurrent] = useState(0);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const idx = Math.round(el.scrollLeft / el.offsetWidth);
    // Clamp index to valid range
    const clampedIdx = Math.max(0, Math.min(idx, images.length - 1));
    setCurrent(clampedIdx);
  }, [images.length]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  // Programmatic scroll to index (for desktop navigation)
  const scrollToIndex = useCallback((nextIdx: number) => {
    const el = scrollRef.current;
    if (!el) return;

    // Clamp index to valid range
    const targetIdx = Math.max(0, Math.min(nextIdx, images.length - 1));

    // Calculate scroll position (each image takes full container width)
    const scrollLeft = targetIdx * el.offsetWidth;

    el.scrollTo({ left: scrollLeft, behavior: "smooth" });
    setCurrent(targetIdx);
  }, [images.length]);

  // Navigation handlers
  const goToPrev = useCallback((e: React.MouseEvent | React.KeyboardEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (current > 0) scrollToIndex(current - 1);
  }, [current, scrollToIndex]);

  const goToNext = useCallback((e: React.MouseEvent | React.KeyboardEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (current < images.length - 1) scrollToIndex(current + 1);
  }, [current, images.length, scrollToIndex]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") {
      goToPrev(e);
    } else if (e.key === "ArrowRight") {
      goToNext(e);
    }
  }, [goToPrev, goToNext]);

  // Handle dot click
  const handleDotClick = useCallback((e: React.MouseEvent, idx: number) => {
    e.preventDefault();
    e.stopPropagation();
    scrollToIndex(idx);
  }, [scrollToIndex]);

  // Handle resize: re-scroll to current index with new width
  useEffect(() => {
    const handleResize = () => {
      const el = scrollRef.current;
      if (!el) return;
      // Re-scroll to current index using new width (no animation)
      const scrollLeft = current * el.offsetWidth;
      el.scrollTo({ left: scrollLeft, behavior: "auto" });
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [current]);

  if (images.length === 0) {
    return (
      <div
        className={`w-full bg-gray-100 flex items-center justify-center text-gray-300 text-sm ${className}`}
        style={{ aspectRatio: aspect }}
      >
        이미지 없음
      </div>
    );
  }

  // Single image — no scroll needed
  if (images.length === 1) {
    return (
      <div className={`relative ${className}`}>
        <div className="w-full overflow-hidden" style={{ aspectRatio: aspect }}>
          <img
            src={images[0].url}
            alt=""
            className="w-full h-full object-cover"
          />
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative group ${className}`}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      role="region"
      aria-label="Image carousel"
    >
      <div
        ref={scrollRef}
        className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide"
        style={{ WebkitOverflowScrolling: "touch" } as React.CSSProperties}
      >
        {images.map((img, i) => (
          <div
            key={i}
            className="shrink-0 w-full snap-start overflow-hidden"
            style={{ aspectRatio: aspect }}
          >
            <img
              src={img.url}
              alt=""
              className="w-full h-full object-cover"
              loading={i === 0 ? "eager" : "lazy"}
            />
          </div>
        ))}
      </div>

      {/* Desktop navigation: prev/next buttons */}
      {images.length > 1 && (
        <>
          {/* Previous button */}
          <button
            type="button"
            onClick={goToPrev}
            disabled={current === 0}
            aria-label="Previous image"
            className="hidden md:flex absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 items-center justify-center bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-0 disabled:cursor-not-allowed disabled:pointer-events-none z-10"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>

          {/* Next button */}
          <button
            type="button"
            onClick={goToNext}
            disabled={current === images.length - 1}
            aria-label="Next image"
            className="hidden md:flex absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 items-center justify-center bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-0 disabled:cursor-not-allowed disabled:pointer-events-none z-10"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>

          {/* Clickable side zones (desktop only) */}
          <button
            type="button"
            onClick={goToPrev}
            disabled={current === 0}
            aria-label="Previous image"
            className="hidden md:block absolute left-0 inset-y-0 w-[30%] cursor-pointer disabled:cursor-default disabled:pointer-events-none"
            style={{ background: "transparent" }}
          />
          <button
            type="button"
            onClick={goToNext}
            disabled={current === images.length - 1}
            aria-label="Next image"
            className="hidden md:block absolute right-0 inset-y-0 w-[30%] cursor-pointer disabled:cursor-default disabled:pointer-events-none"
            style={{ background: "transparent" }}
          />
        </>
      )}

      {/* Dot indicators (clickable) */}
      {dots && images.length > 1 && (
        <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex gap-1.5 z-20">
          {images.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={(e) => handleDotClick(e, i)}
              aria-label={`Go to image ${i + 1}`}
              className={`w-[6px] h-[6px] rounded-full transition-all duration-200 ${
                i === current
                  ? "bg-white scale-110"
                  : "bg-white/50 hover:bg-white/70"
              }`}
            />
          ))}
        </div>
      )}

      {/* Counter badge (top-right) for many images */}
      {images.length > 5 && (
        <div className="absolute top-2.5 right-2.5 bg-black/50 text-white text-[11px] font-medium px-2 py-0.5 rounded-full z-20">
          {current + 1}/{images.length}
        </div>
      )}
    </div>
  );
}
