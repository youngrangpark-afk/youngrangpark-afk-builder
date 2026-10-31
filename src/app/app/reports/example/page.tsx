import type { Metadata } from "next";
import { DashboardBanner } from "@/components/app/dashboard-banner";
import { ReportView } from "@/components/app/report-view";
import { exampleReport } from "@/lib/mock/example-report";

export const metadata: Metadata = {
  title: "예시 리포트 — GEO 스나이퍼",
  robots: { index: false },
};

// 대표 화면 (4단계): FLOW.md 의 리포트 화면을 연습용 예시 데이터로 그린다. 맨 위에서 예시 대시보드로 (D-27).
export default function ExampleReportPage() {
  return (
    <ReportView
      r={exampleReport}
      banner={<DashboardBanner example />}
      footnote="GEO 스나이퍼 · 연습용 예시 리포트 · 실제 브랜드 · 사이트가 아닌 가짜 데이터예요"
    />
  );
}
