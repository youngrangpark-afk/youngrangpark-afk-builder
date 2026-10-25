import { suggestQuestions } from "@/lib/ai/suggest-questions";
import { isValidSuggestInput } from "@/lib/questions";

// 추천 질문 후보 10개 만들기 (T-07). 로그인 없이 부른다 (D-03). 외부 AI 호출은 서버에서만.
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
  try {
    const result = await suggestQuestions({
      name: body.name.trim(),
      category: body.category.trim(),
      benchmarkBrands: body.benchmarkBrands.map((b) => b.trim()).filter(Boolean),
    });
    return Response.json(result);
  } catch {
    return Response.json({ error: "질문을 만들지 못했어요. 잠시 후 다시 시도해 주세요." }, { status: 502 });
  }
}
