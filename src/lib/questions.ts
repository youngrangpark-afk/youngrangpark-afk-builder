// 추천 질문 후보 (D-10): 🎯 공략형 5 + 🏔 장기형 5, 질문마다 추천 이유 한 줄.
// 브라우저와 서버가 함께 쓰는 모양 정의.

export type CandidateStrategy = "quick_win" | "long_term";

export type Candidate = {
  id: string;
  strategy: CandidateStrategy;
  text: string;
  rationale: string; // AI 의 추정 — 화면에 "예상"으로 표시
};

export type SuggestInput = {
  name: string;
  category: string;
  benchmarkBrands: string[];
};

export type SuggestResult = {
  isMock: boolean;
  candidates: Candidate[];
};

export const CANDIDATES_PER_STRATEGY = 5;

// 입력이 바뀌었는지 알아보는 열쇠 (브랜드 · 카테고리 · 기준 브랜드가 같으면 같은 후보를 다시 쓴다)
export function suggestKey(input: SuggestInput): string {
  return JSON.stringify([input.name.trim(), input.category.trim(), input.benchmarkBrands.map((b) => b.trim())]);
}

export function isValidSuggestInput(v: unknown): v is SuggestInput {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  const okText = (s: unknown) => typeof s === "string" && s.trim().length >= 1 && s.trim().length <= 50;
  return (
    okText(o.name) &&
    okText(o.category) &&
    Array.isArray(o.benchmarkBrands) &&
    o.benchmarkBrands.length <= 3 &&
    o.benchmarkBrands.every((b) => typeof b === "string" && b.length <= 50)
  );
}
