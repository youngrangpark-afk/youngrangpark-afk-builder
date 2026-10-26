import "server-only";
import type { Json } from "@/lib/database.types";

// ★ 엔진(ChatGPT · Gemini) 호출을 실제 키로 바꿀 지점은 이 파일 하나다 (T-12 · T-13, D-01 웹 검색 켬).
// 키가 없으면 연습용 예시 답변을 돌려준다.

export type EngineName = "openai" | "gemini";

export type EngineInput = {
  engine: EngineName;
  question: string;
  brandName: string;
  benchmarkBrands: string[];
  seed: string; // 같은 칸이면 같은 예시가 나오게
};

export type EngineAnswer = {
  model: string;
  answerText: string;
  rawResponse: Json | null;
  requestMeta: Json;
};

export function enginesAreLive(): boolean {
  return !!(process.env.OPENAI_API_KEY && process.env.GEMINI_API_KEY);
}

export async function askEngine(input: EngineInput): Promise<EngineAnswer> {
  // 실제 연결 전까지는 키가 있어도 예시로 답한다 (상한 · 비용 확인 전).
  return mockAnswer(input);
}

// 연습용 예시 답변: 가짜 경쟁 브랜드와 예시 출처로 그럴듯한 한 단락을 만든다. 실제 AI 답변이 아니다.
function mockAnswer({ engine, question, brandName, benchmarkBrands, seed }: EngineInput): EngineAnswer {
  const n = [...seed].reduce((s, ch) => (s * 31 + ch.charCodeAt(0)) >>> 0, 7);
  const competitors = ["브랜드 A", "브랜드 B", "브랜드 C"];
  const listed = [competitors[n % 3], competitors[(n + 1) % 3]];
  if (benchmarkBrands[0] && n % 2 === 0) listed.push(benchmarkBrands[0]);
  const mentionsSelf = n % 3 === 0;
  if (mentionsSelf) listed.splice(1, 0, brandName);
  const sources = ["lifestyle-blog.example.com", "deco-magazine.example.com", "price-compare.example.co.kr", "house-community.example.kr"];
  const cited = [sources[n % 4], sources[(n + 2) % 4]];
  const answerText =
    `[연습용 예시] "${question}" 에 대해 많이 추천되는 곳은 ${listed.join(", ")} 이에요. ` +
    `${listed[0]} 는 선물용으로 자주 소개되고, ${listed[1]} 는 향이 은은하다는 평이 많아요. ` +
    `참고 출처: ${cited.join(", ")}`;
  return {
    model: engine === "openai" ? "mock-chatgpt" : "mock-gemini",
    answerText,
    rawResponse: { mock: true, citations: cited.map((d) => ({ url: `https://${d}/`, domain: d })) },
    requestMeta: { search: "web_search", mock: true, language: "ko" },
  };
}
