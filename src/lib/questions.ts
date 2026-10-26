// 추천 질문 후보 (D-10): 🎯 공략형 5 + 🏔 장기형 5, 질문마다 추천 이유 한 줄.
// 회원은 종류와 상관없이 5개를 골라(고쳐서) 확정한다. 브라우저와 서버가 함께 쓰는 모양 정의.

export type CandidateStrategy = "quick_win" | "long_term";
export type QuestionStrategy = CandidateStrategy | "custom";

export type Candidate = {
  id: string;
  strategy: QuestionStrategy;
  text: string; // 지금 쓰는 글 (고쳤으면 고친 글)
  rationale: string; // AI 의 추정 — 화면에 "예상"으로 표시 (직접 쓴 질문은 빈 글)
  generatedText?: string; // AI 가 처음 만든 원본 (고치기 전)
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

// 하나만 다시 만들기: 같은 종류로, 이미 화면에 있는 질문과 겹치지 않게
export type ReplaceRequest = {
  strategy: CandidateStrategy;
  exclude: string[];
};

export const CANDIDATES_PER_STRATEGY = 5;
export const PICK_COUNT = 5; // 진단에 쓰는 질문 수 (D-10)
export const MAX_CUSTOM = 5; // 직접 쓴 질문 최대 (DB: 브랜드당 후보 15개)
export const QUESTION_MIN = 2;
export const QUESTION_MAX = 200;

// 입력이 바뀌었는지 알아보는 열쇠 (브랜드 · 카테고리 · 기준 브랜드가 같으면 같은 후보를 다시 쓴다)
export function suggestKey(input: SuggestInput): string {
  return JSON.stringify([input.name.trim(), input.category.trim(), input.benchmarkBrands.map((b) => b.trim())]);
}

export function isValidQuestionText(text: string): boolean {
  const t = text.trim();
  return t.length >= QUESTION_MIN && t.length <= QUESTION_MAX;
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

export function isValidReplaceRequest(v: unknown): v is ReplaceRequest {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    (o.strategy === "quick_win" || o.strategy === "long_term") &&
    Array.isArray(o.exclude) &&
    o.exclude.length <= 20 &&
    o.exclude.every((t) => typeof t === "string" && t.length <= QUESTION_MAX)
  );
}
