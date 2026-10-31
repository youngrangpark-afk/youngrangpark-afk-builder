// 연습용 예시 대시보드 (D-27). 실제 진단 결과가 아니다. 브랜드 이름 · 도메인은 모두 가짜.
// 3주 동안 4번 → 6번(목표 7 미달) → 9번(목표 9 달성), 이번 주 목표 9 → 12.

import type { Brand, DashboardData } from "@/components/app/dashboard";
import { nextMonday, thisMondayNineKst } from "@/lib/diagnosis/goals";
import { exampleReport } from "@/lib/mock/example-report";
import type { Json } from "@/lib/database.types";
import type { ReportData } from "@/lib/report/types";

export const exampleBrand: Brand = {
  id: "example",
  name: "예시 브랜드",
  category: "향수/디퓨저",
  auto_mode: true,
  aliases: ["Example Brand"],
  aliases_checked_at: "2026-10-26T00:00:00Z",
};

const WEEK = 7 * 86400e3;

// 질문 5개 × 엔진 2 칸에 노출 수를 앞에서부터 나눠 담는다 (칸마다 최대 3번)
function summaryWith(hits: number): Json {
  let left = hits;
  const questions = exampleReport.questions.map((q) => {
    const openai = Math.min(3, left);
    left -= openai;
    const gemini = Math.min(3, left);
    left -= gemini;
    return { ...q, hits: { openai, gemini } };
  });
  return { ...exampleReport, questions } satisfies ReportData as unknown as Json;
}

export function makeExampleDashboard(now = new Date()): DashboardData {
  const monday = thisMondayNineKst(now).getTime();
  const at = (weeksAgo: number) => new Date(monday - weeksAgo * WEEK).toISOString();
  const day = (iso: string) => iso.slice(0, 10);
  const run = (id: string, weeksAgo: number, hits: number, trigger: string) => ({
    id,
    created_at: at(weeksAgo),
    status: "done",
    trigger,
    done_items: 30,
    total_items: 30,
    summary: summaryWith(hits),
    is_mock: true,
  });
  const goal = (
    id: string,
    weeksAgo: number,
    baseline: number,
    target: number,
    result: { value: number; run: string } | null,
    due: string,
  ) => ({
    id,
    created_at: at(weeksAgo),
    user_id: "example",
    brand_id: "example",
    baseline_run_id: `run-${id}`,
    result_run_id: result?.run ?? null,
    metric: "ai_mentions",
    baseline_value: baseline,
    total: 30,
    target_value: target,
    due_date: due,
    status: result ? (result.value >= target ? "achieved" : "missed") : "active",
    result_value: result?.value ?? null,
    evaluated_at: result ? at(weeksAgo - 1) : null,
  });

  const cardTypes = ["external_mention", "faq_content", "site_info"];
  const drafts = [
    "제목: 【브랜드명】 신제품 소개 자료 드립니다\n\n안녕하세요, 【담당자명】님. 【브랜드명】의 【이름】입니다.\n집들이 선물로 많이 찾는 디퓨저를 만들고 있어 소개 자료를 보내 드려요.\n- 향 계열: 【우디 · 시트러스 등】\n- 가격 · 용량: 【3만원대 · 200ml】\n필요하시면 샘플도 보내 드릴게요.",
    "# 3만원대 집들이 선물 디퓨저, 이렇게 고르세요\n\n| 제품 | 가격 | 용량 | 향 |\n|---|---|---|---|\n| 【제품명】 | 【가격】 | 【용량】 | 【향 노트】 |\n\n집들이 선물로는 【공간 · 상황】에 어울리는 은은한 향이 좋아요…",
    "[상세페이지에 넣을 정보]\n- 향 노트: 탑 【 】 / 미들 【 】 / 베이스 【 】\n- 지속 시간: 【약 ○주】\n- 어울리는 공간: 【거실 · 침실 · 원룸】\n- 선물 상황: 【집들이 · 생일】",
  ];

  return {
    runs: [run("run-g3", 0, 9, "weekly"), run("run-g2", 1, 6, "weekly"), run("run-g1", 2, 4, "manual")],
    goals: [
      goal("g3", 0, 9, 12, null, nextMonday(now)),
      goal("g2", 1, 6, 9, { value: 9, run: "run-g3" }, day(at(0))),
      goal("g1", 2, 4, 7, { value: 6, run: "run-g2" }, day(at(1))),
    ],
    cards: exampleReport.taskCards.map((c, i) => ({
      id: `card-${i + 1}`,
      position: i + 1,
      card_type: cardTypes[i] ?? "site_info",
      title: c.title,
      body: c.checks.join(" · "),
      evidence: c.evidence,
      draft: drafts[i] ?? null,
      status: i === 0 ? "done" : "auto",
    })),
  };
}
