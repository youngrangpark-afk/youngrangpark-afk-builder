import type { Metadata } from "next";
import { AppHeader } from "@/components/app/app-header";
import { ExampleDashboard } from "@/components/app/example-dashboard";

export const metadata: Metadata = {
  title: "예시 대시보드 — GEO 스나이퍼",
  robots: { index: false },
};

// 랜딩의 [예시 리포트 보기] — 리포트와 대시보드를 합친 한 화면의 예시 (D-28). 가짜 데이터.
export default function ExampleReportPage() {
  return (
    <main className="page-glow flex-1 pb-16">
      <AppHeader step="예시" />
      <div className="mx-auto max-w-4xl px-4 pt-4 md:pt-6">
        <ExampleDashboard />
      </div>
    </main>
  );
}
