// 연습용 예시 리포트 (D-11). 실제 진단 결과가 아니다.
// 키가 없을 때의 예시 응답과 디자인 확인용 화면이 함께 쓴다. 브랜드 이름 · 도메인은 모두 가짜.

export type Strategy = "quick_win" | "long_term" | "custom";
export type Engine = "openai" | "gemini";
export type SourceType = "press" | "shopping" | "blog" | "magazine" | "community" | "brand_site" | "other";

export const engineLabel: Record<Engine, string> = { openai: "ChatGPT", gemini: "Gemini" };
export const strategyLabel: Record<Strategy, string> = { quick_win: "공략형", long_term: "장기형", custom: "직접 쓴 질문" };
export const sourceTypeLabel: Record<SourceType, string> = {
  press: "언론",
  shopping: "쇼핑 검색",
  blog: "블로그",
  magazine: "매거진",
  community: "커뮤니티",
  brand_site: "브랜드 사이트",
  other: "기타",
};

export const exampleReport = {
  isMock: true,
  brand: { name: "예시 브랜드", category: "홈프레이그런스", domain: "example-brand.kr" },
  runDate: "2026-10-25",
  engines: ["openai", "gemini"] as Engine[],
  repeats: 3,
  searchMode: "웹 검색 켬 (ChatGPT 웹 검색 · Gemini Google 검색 그라운딩)",
  // 질문별 · 엔진별로 3번 물어 내 브랜드가 나온 횟수
  questions: [
    { position: 1, strategy: "quick_win", text: "3만원대 집들이 선물 디퓨저 추천해 줘", hits: { openai: 2, gemini: 1 } },
    { position: 2, strategy: "quick_win", text: "우디 향 패브릭 퍼퓸 추천해 줘", hits: { openai: 1, gemini: 2 } },
    { position: 3, strategy: "quick_win", text: "선물하기 좋은 니치 사쉐 브랜드 알려 줘", hits: { openai: 2, gemini: 0 } },
    { position: 4, strategy: "long_term", text: "니치 홈프레이그런스 브랜드 추천해 줘", hits: { openai: 0, gemini: 0 } },
    { position: 5, strategy: "long_term", text: "집들이 선물 디퓨저 추천해 줘", hits: { openai: 0, gemini: 1 } },
  ] as { position: number; strategy: Strategy; text: string; hits: Record<Engine, number> }[],
  // 30번의 답변 중 나온 횟수
  brands: [
    { name: "브랜드 A", role: "competitor", count: 26, description: "니치 향수 감성의 대표적인 디퓨저 브랜드로 자주 소개돼요." },
    { name: "기준 브랜드 D", role: "benchmark", count: 22, description: "고급 선물용 홈프레이그런스의 기준처럼 언급돼요." },
    { name: "브랜드 B", role: "competitor", count: 19, description: "가성비 좋은 집들이 선물로 추천돼요." },
    { name: "브랜드 C", role: "competitor", count: 12, description: "패브릭 퍼퓸 쪽에서 주로 나와요." },
    { name: "예시 브랜드", role: "self", count: 9, description: "향이 좋은 신생 브랜드로만 짧게 언급돼요." },
    { name: "기준 브랜드 E", role: "benchmark", count: 8, description: "클래식한 이미지로 가끔 함께 묶여요." },
  ] as { name: string; role: "self" | "benchmark" | "competitor"; count: number; description: string }[],
  // 경쟁 · 기준 브랜드가 추천될 때 인용된 출처
  citations: [
    { type: "blog", count: 14, examples: ["lifestyle-blog.example.com", "home-review.example.net"] },
    { type: "magazine", count: 9, examples: ["deco-magazine.example.com"] },
    { type: "community", count: 7, examples: ["house-community.example.kr"] },
    { type: "shopping", count: 5, examples: ["price-compare.example.co.kr"] },
    { type: "brand_site", count: 4, examples: ["brand-a.example.com"] },
    { type: "press", count: 3, examples: ["news.example.co.kr"] },
  ] as { type: SourceType; count: number; examples: string[] }[],
  taskCards: [
    {
      type: "외부 언급 확보",
      title: "기준 브랜드가 자주 인용된 블로그에 소개 자료 보내기",
      checks: ["자주 인용된 블로그 목록 확인", "향 계열 · 가격이 담긴 소개 자료 준비"],
      evidence: "경쟁 · 기준 브랜드 인용 출처의 33%가 블로그 (42개 중 14개)",
      highlight: true,
    },
    {
      type: "FAQ 콘텐츠",
      title: "“3만원대 집들이 선물” 질문에 답하는 글 올리기",
      checks: ["질문 그대로를 제목으로", "가격 · 용량 · 향을 표로 정리"],
      evidence: "공략형 질문 1에서 이미 6번 중 3번 노출 — 가장 가까운 기회",
      highlight: false,
    },
    {
      type: "사이트 정보 보강",
      title: "상세페이지에 향 계열과 쓰는 공간 정리하기",
      checks: ["향 노트 · 지속 시간 적기", "어울리는 공간 · 선물 상황 적기"],
      evidence: "AI 가 내 브랜드를 “향이 좋은 신생 브랜드”로만 설명 (구체 정보 없음)",
      highlight: false,
    },
  ],
  rawAnswers: [
    {
      question: "3만원대 집들이 선물 디퓨저 추천해 줘",
      engine: "openai" as Engine,
      text: "3만원대 집들이 선물로는 브랜드 B 의 리드 디퓨저, 예시 브랜드의 우디 디퓨저, 브랜드 A 의 미니 세트를 많이 추천해요. 예시 브랜드는 향이 좋은 신생 브랜드로 …",
      sources: ["lifestyle-blog.example.com", "price-compare.example.co.kr"],
    },
    {
      question: "니치 홈프레이그런스 브랜드 추천해 줘",
      engine: "gemini" as Engine,
      text: "대표적인 니치 홈프레이그런스 브랜드로는 브랜드 A, 기준 브랜드 D, 브랜드 C 가 있어요. 선물용으로는 기준 브랜드 D 가 …",
      sources: ["deco-magazine.example.com", "news.example.co.kr"],
    },
  ],
};
