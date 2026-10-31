import { enginesAreLive } from "@/lib/diagnosis/engine";
import { processRun } from "@/lib/diagnosis/worker";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { getServerSupabase } from "@/lib/supabase/server";

// 진단 한 걸음 (T-11): 화면을 열어 둔 동안 빠르게 진행시킨다. 창을 닫아도 예약 실행(cron/tick)이 이어서 처리한다.
// 실제 AI 는 한 번에 몇 초씩 걸려 한 걸음에 2개만 (D-30)
const batch = () => (enginesAreLive() ? 2 : 6);
export const maxDuration = 60;

// 진행률만 바로 읽기 — 화면이 처음 뜰 때 기다리지 않게 (처리는 하지 않는다)
export async function GET(_request: Request, ctx: RouteContext<"/api/diagnosis/[id]/step">) {
  const { id } = await ctx.params;
  const supabase = await getServerSupabase();
  const { data: run } = await supabase
    .from("diagnosis_runs")
    .select("status, total_items, done_items, failed_items, is_mock")
    .eq("id", id)
    .maybeSingle();
  if (!run) return Response.json({ error: "볼 수 없는 진단이에요." }, { status: 404 });
  return Response.json({
    status: run.status,
    total: run.total_items,
    done: run.done_items,
    failed: run.failed_items,
    isMock: run.is_mock,
  });
}

export async function POST(_request: Request, ctx: RouteContext<"/api/diagnosis/[id]/step">) {
  const { id } = await ctx.params;
  const supabase = await getServerSupabase();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return Response.json({ error: "로그인이 필요해요." }, { status: 401 });

  // 본인 권한으로 확인 — 남의 진단이면 RLS 때문에 안 보인다
  const { data: run } = await supabase.from("diagnosis_runs").select("id").eq("id", id).maybeSingle();
  if (!run) return Response.json({ error: "볼 수 없는 진단이에요." }, { status: 404 });

  const progress = await processRun(getAdminSupabase(), run.id, batch());
  if (!progress) return Response.json({ error: "볼 수 없는 진단이에요." }, { status: 404 });
  return Response.json(progress);
}
