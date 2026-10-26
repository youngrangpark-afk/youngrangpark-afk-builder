// 리포트 한 장의 데이터 모양 (T-15 ~ T-17). 예시 리포트와 실제 진단 리포트가 같은 모양을 쓴다.

export type Strategy = "quick_win" | "long_term" | "custom";
export type Engine = "openai" | "gemini";
export type SourceType = "press" | "shopping" | "blog" | "magazine" | "community" | "brand_site" | "other";
export type BrandRole = "self" | "benchmark" | "competitor";

export const engineLabel: Record<Engine, string> = { openai: "ChatGPT", gemini: "Gemini" };
export const sourceTypeLabel: Record<SourceType, string> = {
  press: "언론",
  shopping: "쇼핑 검색",
  blog: "블로그",
  magazine: "매거진",
  community: "커뮤니티",
  brand_site: "브랜드 사이트",
  other: "기타",
};

export type ReportData = {
  isMock: boolean;
  brand: { name: string; category: string; domain: string };
  runDate: string; // YYYY-MM-DD (한국 시간)
  engines: Engine[];
  repeats: number;
  searchMode: string;
  // 질문별 · 엔진별로 repeats 번 물어 내 브랜드가 나온 횟수
  questions: { position: number; strategy: Strategy; text: string; hits: Record<Engine, number> }[];
  // 모든 답변 중 나온 횟수 (답변 1개에 여러 번 나와도 1)
  brands: { name: string; role: BrandRole; count: number; description: string }[];
  // 경쟁 · 기준 브랜드가 추천될 때 인용된 출처
  citations: { type: SourceType; count: number; examples: string[] }[];
  taskCards: { type: string; title: string; checks: string[]; evidence: string; highlight: boolean }[];
  rawAnswers: { question: string; engine: Engine; text: string; sources: string[] }[];
};
