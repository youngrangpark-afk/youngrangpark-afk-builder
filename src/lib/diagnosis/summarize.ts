import "server-only";
import {
  sourceTypeLabel,
  type BrandRole,
  type Engine,
  type ReportData,
  type SourceType,
  type Strategy,
} from "@/lib/report/types";

// 리포트 집계 (T-15) · 할 일 카드 3개 고르기 (T-16).
// 집계는 원본 표(작업 칸 · 답변 · 언급 · 출처)에서 언제든 다시 계산할 수 있다 (DB.md 함정 3).

type Item = { id: string; question_position: number; question_text: string; question_strategy: string; engine: string };
type Answer = { id: string; item_id: string; answer_text: string };
type MentionRow = { answer_id: string; brand_name: string; role: string; description: string | null };
type CitationRow = { answer_id: string; domain: string; source_type: string };

export type CardRow = { position: number; card_type: string; title: string; body: string; evidence: string };

const CARD_NAMES: Record<string, string> = {
  site_info: "사이트 정보 보강",
  faq_content: "FAQ 콘텐츠",
  external_mention: "외부 언급 확보",
  review_community: "리뷰 · 커뮤니티 노출",
  shopping_listing: "쇼핑 검색 등록",
  press_release: "보도자료 배포",
};

export function buildReport(input: {
  isMock: boolean;
  createdAt: string;
  repeats: number;
  brand: { name: string; category: string; site_domain: string | null };
  items: Item[];
  answers: Answer[];
  mentions: MentionRow[];
  citations: CitationRow[];
}): { report: ReportData; cards: CardRow[] } {
  const { items, answers, mentions, citations } = input;
  const itemOf = new Map(items.map((i) => [i.id, i]));
  const answerItem = new Map(answers.map((a) => [a.id, itemOf.get(a.item_id)!]));
  const mentionsBy = group(mentions, (m) => m.answer_id);
  const engines = (["openai", "gemini"] as Engine[]).filter((e) => items.some((i) => i.engine === e));

  // ① 질문별 · 엔진별 내 브랜드 노출
  const positions = [...new Set(items.map((i) => i.question_position))].sort((a, b) => a - b);
  const questions = positions.map((position) => {
    const first = items.find((i) => i.question_position === position)!;
    const hits = { openai: 0, gemini: 0 } as Record<Engine, number>;
    for (const a of answers) {
      const it = answerItem.get(a.id);
      if (it?.question_position === position && (mentionsBy.get(a.id) ?? []).some((m) => m.role === "self")) {
        hits[it.engine as Engine] += 1;
      }
    }
    return { position, strategy: first.question_strategy as Strategy, text: first.question_text, hits };
  });

  // ② 브랜드별 언급 (답변 1개에 여러 번 나와도 1)
  const brandMap = new Map<string, { name: string; role: BrandRole; count: number; description: string }>();
  for (const m of mentions) {
    const b = brandMap.get(m.brand_name) ?? { name: m.brand_name, role: m.role as BrandRole, count: 0, description: "" };
    b.count += 1;
    if (!b.description && m.description) b.description = m.description;
    brandMap.set(m.brand_name, b);
  }
  if (![...brandMap.values()].some((b) => b.role === "self")) {
    brandMap.set(input.brand.name, { name: input.brand.name, role: "self", count: 0, description: "아직 AI 답변에 나오지 않았어요." });
  }
  const brands = [...brandMap.values()].sort((a, b) => b.count - a.count);

  // ③ 경쟁 · 기준 브랜드가 나온 답변에서 인용된 출처 (매체 종류별)
  const rivalAnswers = new Set(mentions.filter((m) => m.role !== "self").map((m) => m.answer_id));
  const typeMap = new Map<SourceType, { count: number; domains: Map<string, number> }>();
  for (const c of citations) {
    if (!rivalAnswers.has(c.answer_id)) continue;
    const t = typeMap.get(c.source_type as SourceType) ?? { count: 0, domains: new Map() };
    t.count += 1;
    t.domains.set(c.domain, (t.domains.get(c.domain) ?? 0) + 1);
    typeMap.set(c.source_type as SourceType, t);
  }
  const citationList = [...typeMap.entries()]
    .map(([type, t]) => ({
      type,
      count: t.count,
      examples: [...t.domains.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([d]) => d),
    }))
    .sort((a, b) => b.count - a.count);

  // ④ 원문 보기 — 질문 × 엔진마다 첫 답변
  const rawAnswers: ReportData["rawAnswers"] = [];
  for (const position of positions) {
    for (const engine of engines) {
      const a = answers.find((x) => {
        const it = answerItem.get(x.id);
        return it?.question_position === position && it.engine === engine;
      });
      if (!a) continue;
      const it = answerItem.get(a.id)!;
      const sources = [...new Set(citations.filter((c) => c.answer_id === a.id).map((c) => c.domain))];
      rawAnswers.push({ question: it.question_text, engine, text: a.answer_text, sources });
    }
  }

  const cards = pickCards({ questions, brands, citations: citationList, repeats: input.repeats, engines: engines.length });
  const report: ReportData = {
    isMock: input.isMock,
    brand: { name: input.brand.name, category: input.brand.category, domain: input.brand.site_domain ?? "" },
    runDate: new Date(new Date(input.createdAt).getTime() + 9 * 3600e3).toISOString().slice(0, 10),
    engines,
    repeats: input.repeats,
    searchMode: input.isMock
      ? "웹 검색 켬 조건 (연습용 예시 답변)"
      : "웹 검색 켬 (ChatGPT 웹 검색 · Gemini Google 검색 그라운딩)",
    questions,
    brands,
    citations: citationList,
    taskCards: cards.map((c, i) => ({
      type: CARD_NAMES[c.card_type] ?? c.card_type,
      title: c.title,
      checks: c.body.split("\n").filter(Boolean),
      evidence: c.evidence,
      highlight: i === 0,
    })),
    rawAnswers,
  };
  return { report, cards };
}

