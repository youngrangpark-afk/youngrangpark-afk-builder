import { getServerSupabase } from "@/lib/supabase/server";

// 리포트 한 장 데이터 (T-15 ~ T-17). 본인 권한(RLS)으로만 읽는다 — 남의 진단이면 404.
export async function GET(_request: Request, ctx: RouteContext<"/api/diagnosis/[id]/report">) {
  const { id } = await ctx.params;
  const supabase = await getServerSupabase();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return Response.json({ error: "로그인이 필요해요." }, { status: 401 });

  const { data: run } = await supabase.from("diagnosis_runs").select("status, summary").eq("id", id).maybeSingle();
  if (!run) return Response.json({ error: "볼 수 없는 진단이에요." }, { status: 404 });
  if (run.status !== "done" || !run.summary) {
    return Response.json({ error: "리포트가 아직 준비되지 않았어요.", status: run.status }, { status: 409 });
  }
  return Response.json({ report: run.summary });
}
