import "server-only";
import type { Json } from "@/lib/database.types";
import { findBrandAliases } from "@/lib/ai/brand-aliases";
import { analyzeAnswer, mentionSentence, nameKey } from "@/lib/diagnosis/analyze";
import { makeDraft } from "@/lib/diagnosis/drafts";
import { extractCompetitorBrands } from "@/lib/ai/extract-brands";
import { askEngine, enginesAreLive, liveEngines, type EngineName } from "@/lib/diagnosis/engine";
import { nextMonday, nextTarget } from "@/lib/diagnosis/goals";
import { buildReport } from "@/lib/diagnosis/summarize";
import { getAdminSupabase } from "@/lib/supabase/admin";

// 진단 만들기 · 처리 · 마무리 (T-11 · T-32 · T-34). 화면(step)과 예약 실행(cron/tick)이 함께 쓴다.

type Admin = ReturnType<typeof getAdminSupabase>;

// 실제로 물을 수 있는 엔진만 쓴다. 하나도 없으면 두 엔진 모두 연습용 예시 (D-30)
const enginesForRun = (): EngineName[] => (enginesAreLive() ? liveEngines() : ["openai", "gemini"]);
const REPEATS = 3;
export const DAILY_LIMIT = Number(process.env.DIAGNOSIS_DAILY_LIMIT ?? 50);
export const PER_USER_LIMIT = Number(process.env.DIAGNOSIS_PER_USER_LIMIT ?? 20);

export type Progress = { status: string; total: number; done: number; failed: number; isMock: boolean };

