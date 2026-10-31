import type { Metadata } from "next";
import { AppHeader } from "@/components/app/app-header";
import { QuestionsView } from "@/components/app/questions-view";

export const metadata: Metadata = {
  title: "질문 고르기 — GEO 스나이퍼",
  robots: { index: false },
};

// FLOW.md 화면 3 — `/app/questions` (T-07 · T-08 에서 질문 추천 · 고르기를 채운다)
export default function QuestionsPage() {
  return (
    <main className="page-glow flex-1 pb-16">
      <AppHeader step="진단 준비" />
      <div className="mx-auto max-w-xl px-4 pt-10 md:pt-16">
        <QuestionsView />
      </div>
    </main>
  );
}
