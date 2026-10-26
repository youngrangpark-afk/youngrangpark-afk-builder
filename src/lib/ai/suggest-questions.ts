import "server-only";
import type { Candidate, ReplaceRequest, SuggestInput, SuggestResult } from "@/lib/questions";

// ★ 실제 키로 바꿀 지점은 이 파일 하나다.
// ANTHROPIC_API_KEY 가 없으면 연습용 예시(mock)를 돌려준다.
// 키를 넣을 때 할 일 (TASKS T-07 "실제 연결 대기"):
//   1) Claude Sonnet 5.5 로 후보 10개 + 이유를 JSON 으로 받기 (question_templates 를 참고 자료로 넘김)
//   2) 로그인 전 생성의 하루 상한 (usage_counters, D-03) — 숫자를 원자적으로 올리는 DB 함수가 필요해 DB.md 확인 후 migration
export async function suggestQuestions(input: SuggestInput): Promise<SuggestResult> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { isMock: true, candidates: mockCandidates(input) };
  }
  // 실제 연결 전까지는 키가 있어도 예시로 돌려준다 (상한 없이 실제 비용이 나가지 않게).
  return { isMock: true, candidates: mockCandidates(input) };
}

// 질문 하나만 다시 만들기 (T-08). 같은 종류로, 화면에 있는 질문과 겹치지 않게.
export async function replaceQuestion(input: SuggestInput, req: ReplaceRequest): Promise<SuggestResult> {
  const exclude = new Set(req.exclude.map((t) => t.trim()));
  const pool = [...mockCandidates(input), ...mockAlternatives(input)].filter((c) => c.strategy === req.strategy);
  const pick = pool.find((c) => !exclude.has(c.text));
  if (!pick) return { isMock: true, candidates: [] };
  return { isMock: true, candidates: [{ ...pick, id: `${req.strategy}-${Date.now().toString(36)}` }] };
}

// 다시 만들기용 예비 질문 (연습용 예시)
function mockAlternatives({ category }: SuggestInput): Candidate[] {
  const c = category.trim();
  const home = /향|프래그런스|프레그런스|프레이그런스|디퓨저|캔들|퍼퓸|사쉐/.test(c);
  const quick: [string, string][] = home
    ? [
        ["5만원 이하 집들이 선물 세트 추천해 줘", "세트 · 가격 조건이 붙으면 단품 위주 대형 브랜드가 덜 나와요"],
        ["향이 오래가는 차량용 디퓨저 추천해 줘", "쓰는 장소가 다른 질문은 경쟁 브랜드 구성이 달라요"],
        ["비건 · 천연 원료 디퓨저 브랜드 있어?", "원료 조건은 상세페이지 정보로 답이 갈려요"],
      ]
    : [
        [`비건 ${c} 브랜드 추천해 줘`, "원료 · 가치 조건은 상세페이지 정보로 답이 갈려요"],
        [`10만원 이하 ${c} 선물 세트 추천해 줘`, "세트 · 가격 조건이 붙으면 대형 브랜드가 덜 나와요"],
        [`20대가 좋아하는 ${c} 브랜드 알려 줘`, "대상을 좁힌 질문은 비교 대상이 적어요"],
      ];
  const long: [string, string][] = home
    ? [
        ["디퓨저 브랜드 어디가 좋아?", "가장 넓은 질문 — 오래 쌓여야 들어갈 수 있어요"],
        ["향 좋은 캔들 브랜드 추천해 줘", "인접 제품군 대표 질문이라 길게 보고 잡아야 해요"],
      ]
    : [
        [`요즘 인기 있는 ${c} 브랜드 뭐야?`, "가장 넓은 질문 — 오래 쌓여야 들어갈 수 있어요"],
        [`${c} 브랜드 어디가 좋아?`, "대표 질문이라 길게 보고 잡아야 해요"],
      ];
  return [
    ...quick.map(([text, rationale], i) => ({ id: `qa${i}`, strategy: "quick_win" as const, text, rationale })),
    ...long.map(([text, rationale], i) => ({ id: `la${i}`, strategy: "long_term" as const, text, rationale })),
  ];
}

