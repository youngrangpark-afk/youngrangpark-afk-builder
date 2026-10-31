import { enginesAreLive } from "@/lib/diagnosis/engine";
import { createRun, processRun } from "@/lib/diagnosis/worker";
import { thisMondayNineKst } from "@/lib/diagnosis/goals";
import { getAdminSupabase } from "@/lib/supabase/admin";

// 예약 실행 (T-34, D-09 · D-23): Supabase pg_cron 이 1분마다 부른다.
// ① 진행 중인 진단을 처리 (창을 닫아도 계속) ② 월요일 09:00(KST) 이후 대시보드 이용자의 자동 모드 브랜드에 주간 재진단을 만든다.
export const maxDuration = 60;

// 실제 AI 는 한 번에 몇 초씩 걸리고 무료 등급은 분당 요청 수가 적어 줄인다 (D-30)
const RUNS_PER_TICK = enginesAreLive() ? 2 : 5;
const BATCH = enginesAreLive() ? 4 : 12;

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const admin = getAdminSupabase();

  // ② 주간 재진단 만들기
  const created: string[] = [];
  const since = thisMondayNineKst();
  if (Date.now() >= since.getTime()) {
    // 대시보드 이용자(운영자가 켜 준 계정)의 브랜드만 (D-27)
    const { data: members } = await admin.from("dashboard_access").select("user_id");
    const userIds = (members ?? []).map((m) => m.user_id);
    const { data: brands } = userIds.length
      ? await admin.from("brands").select("id, user_id").eq("auto_mode", true).in("user_id", userIds)
      : { data: [] };
    for (const b of brands ?? []) {
      // 이미 한 번 진단을 끝낸 브랜드만 (처음 진단은 사람이 시작)
      const { data: last } = await admin
        .from("diagnosis_runs")
        .select("created_at, status")
        .eq("brand_id", b.id)
        .order("created_at", { ascending: false })
        .limit(1);
      if (!last?.length) continue;
      if (new Date(last[0].created_at).getTime() >= since.getTime()) continue; // 이번 주 이미 있음
      if (last[0].status === "running" || last[0].status === "queued") continue;
      const r = await createRun(admin, { userId: b.user_id, brandId: b.id, trigger: "weekly" });
      if ("runId" in r) created.push(r.runId);
    }
  }

  // ① 진행 중인 진단 처리
  const { data: running } = await admin
    .from("diagnosis_runs")
    .select("id")
    .eq("status", "running")
    .order("created_at")
    .limit(RUNS_PER_TICK);
  const processed: { id: string; status: string }[] = [];
  for (const r of running ?? []) {
    const p = await processRun(admin, r.id, BATCH);
    if (p) processed.push({ id: r.id, status: p.status });
  }

  return Response.json({ created: created.length, processed: processed.length });
}
