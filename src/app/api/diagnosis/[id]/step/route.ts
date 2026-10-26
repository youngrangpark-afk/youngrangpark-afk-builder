import type { Json } from "@/lib/database.types";
import { analyzeAnswer } from "@/lib/diagnosis/analyze";
import { askEngine, type EngineName } from "@/lib/diagnosis/engine";
import { buildReport } from "@/lib/diagnosis/summarize";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { getServerSupabase } from "@/lib/supabase/server";

// 진단 한 걸음 처리 (T-11 · D-09): 대기 중인 작업 칸을 몇 개 집어 엔진에 묻고 원문을 저장한 뒤 진행률을 돌려준다.
// 지금은 리포트 화면이 주기적으로 부른다. 창을 닫아도 계속되게 하는 예약 작업(pg_cron)은 다음 단계.
const BATCH = 6;

type Progress = { status: string; total: number; done: number; failed: number; isMock: boolean };

export async function POST(_request: Request, ctx: RouteContext<"/api/diagnosis/[id]/step">) {
  const { id } = await ctx.params;
  const supabase = await getServerSupabase();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return Response.json({ error: "로그인이 필요해요." }, { status: 401 });

  // 본인 권한으로 읽는다 — 남의 진단이면 RLS 때문에 안 보인다
  const { data: run } = await supabase.from("diagnosis_runs").select("*").eq("id", id).maybeSingle();
  if (!run) return Response.json({ error: "볼 수 없는 진단이에요." }, { status: 404 });

  const progressOf = (status: string, done: number, failed: number): Progress => ({
    status,
    total: run.total_items,
    done,
    failed,
    isMock: run.is_mock,
  });
  if (run.status === "done" || run.status === "failed") {
    return Response.json(progressOf(run.status, run.done_items, run.failed_items));
  }

  const admin = getAdminSupabase();
  const { data: brand } = await admin.from("brands").select("name, category, site_domain, benchmark_brands").eq("id", run.brand_id).single();
  const { data: items, error: claimError } = await admin.rpc("claim_run_items", { p_run_id: run.id, p_limit: BATCH });
  if (claimError) return Response.json({ error: "잠시 후 다시 시도해 주세요." }, { status: 500 });

  for (const item of items ?? []) {
    try {
      const answer = await askEngine({
        engine: item.engine as EngineName,
        question: item.question_text,
        brandName: brand?.name ?? "",
        benchmarkBrands: brand?.benchmark_brands ?? [],
        seed: item.id,
      });
      const { data: saved, error: saveError } = await admin.from("engine_answers").upsert(
        {
          user_id: item.user_id,
          item_id: item.id,
          run_id: item.run_id,
          engine: item.engine,
          model: answer.model,
          answer_text: answer.answerText,
          raw_response: answer.rawResponse,
          request_meta: answer.requestMeta,
        },
        { onConflict: "item_id" },
      ).select("id").single();
      if (saveError || !saved) throw new Error("save");

      // 답변 분석 (T-14): 언급 브랜드 · 설명 문장 · 인용 출처 — 다시 처리돼도 겹치지 않게 지우고 넣는다
      const found = analyzeAnswer(answer.answerText, answer.rawResponse, {
        selfName: brand?.name ?? "",
        selfDomain: brand?.site_domain ?? null,
        benchmarks: brand?.benchmark_brands ?? [],
      });
      await admin.from("mentions").delete().eq("answer_id", saved.id);
      await admin.from("citations").delete().eq("answer_id", saved.id);
      if (found.mentions.length) {
        await admin.from("mentions").insert(
          found.mentions.map((m) => ({
            user_id: item.user_id,
            answer_id: saved.id,
            run_id: item.run_id,
            brand_name: m.brandName,
            role: m.role,
            rank: m.rank,
            description: m.description,
          })),
        );
      }
      if (found.citations.length) {
        await admin.from("citations").insert(
          found.citations.map((c) => ({
            user_id: item.user_id,
            answer_id: saved.id,
            run_id: item.run_id,
            url: c.url,
            domain: c.domain,
            title: c.title,
            source_type: c.sourceType,
          })),
        );
      }
      await admin
        .from("run_items")
        .update({ status: "done", done_at: new Date().toISOString(), locked_at: null, last_error: null })
        .eq("id", item.id);
    } catch (e) {
      // 3번까지는 다시 대기열로, 그 뒤엔 실패 (키 · 개인정보는 남기지 않는다)
      await admin
        .from("run_items")
        .update({
          status: item.attempts >= 3 ? "failed" : "pending",
          locked_at: null,
          last_error: (e as Error).message.slice(0, 200),
        })
        .eq("id", item.id);
    }
  }

  // 진행률 다시 세기
  const { data: states } = await admin.from("run_items").select("status").eq("run_id", run.id);
  const done = states?.filter((s) => s.status === "done").length ?? 0;
  const failed = states?.filter((s) => s.status === "failed").length ?? 0;
  const finished = done + failed >= run.total_items;
  const status = finished ? (done === 0 ? "failed" : "done") : "running";
  // 끝났으면 리포트 집계 · 할 일 카드 3개 (T-15 · T-16)
  let summary: Json | undefined;
  if (finished && done > 0 && brand) {
    const [{ data: allItems }, { data: answers }, { data: mentions }, { data: citations }] = await Promise.all([
      admin.from("run_items").select("id, question_position, question_text, question_strategy, engine").eq("run_id", run.id),
      admin.from("engine_answers").select("id, item_id, answer_text").eq("run_id", run.id),
      admin.from("mentions").select("answer_id, brand_name, role, description").eq("run_id", run.id),
      admin.from("citations").select("answer_id, domain, source_type").eq("run_id", run.id),
    ]);
    const { report, cards } = buildReport({
      isMock: run.is_mock,
      createdAt: run.created_at,
      repeats: run.repeats,
      brand,
      items: allItems ?? [],
      answers: answers ?? [],
      mentions: mentions ?? [],
      citations: citations ?? [],
    });
    await admin.from("task_cards").delete().eq("run_id", run.id);
    await admin.from("task_cards").insert(cards.map((c) => ({ ...c, user_id: run.user_id, run_id: run.id })));
    summary = report as unknown as Json;
  }

  await admin
    .from("diagnosis_runs")
    .update({
      done_items: done,
      failed_items: failed,
      status,
      finished_at: finished ? new Date().toISOString() : null,
      ...(summary ? { summary } : {}),
    })
    .eq("id", run.id);

  return Response.json(progressOf(status, done, failed));
}