// 카테고리 · 기준 브랜드로 그럴듯한 한국어 질문을 만드는 연습용 예시. 실제 노출 가능성 판단이 아니다.
function mockCandidates({ category, benchmarkBrands }: SuggestInput): Candidate[] {
  const c = category.trim();
  const bench = benchmarkBrands.map((b) => b.trim()).filter(Boolean);
  const home = /향|프래그런스|프레그런스|프레이그런스|디퓨저|캔들|퍼퓸|사쉐/.test(c);

  const quick: [string, string][] = home
    ? [
        ["3만원대 집들이 선물 디퓨저 추천해 줘", "상황 + 가격대가 함께 들어간 질문은 대형 브랜드 언급이 줄어드는 편이에요"],
        ["우디 향 패브릭 퍼퓸 추천해 줘", "향 계열로 좁힌 질문은 특징이 분명한 신생 브랜드가 들어갈 틈이 있어요"],
        ["선물하기 좋은 니치 사쉐 브랜드 알려 줘", "제품 종류가 좁을수록 비교 대상이 적어요"],
        ["원룸에 어울리는 은은한 디퓨저 추천해 줘", "공간 · 사용 상황을 짚는 질문은 상세페이지 정보로 답이 갈려요"],
        [
          bench[0] ? `${bench[0]} 같은 분위기의 국내 디퓨저 브랜드 있어?` : "감성적인 국내 디퓨저 브랜드 추천해 줘",
          bench[0] ? "기준 브랜드와 함께 묶이는 질문이라 같은 목록에 오를 기회가 있어요" : "‘국내 · 감성’ 조건은 해외 대형 브랜드를 걸러 줘요",
        ],
      ]
    : [
        [`3만원대 선물용 ${c} 추천해 줘`, "상황 + 가격대가 함께 들어간 질문은 대형 브랜드 언급이 줄어드는 편이에요"],
        [`요즘 새로 나온 ${c} 브랜드 알려 줘`, "‘새로 나온’ 조건은 신생 브랜드에 유리해요"],
        [`가성비 좋은 국내 ${c} 브랜드 추천해 줘`, "‘국내 · 가성비’ 조건은 비교 대상을 좁혀요"],
        [`${c} 처음 사는 사람한테 추천할 브랜드 있어?`, "입문자 질문은 설명이 친절한 브랜드 사이트 글이 자주 인용돼요"],
        [
          bench[0] ? `${bench[0]} 말고 비슷한 ${c} 브랜드 있어?` : `개성 있는 ${c} 브랜드 추천해 줘`,
          bench[0] ? "기준 브랜드와 함께 묶이는 질문이라 같은 목록에 오를 기회가 있어요" : "‘개성 있는’ 조건은 대표 브랜드만 나오는 걸 막아 줘요",
        ],
      ];

  const long: [string, string][] = home
    ? [
        ["니치 프래그런스 브랜드 추천해 줘", "카테고리 대표 질문이라 지금은 경쟁이 세지만 꼭 잡아야 해요"],
        ["집들이 선물 디퓨저 추천해 줘", "가장 많이 묻는 선물 질문 — 장기적으로 노출이 쌓여야 해요"],
        ["고급 디퓨저 브랜드 순위 알려 줘", "순위형 질문은 언론 · 매거진 출처가 쌓여야 들어갈 수 있어요"],
        [bench[1] ? `${bench[1]} 랑 비슷한 브랜드 뭐 있어?` : "향 좋은 디퓨저 브랜드 추천해 줘", "기준 브랜드 옆자리를 노리는 질문이에요"],
        ["선물용 캔들 · 디퓨저 브랜드 비교해 줘", "비교형 질문은 여러 출처가 필요해 시간이 걸려요"],
      ]
    : [
        [`${c} 브랜드 추천해 줘`, "카테고리 대표 질문이라 지금은 경쟁이 세지만 꼭 잡아야 해요"],
        [`${c} 브랜드 순위 알려 줘`, "순위형 질문은 언론 · 매거진 출처가 쌓여야 들어갈 수 있어요"],
        [`선물하기 좋은 ${c} 추천해 줘`, "가장 많이 묻는 선물 질문 — 장기적으로 노출이 쌓여야 해요"],
        [bench[1] ? `${bench[1]} 랑 비슷한 브랜드 뭐 있어?` : `믿을 만한 ${c} 브랜드 알려 줘`, "대표 브랜드 옆자리를 노리는 질문이에요"],
        [`${c} 브랜드 비교해 줘`, "비교형 질문은 여러 출처가 필요해 시간이 걸려요"],
      ];

  return [
    ...quick.map(([text, rationale], i) => ({ id: `q${i + 1}`, strategy: "quick_win" as const, text, rationale })),
    ...long.map(([text, rationale], i) => ({ id: `l${i + 1}`, strategy: "long_term" as const, text, rationale })),
  ];
}
