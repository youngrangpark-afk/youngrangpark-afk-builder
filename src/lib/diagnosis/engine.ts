import "server-only";
import { ApiError, GoogleGenAI } from "@google/genai";
import type { Json } from "@/lib/database.types";

// ★ 엔진(ChatGPT · Gemini) 호출을 실제 키로 바꿀 지점은 이 파일 하나다 (T-12 · T-13, D-01 웹 검색 켬).
// D-30: Gemini 는 키가 있으면 실제(Google 검색 그라운딩, 무료 등급). ChatGPT 는 아직 연결 전.
// 실제로 물을 수 있는 엔진이 하나도 없을 때만 연습용 예시 답변을 쓴다 (가짜와 실제 숫자를 섞지 않는다).

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

export const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-3.5-flash-lite";

// 실제로 물을 수 있는 엔진. ChatGPT 는 실제 호출을 만들면 여기에 추가한다.
export function liveEngines(): EngineName[] {
  return process.env.GEMINI_API_KEY ? ["gemini"] : [];
}

export function enginesAreLive(): boolean {
  return liveEngines().length > 0;
}

export async function askEngine(input: EngineInput): Promise<EngineAnswer> {
  if (input.engine === "gemini" && process.env.GEMINI_API_KEY) return askGemini(input.question);
  return mockAnswer(input);
}

// 무료 등급은 분당 요청 수가 적어, 너무 많다고(429) 하면 잠깐 쉬었다 다시 묻는다
export async function withGeminiRetry<T>(call: () => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await call();
    } catch (e) {
      if (!(e instanceof ApiError) || e.status !== 429 || attempt >= 2) throw e;
      await new Promise((r) => setTimeout(r, 8000 * (attempt + 1)));
    }
  }
}

// 그라운딩 출처의 주소는 구글 중계 주소라, 제목에 담긴 도메인(예: blog.naver.com)을 쓴다
const DOMAIN_LIKE = /^(?:[a-z0-9-]+\.)+[a-z]{2,}$/i;

async function askGemini(question: string): Promise<EngineAnswer> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const res = await withGeminiRetry(() =>
    ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: question,
      config: { tools: [{ googleSearch: {} }] },
    }),
  );
  const meta = res.candidates?.[0]?.groundingMetadata;
  const citations = (meta?.groundingChunks ?? [])
    .map((c) => c.web)
    .filter((w): w is NonNullable<typeof w> => !!w?.uri)
    .map((w) => {
      const title = w.title?.trim() ?? "";
      return { url: DOMAIN_LIKE.test(title) ? `https://${title.toLowerCase()}/` : w.uri!, title: title || null, redirect: w.uri! };
    });
  return {
    model: res.modelVersion ?? GEMINI_MODEL,
    answerText: res.text ?? "",
    rawResponse: { citations, searchQueries: meta?.webSearchQueries ?? [] } as Json,
    requestMeta: { search: "google_search", language: "ko" },
  };
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
