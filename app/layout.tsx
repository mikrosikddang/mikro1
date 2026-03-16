import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import TopBar from "@/components/TopBar";
import BottomTab from "@/components/BottomTab";
import CompanyFooter from "@/components/CompanyFooter";
import { SessionProvider, type ClientSession } from "@/components/SessionProvider";
import { getSession } from "@/lib/auth";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "mikro – 미크로브랜드",
  description: "작지만 스토리가 있는 패션",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();
  const clientSession: ClientSession = session
    ? { userId: session.userId, role: session.role, name: session.name, email: session.email }
    : null;

  return (
    <html lang="ko">
      <body className={`${geistSans.variable} font-sans antialiased bg-white text-gray-900`}>
        <SessionProvider session={clientSession}>
          <TopBar />
          <main className="pt-[52px] pb-[52px] min-h-screen">
            {children}
          </main>
          <BottomTab />
          <CompanyFooter />
        </SessionProvider>
      </body>
    </html>
  );
}
