import type { Metadata } from "next";
import { AppHeader } from "@/components/app/app-header";
import { ExampleDashboard } from "@/components/app/example-dashboard";

export const metadata: Metadata = {
  title: "예시 대시보드 — GEO 스나이퍼",
  robots: { index: false },
};

// `/app/dashboard/example` — 연습용 예시 대시보드 (D-27)
export default function ExampleDashboardPage() {
  return (
    <main className="page-glow flex-1 pb-16">
      <AppHeader step="예시 대시보드" />
      <div className="mx-auto max-w-3xl px-4 pt-10 md:pt-14">
        <ExampleDashboard />
      </div>
    </main>
  );
}
