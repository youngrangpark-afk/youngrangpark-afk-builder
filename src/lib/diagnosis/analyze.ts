import "server-only";
import type { Json } from "@/lib/database.types";
import type { BrandRole, SourceType } from "@/lib/report/types";

// 답변 분석 (T-14): 답변 원문에서 ① 언급된 브랜드와 AI 가 설명한 문장 ② 인용 출처를 뽑는다.
// ★ 실제 연결 지점: Anthropic 키가 생기면 브랜드 추출을 Claude(구조화 출력)로 바꾼다.
//   지금은 규칙 기반 — 내 브랜드 · 기준 브랜드는 이름으로, 경쟁사는 연습용 예시의 "브랜드 X" 모양으로 찾는다.

export type Mention = { brandName: string; role: BrandRole; rank: number; description: string | null };
export type Citation = { url: string; domain: string; title: string | null; sourceType: SourceType };

type Context = { selfName: string; selfDomain: string | null; benchmarks: string[] };

export function analyzeAnswer(answerText: string, raw: Json | null, ctx: Context) {
  return { mentions: findMentions(answerText, ctx), citations: findCitations(answerText, raw, ctx) };
}

function findMentions(text: string, { selfName, benchmarks }: Context): Mention[] {
  const found: { name: string; role: BrandRole; at: number }[] = [];
  const add = (name: string, role: BrandRole) => {
    const at = text.indexOf(name);
    if (name && at >= 0 && !found.some((f) => f.name === name)) found.push({ name, role, at });
  };
  add(selfName.trim(), "self");
  for (const b of benchmarks) add(b.trim(), "benchmark");
  // 경쟁사 자동 추출 (D-02) — 연습용 예시 답변의 "브랜드 A/B/C" 표기. 실제 연결 때 Claude 추출로 바뀐다.
  // 내 브랜드 · 기준 브랜드 이름 안에 든 글자(예: "기준 브랜드 D" 속 "브랜드 D")는 경쟁사로 세지 않는다.
  let rest = text;
  for (const name of [selfName, ...benchmarks].map((n) => n.trim()).filter(Boolean)) {
    rest = rest.split(name).join(" ".repeat(name.length));
  }
  for (const m of rest.matchAll(/브랜드 [A-Z]\b/g)) add(m[0], "competitor");

  return found
    .sort((a, b) => a.at - b.at)
    .map((f, i) => ({ brandName: f.name, role: f.role, rank: i + 1, description: sentenceAround(text, f.at) }));
}

// 브랜드가 나온 문장 하나 (앞뒤 마침표 · 줄바꿈 기준)
function sentenceAround(text: string, at: number): string | null {
  const dot = text.lastIndexOf(". ", at);
  const nl = text.lastIndexOf("\n", at);
  const start = Math.max(dot >= 0 ? dot + 2 : 0, nl >= 0 ? nl + 1 : 0);
  const endDot = text.indexOf(". ", at);
  const sentence = text
    .slice(start, endDot >= 0 ? endDot + 1 : undefined)
    .replace(/^\[연습용 예시\]\s*/, "")
    .trim();
  return sentence ? sentence.slice(0, 200) : null;
}

function findCitations(text: string, raw: Json | null, { selfDomain }: Context): Citation[] {
  const urls = new Map<string, { url: string; title: string | null }>();
  // ① API 응답에 들어 있는 인용 목록 (엔진마다 모양이 달라 실제 연결 때 맞춘다)
  const list = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, Json>).citations : null;
  if (Array.isArray(list)) {
    for (const c of list) {
      if (c && typeof c === "object" && !Array.isArray(c) && typeof c.url === "string") {
        urls.set(c.url, { url: c.url, title: typeof c.title === "string" ? c.title : null });
      }
    }
  }
  // ② 본문에 그대로 적힌 주소
  for (const m of text.matchAll(/\b(?:https?:\/\/)?((?:[a-z0-9-]+\.)+[a-z]{2,})(\/[^\s,)]*)?/gi)) {
    const url = m[0].startsWith("http") ? m[0] : `https://${m[0]}`;
    if (![...urls.values()].some((u) => domainOf(u.url) === domainOf(url))) urls.set(url, { url, title: null });
  }
  return [...urls.values()].map(({ url, title }) => {
    const domain = domainOf(url);
    return { url, domain, title, sourceType: classify(domain, selfDomain) };
  });
}

function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

// 매체 종류 나누기 (규칙). 실제 출처가 쌓이면 국내 주요 매체 목록으로 다듬는다.
export function classify(domain: string, selfDomain: string | null): SourceType {
  if (selfDomain && (domain === selfDomain || domain.endsWith(`.${selfDomain}`))) return "brand_site";
  if (/(^|\.)(blog\.naver\.com|tistory\.com|brunch\.co\.kr|velog\.io)$/.test(domain) || /blog/.test(domain)) return "blog";
  if (/(^|\.)(cafe\.naver\.com|ohou\.se|instiz|theqoo|dcinside|reddit)/.test(domain) || /community|cafe/.test(domain)) return "community";
  if (/(^|\.)(danawa\.com|enuri\.com|shopping\.naver\.com|coupang\.com|musinsa\.com|29cm\.co\.kr|ssg\.com)/.test(domain) || /price|shop|store|mall/.test(domain)) return "shopping";
  if (/magazine|vogue|elle|harpersbazaar|allure|wkorea|cosmopolitan|decor|deco/.test(domain)) return "magazine";
  if (/news|press|chosun|joongang|donga|hankyung|mk\.co\.kr|yna\.co\.kr|hani\.co\.kr|khan\.co\.kr/.test(domain)) return "press";
  if (/^brand-|\.brand\b|official/.test(domain)) return "brand_site";
  return "other";
}
