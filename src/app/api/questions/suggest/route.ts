import { replaceQuestion, suggestQuestions } from "@/lib/ai/suggest-questions";
import { isValidReplaceRequest, isValidSuggestInput } from "@/lib/questions";

// 추천 질문 후보 만들기 (T-07) · 하나만 다시 만들기 (T-08).
// 로그인 없이 부른다 (D-03). 외부 AI 호출은 서버에서만.
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "요청 형식이 올바르지 않아요." }, { status: 400 });
  }
  if (!isValidSuggestInput(body)) {
    return Response.json({ error: "브랜드명과 카테고리를 확인해 주세요." }, { status: 400 });
  }
  const input = {
    name: body.name.trim(),
    category: body.category.trim(),
    benchmarkBrands: body.benchmarkBrands.map((b) => b.trim()).filter(Boolean),
  };
  const replace = (body as { replace?: unknown }).replace;
  if (replace !== undefined && !isValidReplaceRequest(replace)) {
    return Response.json({ error: "다시 만들 질문 정보를 확인해 주세요." }, { status: 400 });
  }
  try {
    const result = replace ? await replaceQuestion(input, replace) : await suggestQuestions(input);
    return Response.json(result);
  } catch {
    return Response.json({ error: "질문을 만들지 못했어요. 잠시 후 다시 시도해 주세요." }, { status: 502 });
  }
}
