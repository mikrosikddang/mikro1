import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "*.s3.ap-northeast-2.amazonaws.com" },
      { protocol: "https", hostname: "*.s3.amazonaws.com" },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://t1.daumcdn.net https://js.tosspayments.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' https://images.unsplash.com https://*.s3.ap-northeast-2.amazonaws.com https://*.s3.amazonaws.com https://*.daumcdn.net https://*.daum.net data: blob:",
              "font-src 'self' data:",
              "connect-src 'self' https://*.s3.ap-northeast-2.amazonaws.com https://*.s3.amazonaws.com https://*.tosspayments.com https://*.daumcdn.net https://*.daum.net",
              "frame-src 'self' https://t1.daumcdn.net https://postcode.map.daum.net https://*.daumcdn.net https://*.daum.net https://*.tosspayments.com https://*.toss.im",
              "frame-ancestors 'none'",
            ].join("; "),
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
