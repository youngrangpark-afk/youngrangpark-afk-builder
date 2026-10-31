import type { Metadata } from "next";
import { AppHeader } from "@/components/app/app-header";
import { DashboardHome } from "@/components/app/dashboard-home";

export const metadata: Metadata = {
  title: "내 대시보드 — GEO 스나이퍼",
  robots: { index: false },
};

// `/app/dashboard` — 운영자가 켜 준 계정의 대시보드 (T-33, D-27)
export default function DashboardPage() {
  return (
    <main className="page-glow flex-1 pb-16">
      <AppHeader step="대시보드" />
      <div className="mx-auto max-w-3xl px-4 pt-10 md:pt-14">
        <DashboardHome />
      </div>
    </main>
  );
}
