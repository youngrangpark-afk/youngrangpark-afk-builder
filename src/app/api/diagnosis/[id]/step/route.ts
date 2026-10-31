import { processRun } from "@/lib/diagnosis/worker";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { getServerSupabase } from "@/lib/supabase/server";

// 진단 한 걸음 (T-11): 화면을 열어 둔 동안 빠르게 진행시킨다. 창을 닫아도 예약 실행(cron/tick)이 이어서 처리한다.
const BATCH = 6;

export async function POST(_request: Request, ctx: RouteContext<"/api/diagnosis/[id]/step">) {
  const { id } = await ctx.params;
  const supabase = await getServerSupabase();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return Response.json({ error: "로그인이 필요해요." }, { status: 401 });

  // 본인 권한으로 확인 — 남의 진단이면 RLS 때문에 안 보인다
  const { data: run } = await supabase.from("diagnosis_runs").select("id").eq("id", id).maybeSingle();
  if (!run) return Response.json({ error: "볼 수 없는 진단이에요." }, { status: 404 });

  const progress = await processRun(getAdminSupabase(), run.id, BATCH);
  if (!progress) return Response.json({ error: "볼 수 없는 진단이에요." }, { status: 404 });
  return Response.json(progress);
}
