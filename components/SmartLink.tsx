"use client";

import type React from "react";

// Opens known hosts in their native app on mobile, with a guaranteed browser fallback.
// Deep-linking is best-effort: if the app is missing or the scheme is unsupported,
// the link ALWAYS falls back to opening the original https URL in the browser.
// Security: http/https only, rel="noopener noreferrer nofollow", no innerHTML.

type AppMapping = {
  // iOS custom scheme to attempt; null = no reliable scheme, just open browser.
  iosScheme: string | null;
  // Android package for the intent:// fallback_url mechanism.
  androidPackage: string;
};

const INSTAGRAM_RESERVED = new Set(["p", "reel", "reels", "explore", "stories", "tv"]);
const INSTAGRAM_PROFILE = /^\/([A-Za-z0-9._]{1,40})\/?$/;

function resolveMapping(url: URL, href: string): AppMapping | null {
  const host = url.hostname.toLowerCase();

  // Instagram — profile deep link only; posts/reels fall back to app via package.
  if (host === "instagram.com" || host === "www.instagram.com" || host === "instagr.am") {
    const m = INSTAGRAM_PROFILE.exec(url.pathname);
    const iosScheme =
      m && !INSTAGRAM_RESERVED.has(m[1].toLowerCase())
        ? `instagram://user?username=${m[1]}`
        : null;
    return { iosScheme, androidPackage: "com.instagram.android" };
  }

  // YouTube — youtube:// scheme mirrors the https URL.
  if (
    host === "youtube.com" ||
    host === "www.youtube.com" ||
    host === "m.youtube.com" ||
    host === "music.youtube.com" ||
    host === "youtu.be"
  ) {
    return {
      iosScheme: href.replace(/^https?:\/\//, "youtube://"),
      androidPackage: "com.google.android.youtube",
    };
  }

  // Naver — covers smartstore/blog/m/place via the search app's in-app browser (best-effort).
  if (host === "naver.com" || host.endsWith(".naver.com")) {
    return {
      iosScheme: `naversearchapp://inappbrowser?url=${encodeURIComponent(href)}&target=new&version=6`,
      androidPackage: "com.nhn.android.search",
    };
  }

  // Kakao — opening an arbitrary URL in KakaoTalk is unreliable on iOS (best-effort: browser).
  if (host === "kakao.com" || host.endsWith(".kakao.com")) {
    return { iosScheme: null, androidPackage: "com.kakao.talk" };
  }

  return null;
}

export default function SmartLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
}) {
  function handleClick(e: React.MouseEvent<HTMLAnchorElement>) {
    // Respect modified clicks / new-tab intents — let the browser do its thing.
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) {
      return;
    }

    const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
    const isAndroid = /Android/i.test(ua);
    const isIOS = /iPhone|iPad|iPod/i.test(ua);
    if (!isAndroid && !isIOS) return; // desktop: default new-tab behavior

    let url: URL;
    try {
      url = new URL(href);
    } catch {
      return; // unparseable — treat as a normal link
    }

    const mapping = resolveMapping(url, href);
    if (!mapping) return; // unknown host — normal link

    if (isAndroid) {
      e.preventDefault();
      // intent:// with S.browser_fallback_url: OS auto-falls back to the browser if the app is absent.
      const intentUrl =
        `intent://${url.host}${url.pathname}${url.search}${url.hash}` +
        `#Intent;scheme=https;package=${mapping.androidPackage};` +
        `S.browser_fallback_url=${encodeURIComponent(href)};end`;
      window.location.href = intentUrl;
      return;
    }

    // iOS
    e.preventDefault();
    if (mapping.iosScheme) {
      // If the app opens, the page is hidden and we cancel the browser fallback.
      const t = setTimeout(() => {
        if (!document.hidden) window.open(href, "_blank", "noopener,noreferrer");
      }, 1200);
      void t;
      window.location.href = mapping.iosScheme;
    } else {
      window.open(href, "_blank", "noopener,noreferrer");
    }
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className={className}
      onClick={handleClick}
    >
      {children}
    </a>
  );
}
