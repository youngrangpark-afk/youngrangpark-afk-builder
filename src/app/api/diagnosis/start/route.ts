import { createRun, PER_USER_LIMIT } from "@/lib/diagnosis/worker";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { getServerSupabase } from "@/lib/supabase/server";

// 진단 시작 (T-10 · T-11 · T-31): 로그인 확인 → 내 브랜드 확인 → 계정당 20회 → 진단 만들기 (하루 상한은 createRun)
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
  const { data: brand } = await supabase.from("brands").select("id").eq("id", brandId).maybeSingle();
  if (!brand) return Response.json({ error: "브랜드를 찾지 못했어요." }, { status: 404 });

  const admin = getAdminSupabase();
  // 계정당 진단 횟수 (D-22) — 사람이 시작한 진단만 센다 (매주 자동 진단은 제외)
  const { count } = await admin
    .from("diagnosis_runs")
    .select("id", { count: "exact", head: true })
    .eq("user_id", auth.user.id)
    .eq("trigger", "manual");
  if ((count ?? 0) >= PER_USER_LIMIT) {
    return Response.json({ error: `한 계정은 진단을 ${PER_USER_LIMIT}번까지 시작할 수 있어요.` }, { status: 429 });
  }

  const result = await createRun(admin, { userId: auth.user.id, brandId: brand.id, trigger: "manual" });
  if ("error" in result) return Response.json({ error: result.error }, { status: result.status });
  return Response.json({ runId: result.runId });
}
