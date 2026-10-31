import type { Metadata } from "next";
import { AppHeader } from "@/components/app/app-header";
import { AppHome } from "@/components/app/app-home";

export const metadata: Metadata = {
  title: "GEO 스나이퍼",
  robots: { index: false },
};

// `/app` — 로그인 + 진단한 브랜드가 있으면 대시보드(T-33), 아니면 브랜드 입력(T-04)
export default function AppHomePage() {
  return (
    <main className="page-glow flex-1 pb-16">
      <AppHeader />
      <div className="mx-auto max-w-3xl px-4 pt-10 md:pt-14">
        <AppHome />
      </div>
    </main>
  );
}
