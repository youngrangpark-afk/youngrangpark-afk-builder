import type { Metadata } from "next";
import localFont from "next/font/local";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const pretendard = localFont({
  src: "../../node_modules/pretendard/dist/web/variable/woff2/PretendardVariable.woff2",
  variable: "--font-sans",
  weight: "45 920",
  display: "swap",
});

export const metadata: Metadata = {
  title: "랜딩 페이지 — 곧 열립니다",
  description: "AI 프로덕트 빌더 클럽 3기",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`${pretendard.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        {children}
        <Toaster theme="light" />
      </body>
    </html>
  );
}
