import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import TopBar from "@/components/TopBar";
import BottomTab from "@/components/BottomTab";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "mikro – 동대문 패션 플랫폼",
  description: "동대문 패션을 쉽고 빠르게",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className={`${geistSans.variable} font-sans antialiased bg-white text-gray-900`}>
        <TopBar />
        <main className="pt-[52px] pb-[52px] min-h-screen">
          {children}
        </main>
        <BottomTab />
      </body>
    </html>
  );
}
