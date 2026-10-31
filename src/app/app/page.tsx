import type { Metadata } from "next";
import { AppHeader } from "@/components/app/app-header";
import { BrandFormLoader } from "@/components/app/brand-form";

export const metadata: Metadata = {
  title: "브랜드 입력 — GEO 스나이퍼",
  robots: { index: false },
};

// `/app` — 랜딩의 [무료 진단 해보기]. 누가 와도 항상 브랜드 입력 (T-04, D-27). 대시보드는 /app/dashboard.
export default function AppHomePage() {
  return (
    <main className="page-glow flex-1 pb-16">
      <AppHeader />
      <div className="mx-auto max-w-xl px-4 pt-10 md:pt-16">
        <BrandFormLoader />
      </div>
    </main>
  );
}
