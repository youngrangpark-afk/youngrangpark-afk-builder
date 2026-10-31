import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { nameKey } from "@/lib/diagnosis/analyze";

// 브랜드 다른 표기 자동 찾기 (D-26). 고객은 이름 하나만 넣고, 같은 브랜드로 셀 표기는 우리가 찾는다.
//   ① 사이트 주소: hoteldawson.com → "hoteldawson" (키 없이도)
//   ② Claude: 한글 ↔ 영문 표기 · 흔한 다른 표기 (ANTHROPIC_API_KEY 가 있을 때)
// 띄어쓰기 · 대소문자만 다른 표기는 analyze.ts 가 알아서 같게 보므로 목록에 넣지 않는다 (D-25).

const MAX_ALIASES = 8;

// 쇼핑몰 · SNS 주소는 브랜드 이름이 아니라 플랫폼 이름이라 뺀다
const PLATFORM_HOSTS = /(^|\.)(naver|coupang|instagram|kakao|facebook|youtube|musinsa|29cm|ohou|idus|wadiz|notion|linktr|oliveyoung|kurly|ssg|gmarket|11st|auction)\./;

export function aliasesAreLive() {
  return !!process.env.ANTHROPIC_API_KEY;
}

function fromDomain(domain: string | null): string[] {
  if (!domain || PLATFORM_HOSTS.test(`.${domain}.`)) return [];
  const label = domain.replace(/^www\./, "").split(".")[0];
  return label && label.length >= 3 ? [label] : [];
}

const AliasList = z.object({
  aliases: z.array(z.string()).describe("같은 브랜드의 다른 표기. 확실하지 않으면 빈 목록"),
});

async function fromClaude(input: { name: string; category: string; domain: string | null }): Promise<string[]> {
  const client = new Anthropic();
  const message = await client.beta.messages.parse({
    model: "claude-opus-5-5",
    max_tokens: 2000,
    output_config: { effort: "low", format: betaZodOutputFormat(AliasList) },
    // 안전 분류기가 거절하면 서버가 다른 모델로 다시 시도한다
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system:
      "You help a brand-monitoring tool recognize a brand when ChatGPT or Gemini mention it in Korean or English answers. " +
      "Given a brand name, list other ways the SAME brand is likely written: the Korean hangul form if the name is in English, " +
      "the most likely official English/romanized form if the name is in Korean, and well-known official variants. " +
      "Do not list spacing or capitalization variants. Do not list generic words, product types, the category, or other brands. " +
      "If you are unsure what the brand is, give only the single most natural transliteration. At most 4 items.",
    messages: [
      {
        role: "user",
        content: `브랜드명: ${input.name}\n카테고리: ${input.category}\n사이트: ${input.domain ?? "(없음)"}`,
      },
    ],
  });
  if (message.stop_reason === "refusal") return [];
  return message.parsed_output?.aliases ?? [];
}

// 입력한 이름 · 서로와 겹치지 않는 표기만 남긴다
export async function findBrandAliases(input: {
  name: string;
  category: string;
  domain: string | null;
}): Promise<{ aliases: string[]; usedAi: boolean }> {
  let ai: string[] = [];
  let usedAi = false;
  if (aliasesAreLive()) {
    try {
      ai = await fromClaude(input);
      usedAi = true;
    } catch (e) {
      // 찾지 못해도 진단은 계속한다 (사이트 주소 표기만 사용)
      console.error("brand-aliases: Claude 호출 실패", e instanceof Anthropic.APIError ? e.status : e);
    }
  }
  const seen = new Set([nameKey(input.name)]);
  const out: string[] = [];
  for (const raw of [...ai, ...fromDomain(input.domain)]) {
    const a = raw.trim().slice(0, 50);
    const key = nameKey(a);
    if (key.length < 2 || seen.has(key)) continue;
    seen.add(key);
    out.push(a);
  }
  return { aliases: out.slice(0, MAX_ALIASES), usedAi };
}