// ── 진단 만들기: 브랜드의 고른 질문 5개 × 엔진 2 × 반복 3 ──
export async function createRun(
  admin: Admin,
  args: { userId: string; brandId: string; trigger: "manual" | "weekly" },
): Promise<{ runId: string } | { error: string; status: number }> {
  const { data: brand } = await admin.from("brands").select("*").eq("id", args.brandId).eq("user_id", args.userId).maybeSingle();
  if (!brand) return { error: "브랜드를 찾지 못했어요.", status: 404 };
  const { data: questions } = await admin
    .from("questions")
    .select("id, text, strategy, position")
    .eq("brand_id", brand.id)
    .eq("selected", true)
    .order("position");
  if (!questions || questions.length !== 5) return { error: "질문 5개가 필요해요.", status: 400 };

  // 하루 상한 (서비스 전체)
  const { data: allowed, error: limitError } = await admin.rpc("increment_usage", {
    p_scope: "global",
    p_kind: "diagnosis",
    p_limit: DAILY_LIMIT,
  });
  if (limitError) return { error: "잠시 후 다시 시도해 주세요.", status: 500 };
  if (!allowed) return { error: "오늘 진단이 많아 내일 다시 열려요.", status: 429 };

  // 브랜드 다른 표기 — 아직 찾은 적이 없으면 1번만 (D-26). 키가 없으면 다음 진단 때 다시 찾는다.
  if (!brand.aliases_checked_at) {
    const { aliases, usedAi } = await findBrandAliases({
      name: brand.name,
      category: brand.category,
      domain: brand.site_domain,
    });
    await admin
      .from("brands")
      .update({ aliases, aliases_checked_at: usedAi ? new Date().toISOString() : null })
      .eq("id", brand.id);
  }

  const engines = enginesForRun();
  const { data: run, error } = await admin
    .from("diagnosis_runs")
    .insert({
      user_id: args.userId,
      brand_id: brand.id,
      brand_key: brand.site_domain || brand.name.toLowerCase().replace(/\s+/g, ""),
      status: "running",
      trigger: args.trigger,
      engines,
      repeats: REPEATS,
      total_items: questions.length * engines.length * REPEATS,
      is_mock: !enginesAreLive(),
      started_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error || !run) return { error: "진단을 만들지 못했어요.", status: 500 };

  const items = questions.flatMap((q) =>
    engines.flatMap((engine) =>
      Array.from({ length: REPEATS }, (_, r) => ({
        user_id: args.userId,
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
    return { error: "진단을 만들지 못했어요.", status: 500 };
  }
  return { runId: run.id };
}

// ── 진단 한 걸음: 대기 칸을 batch 개 집어 엔진에 묻고 분석해 저장 → 끝났으면 마무리 ──
export async function processRun(admin: Admin, runId: string, batch: number): Promise<Progress | null> {
  const { data: run } = await admin.from("diagnosis_runs").select("*").eq("id", runId).maybeSingle();
  if (!run) return null;
  const progressOf = (status: string, done: number, failed: number): Progress => ({
    status,
    total: run.total_items,
    done,
    failed,
    isMock: run.is_mock,
  });
  if (run.status === "done" || run.status === "failed") return progressOf(run.status, run.done_items, run.failed_items);

  const { data: brand } = await admin
    .from("brands")
    .select("name, category, site_domain, benchmark_brands, aliases")
    .eq("id", run.brand_id)
    .single();
  const { data: items } = await admin.rpc("claim_run_items", { p_run_id: run.id, p_limit: batch });

  for (const item of items ?? []) {
    try {
      const answer = await askEngine({
        engine: item.engine as EngineName,
        question: item.question_text,
        brandName: brand?.name ?? "",
        benchmarkBrands: brand?.benchmark_brands ?? [],
        seed: item.id,
      });
      const { data: saved, error: saveError } = await admin
        .from("engine_answers")
        .upsert(
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
        )
        .select("id")
        .single();
      if (saveError || !saved) throw new Error("save");

      // 답변 분석 (T-14) — 다시 처리돼도 겹치지 않게 지우고 넣는다
      const found = analyzeAnswer(answer.answerText, answer.rawResponse, {
        selfName: brand?.name ?? "",
        selfAliases: brand?.aliases ?? [],
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
  if (!finished) {
    await admin.from("diagnosis_runs").update({ done_items: done, failed_items: failed }).eq("id", run.id);
    return progressOf("running", done, failed);
  }

  // 끝남: 상태를 먼저 바꾼 한 곳만 마무리한다 (화면과 예약 실행이 동시에 와도 한 번만)
  const finalStatus = done === 0 ? "failed" : "done";
  const { data: won } = await admin
    .from("diagnosis_runs")
    .update({ done_items: done, failed_items: failed, status: finalStatus, finished_at: new Date().toISOString() })
    .eq("id", run.id)
    .eq("status", "running")
    .select("id");
  if (won?.length && finalStatus === "done" && brand) await finalizeRun(admin, run, brand);
  return progressOf(finalStatus, done, failed);
}

// ── 마무리 (T-15 · T-16 · T-32): 리포트 집계 → 지난 목표 판정 → 새 주간 목표 → 액션 플랜(초안 포함) ──
async function finalizeRun(
  admin: Admin,
  run: { id: string; user_id: string; brand_id: string; is_mock: boolean; created_at: string; repeats: number },
  brand: { name: string; category: string; site_domain: string | null; aliases: string[]; benchmark_brands: string[] },
) {
  // 실제 답변이면 경쟁 브랜드를 한 번에 뽑아 넣는다 (D-30, Gemini 무료 1번)
  if (!run.is_mock) await addCompetitorMentions(admin, run, brand);
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
  const total = report.questions.length * report.engines.length * report.repeats;
  const hits = report.questions.reduce((s, q) => s + q.hits.openai + q.hits.gemini, 0);

  // 지난 목표 판정 (이 브랜드의 진행 중 목표)
  const { data: active } = await admin
    .from("weekly_goals")
    .select("id, target_value")
    .eq("brand_id", run.brand_id)
    .eq("status", "active");
  for (const g of active ?? []) {
    await admin
      .from("weekly_goals")
      .update({
        status: hits >= g.target_value ? "achieved" : "missed",
        result_value: hits,
        result_run_id: run.id,
        evaluated_at: new Date().toISOString(),
      })
      .eq("id", g.id);
  }

  // 새 주간 목표
  const { data: goal } = await admin
    .from("weekly_goals")
    .insert({
      user_id: run.user_id,
      brand_id: run.brand_id,
      baseline_run_id: run.id,
      baseline_value: hits,
      total,
      target_value: nextTarget(hits, total),
      due_date: nextMonday(),
    })
    .select("id")
    .single();

  // 액션 플랜 = 할 일 카드 3장 + 실행 초안
  const nearQuestion =
    [...report.questions]
      .filter((q) => q.strategy === "quick_win")
      .sort((a, b) => b.hits.openai + b.hits.gemini - (a.hits.openai + a.hits.gemini))[0]?.text ?? null;
  await admin.from("task_cards").delete().eq("run_id", run.id);
  await admin.from("task_cards").insert(
    cards.map((c) => ({
      ...c,
      user_id: run.user_id,
      run_id: run.id,
      goal_id: goal?.id ?? null,
      draft: makeDraft({
        cardType: c.card_type,
        title: c.title,
        brandName: brand.name,
        category: brand.category,
        topQuestion: nearQuestion,
        sourceExamples: report.citations.flatMap((x) => x.examples).slice(0, 3),
      }),
    })),
  );
  await admin.from("diagnosis_runs").update({ summary: report as unknown as Json }).eq("id", run.id);
}

// 실제 답변 속 경쟁 브랜드 (T-14, D-30): 답변 전체를 Gemini 에 한 번 보내 브랜드 이름을 받아 mentions 에 넣는다.
// 실패해도 진단은 끝난다 (경쟁사 칸만 빈다).
async function addCompetitorMentions(
  admin: Admin,
  run: { id: string; user_id: string },
  brand: { name: string; aliases: string[]; benchmark_brands: string[] },
) {
  const { data: answers } = await admin.from("engine_answers").select("id, answer_text").eq("run_id", run.id);
  if (!answers?.length) return;
  const known = [brand.name, ...brand.aliases, ...brand.benchmark_brands];
  const knownKeys = new Set(known.map(nameKey).filter(Boolean));
  let found: string[][];
  try {
    found = await extractCompetitorBrands(
      answers.map((a) => a.answer_text),
      known,
    );
  } catch (e) {
    console.error("extract-brands: 경쟁 브랜드 뽑기 실패", (e as Error).message.slice(0, 120));
    return;
  }
  const rows = answers.flatMap((a, i) =>
    found[i]
      .filter((b) => !knownKeys.has(nameKey(b)))
      .map((b, j) => ({
        user_id: run.user_id,
        answer_id: a.id,
        run_id: run.id,
        brand_name: b,
        role: "competitor",
        rank: 100 + j,
        description: mentionSentence(a.answer_text, b),
      })),
  );
  await admin.from("mentions").delete().eq("run_id", run.id).eq("role", "competitor");
  if (rows.length) await admin.from("mentions").insert(rows);
}
