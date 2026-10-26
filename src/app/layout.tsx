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
const title = "GEO 스나이퍼 — 브랜드명만 넣으면 AI 검색 노출 진단";
const description =
  "ChatGPT · Gemini 가 우리 브랜드를 얼마나 자주 말하는지, 그리고 이번 주에 할 일 3가지를 한 장으로 보여 드려요.";
const keywords = ["GEO", "AI 검색 노출", "1인 창업", "브랜드 마케팅"];

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title,
  description,
  keywords,
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
  keywords: keywords.join(", "),
  audience: { "@type": "Audience", audienceType: "마케터 없이 브랜드를 운영하는 1인 창업자" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // DESIGN.md: 기본 화면은 다크 (랜딩 · 제품 화면 공통, D-13)
    <html lang="ko" className={`${pretendard.variable} dark h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {children}
        {/* 위쪽에 띄워 질문 화면 아래 고정 바([진단 시작])를 가리지 않게 */}
        <Toaster theme="dark" position="top-center" />
      </body>
    </html>
  );
}
