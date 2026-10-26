import { enginesAreLive } from "@/lib/diagnosis/engine";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { getServerSupabase } from "@/lib/supabase/server";

// 진단 시작 (T-10 · T-11): 로그인 확인 → 내 브랜드 · 고른 질문 5개 확인 → 계정당 20회 · 전체 하루 50회 → 진단과 작업 칸 만들기
const ENGINES = ["openai", "gemini"] as const;
const REPEATS = 3;
const DAILY_LIMIT = Number(process.env.DIAGNOSIS_DAILY_LIMIT ?? 50);
const PER_USER_LIMIT = Number(process.env.DIAGNOSIS_PER_USER_LIMIT ?? 20);

export async function POST(request: Request) {
  const supabase = await getServerSupabase();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return Response.json({ error: "로그인이 필요해요." }, { status: 401 });

  let brandId: unknown;
  try {
    brandId = ((await request.json()) as { brandId?: unknown }).brandId;
  } catch {
    return Response.json({ error: "요청 형식이 올바르지 않아요." }, { status: 400 });
  }
  if (typeof brandId !== "string") return Response.json({ error: "브랜드를 찾지 못했어요." }, { status: 400 });

  // 본인 권한으로 읽는다 — 남의 브랜드면 RLS 때문에 안 보인다
  const { data: brand } = await supabase.from("brands").select("*").eq("id", brandId).maybeSingle();
  if (!brand) return Response.json({ error: "브랜드를 찾지 못했어요." }, { status: 404 });
  const { data: questions } = await supabase
    .from("questions")
    .select("id, text, strategy, position")
    .eq("brand_id", brand.id)
    .eq("selected", true)
    .order("position");
  if (!questions || questions.length !== 5) {
    return Response.json({ error: "질문 5개를 골라 주세요." }, { status: 400 });
  }

  const admin = getAdminSupabase();
  const brandKey = brand.site_domain || brand.name.toLowerCase().replace(/\s+/g, "");

  // 계정당 진단 횟수 (D-22: 무료 1회 → 계정당 20회)
  const { count: mineCount } = await admin
    .from("diagnosis_runs")
    .select("id", { count: "exact", head: true })
    .eq("user_id", auth.user.id);
  if ((mineCount ?? 0) >= PER_USER_LIMIT) {
    return Response.json({ error: `한 계정은 진단을 ${PER_USER_LIMIT}번까지 할 수 있어요.` }, { status: 429 });
  }

  // 하루 상한 (서비스 전체)
  const { data: allowed, error: limitError } = await admin.rpc("increment_usage", {
    p_scope: "global",
    p_kind: "diagnosis",
    p_limit: DAILY_LIMIT,
  });
  if (limitError) return Response.json({ error: "잠시 후 다시 시도해 주세요." }, { status: 500 });
  if (!allowed) return Response.json({ error: "오늘 진단이 많아 내일 다시 열려요." }, { status: 429 });

  const total = questions.length * ENGINES.length * REPEATS;
  const { data: run, error: runError } = await admin
    .from("diagnosis_runs")
    .insert({
      user_id: auth.user.id,
      brand_id: brand.id,
      brand_key: brandKey,
      status: "running",
      repeats: REPEATS,
      total_items: total,
      is_mock: !enginesAreLive(),
      started_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (runError || !run) {
    return Response.json({ error: "진단을 만들지 못했어요." }, { status: 500 });
  }

  const items = questions.flatMap((q) =>
    ENGINES.flatMap((engine) =>
      Array.from({ length: REPEATS }, (_, r) => ({
        user_id: auth.user!.id,
        run_id: run.id,
        question_id: q.id,
        question_position: q.position!,
        question_text: q.text,
        question_strategy: q.strategy,
        engine,
        repeat_no: r + 1,
      })),
    ),
  );
  const { error: itemsError } = await admin.from("run_items").insert(items);
  if (itemsError) {
    await admin.from("diagnosis_runs").update({ status: "failed" }).eq("id", run.id);
    return Response.json({ error: "진단을 만들지 못했어요." }, { status: 500 });
  }

  return Response.json({ runId: run.id });
}
