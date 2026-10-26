import { Suspense } from "react";
import type { Metadata } from "next";
import { AppHeader } from "@/components/app/app-header";
import { RunProgress } from "@/components/app/run-progress";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "진단 — GEO 스나이퍼",
  robots: { index: false },
};

// FLOW.md 화면 4 — `/app/reports/[번호]` 진행 → 리포트 (T-11: 진행 화면. 리포트는 T-15 부터)
export default function ReportPage() {
  return (
    <main className="page-glow flex-1 pb-16">
      <AppHeader step="3 / 3 · 진단" />
      <div className="mx-auto max-w-xl px-4 pt-10 md:pt-16">
        {/* 주소의 진단 번호는 요청 때 정해지므로 Suspense 안에서 읽는다 (cacheComponents) */}
        <Suspense fallback={<Card className="h-56 animate-pulse rounded-2xl" aria-label="불러오는 중" />}>
          <RunProgress />
        </Suspense>
      </div>
    </main>
  );
}
