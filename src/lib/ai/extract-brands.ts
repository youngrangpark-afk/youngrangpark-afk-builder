import "server-only";
import { GoogleGenAI } from "@google/genai";
import { GEMINI_MODEL, withGeminiRetry } from "@/lib/diagnosis/engine";

// 실제 답변에서 경쟁 브랜드 이름 뽑기 (T-14, D-30). 진단이 끝날 때 답변 전체를 한 번에 보내 Gemini(무료)로 뽑는다.
// 내 브랜드 · 기준 브랜드는 analyze.ts 가 이름으로 찾으므로 여기서는 그 밖의 브랜드만 돌려받는다.

const schema = {
  type: "object",
  properties: {
    answers: {
      type: "array",
      items: {
        type: "object",
        properties: {
          index: { type: "integer" },
          brands: { type: "array", items: { type: "string" } },
        },
        required: ["index", "brands"],
      },
    },
  },
  required: ["answers"],
};

export async function extractCompetitorBrands(
  answers: string[],
  known: string[],
): Promise<string[][]> {
  if (!process.env.GEMINI_API_KEY || answers.length === 0) return answers.map(() => []);
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const list = answers.map((a, i) => `[${i}]\n${a.slice(0, 2500)}`).join("\n\n");
  const res = await withGeminiRetry(() =>
    ai.models.generateContent({
      model: GEMINI_MODEL,
      contents:
        "아래는 AI 검색 답변들이에요. 답변마다 '추천 · 소개된 상품 브랜드 이름'만 뽑아 주세요.\n" +
        "- 쇼핑몰 · 플랫폼 · 매체 · 블로그 이름(예: 올리브영, 쿠팡, 네이버)은 브랜드가 아니에요.\n" +
        "- 제품 종류 · 성분 · 일반 단어는 빼요. 답변에 쓰인 표기 그대로 적어요.\n" +
        `- 이 이름들은 빼요: ${known.filter(Boolean).join(", ") || "(없음)"}\n\n` +
        list,
      config: { responseMimeType: "application/json", responseJsonSchema: schema },
    }),
  );
  const out: string[][] = answers.map(() => []);
  try {
    const parsed = JSON.parse(res.text ?? "{}") as { answers?: { index: number; brands: string[] }[] };
    for (const a of parsed.answers ?? []) {
      if (Number.isInteger(a.index) && a.index >= 0 && a.index < out.length) {
        out[a.index] = [...new Set((a.brands ?? []).map((b) => b.trim()).filter((b) => b && b.length <= 40))].slice(0, 10);
      }
    }
  } catch {
    // 못 읽으면 경쟁사 칸만 비고 진단은 끝난다
  }
  return out;
}
