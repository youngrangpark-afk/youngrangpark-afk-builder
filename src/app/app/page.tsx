import type { Metadata } from "next";
import { AppHeader } from "@/components/app/app-header";
import { BrandFormLoader } from "@/components/app/brand-form";

export const metadata: Metadata = {
  title: "브랜드 입력 — GEO 스나이퍼",
  robots: { index: false },
};

// FLOW.md 화면 2 — `/app` 브랜드 입력 (T-04)
export default function AppHome() {
  return (
    <main className="page-glow flex-1 pb-16">
      <AppHeader step="1 / 3 · 브랜드 입력" />
      <div className="mx-auto max-w-xl px-4 pt-10 md:pt-16">
        <BrandFormLoader />
      </div>
    </main>
  );
}