// 할 일 카드 고르는 규칙 (T-16): 진단 데이터 → 카드 유형. 누구에게나 같은 조언이 나오지 않게 근거 숫자를 함께 남긴다.
function pickCards(d: {
  questions: ReportData["questions"];
  brands: ReportData["brands"];
  citations: ReportData["citations"];
  repeats: number;
  engines: number;
}): CardRow[] {
  const picked: Omit<CardRow, "position">[] = [];
  const add = (c: Omit<CardRow, "position">) => {
    if (!picked.some((p) => p.card_type === c.card_type)) picked.push(c);
  };
  const totalCites = d.citations.reduce((s, c) => s + c.count, 0);
  const typeCard = (type: SourceType, count: number, examples: string[]): Omit<CardRow, "position"> => {
    const label = sourceTypeLabel[type];
    const pct = Math.round((count / Math.max(totalCites, 1)) * 100);
    const evidence = `경쟁 · 기준 브랜드 인용 출처의 ${pct}%가 ${label} (${totalCites}곳 중 ${count}곳)`;
    const where = examples.length ? ` (예: ${examples.join(", ")})` : "";
    switch (type) {
      case "community":
        return { card_type: "review_community", title: "후기가 쌓이는 커뮤니티에 브랜드 이야기 만들기", body: `자주 인용된 커뮤니티 확인${where}\n실사용 후기를 남겨 줄 고객 찾기`, evidence };
      case "shopping":
        return { card_type: "shopping_listing", title: "쇼핑 검색에 상품 정보 정확히 등록하기", body: `자주 인용된 쇼핑 검색 확인${where}\n가격 · 용량 · 특징을 빠짐없이 등록`, evidence };
      case "press":
        return { card_type: "press_release", title: "런칭 소식을 기사로 남기기", body: `자주 인용된 언론 확인${where}\n보도자료 한 장 준비`, evidence };
      case "brand_site":
        return { card_type: "faq_content", title: "브랜드 사이트에 질문에 답하는 글 올리기", body: "AI 가 인용한 브랜드 사이트 글 살펴보기\n질문 그대로를 제목으로 한 글 쓰기", evidence };
      default:
        return { card_type: "external_mention", title: `자주 인용된 ${label}에 소개 자료 보내기`, body: `인용이 많은 ${label} 목록 확인${where}\n제품 특징 · 가격 · 쓰는 상황이 담긴 소개 자료 준비`, evidence };
    }
  };

  // ① 가장 많이 인용된 매체 종류
  if (d.citations[0]) add(typeCard(d.citations[0].type, d.citations[0].count, d.citations[0].examples));

  // ② 이미 가끔 나오는 공략형 질문 = 가장 가까운 기회
  const asks = d.repeats * d.engines;
  const quick = d.questions
    .filter((q) => q.strategy === "quick_win")
    .map((q) => ({ q, hits: q.hits.openai + q.hits.gemini }))
    .sort((a, b) => b.hits - a.hits);
  const near = quick.find((x) => x.hits > 0 && x.hits < asks) ?? quick[0];
  if (near) {
    add({
      card_type: "faq_content",
      title: `“${near.q.text}” 질문에 답하는 글 올리기`,
      body: "질문 그대로를 제목으로\n가격 · 용량 · 특징을 표로 정리",
      evidence:
        near.hits > 0
          ? `질문 ${near.q.position}에서 이미 ${asks}번 중 ${near.hits}번 노출 — 가장 가까운 기회`
          : `질문 ${near.q.position}에서 아직 ${asks}번 중 0번 — 답이 될 글부터 만들어 두기`,
    });
  }

  // ③ AI 가 우리를 어떻게 설명하나
  const self = d.brands.find((b) => b.role === "self");
  add({
    card_type: "site_info",
    title: "상세페이지에 제품 특징과 쓰는 상황 정리하기",
    body: "제품 특징 · 지속 시간 같은 구체 정보 적기\n어울리는 공간 · 선물 상황 적기",
    evidence:
      !self || self.count === 0
        ? "AI 답변에 우리 브랜드가 아직 한 번도 나오지 않았어요"
        : `AI 답변 ${d.questions.length * asks}개 중 ${self.count}개에서 우리가 나왔어요 — 가장 많이 나온 경쟁 브랜드는 ${Math.max(0, ...d.brands.filter((b) => b.role !== "self").map((b) => b.count))}개`,
  });

  // ④ 두 번째로 많이 인용된 매체 종류 (앞에서 같은 유형이 나왔으면 건너뜀)
  for (const c of d.citations.slice(1)) {
    if (picked.length >= 3) break;
    add(typeCard(c.type, c.count, c.examples));
  }
  // ⑤ 그래도 3장이 안 되면 (인용 출처가 거의 없을 때)
  if (picked.length < 3) {
    add({
      card_type: "external_mention",
      title: "블로그 · 매거진에 소개 자료 보내기",
      body: "카테고리 추천 글을 쓰는 블로그 · 매거진 찾기\n제품 특징 · 가격 · 쓰는 상황이 담긴 소개 자료 준비",
      evidence: `이번 진단에서 인용 출처가 ${totalCites}곳뿐이에요 — AI 가 참고할 외부 글부터 만들어야 해요`,
    });
  }
  return picked.slice(0, 3).map((c, i) => ({ ...c, position: i + 1 }));
}

function group<T>(rows: T[], key: (r: T) => string): Map<string, T[]> {
  const m = new Map<string, T[]>();
  for (const r of rows) m.set(key(r), [...(m.get(key(r)) ?? []), r]);
  return m;
}
