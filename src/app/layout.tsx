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

const siteUrl = "https://youngrangpark-afk-builder.vercel.app";
const title = "GEO 스나이퍼 — AI 추천 목록에 내 브랜드 자리 만들기";
const description =
  "니치 홈프레이그런스 브랜드를 위한 GEO 운영 도구. 기준 브랜드가 왜 추천되는지 찾아, 이번 주 할 일로 바꿔 드려요.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title,
  description,
  keywords: ["니치 홈프레이그런스", "GEO", "AI 추천 노출", "브랜드 운영 자동화"],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: "/",
    siteName: "GEO 스나이퍼",
    title,
    description,
  },
  twitter: { card: "summary", title, description },
};

// AI · 검색엔진이 "이 페이지가 무엇에 관한 것인지" 읽어 가는 구조화 데이터
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "GEO 스나이퍼",
  description,
  url: siteUrl,
  applicationCategory: "BusinessApplication",
  inLanguage: "ko",
  keywords: "니치 홈프레이그런스, GEO, AI 추천 노출, 브랜드 운영 자동화",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`${pretendard.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {children}
        <Toaster theme="light" />
      </body>
    </html>
  );
}
