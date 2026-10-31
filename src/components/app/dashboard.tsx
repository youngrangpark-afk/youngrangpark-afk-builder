"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  CalendarClock,
  CircleCheck,
  CircleDot,
  Copy,
  FileText,
  Info,
  Loader2,
  PauseCircle,
  RotateCcw,
  Target,
  Zap,
} from "lucide-react";
import { AliasNote } from "@/components/app/alias-note";
import { ReportConditions, ReportDetails, ReportHero, SectionTitle } from "@/components/app/report-view";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useDashboardAccess } from "@/lib/dashboard-access";
import type { Database } from "@/lib/database.types";
import type { ReportData } from "@/lib/report/types";
import { getBrowserSupabase } from "@/lib/supabase/browser";

export type Brand = Pick<
  Database["public"]["Tables"]["brands"]["Row"],
  "id" | "name" | "category" | "auto_mode" | "aliases" | "aliases_checked_at"
>;
export type DashboardData = { runs: Run[]; goals: Goal[]; cards: CardRow[] };
type Run = Pick<
  Database["public"]["Tables"]["diagnosis_runs"]["Row"],
  "id" | "created_at" | "status" | "trigger" | "done_items" | "total_items" | "summary" | "is_mock"
>;
type Goal = Database["public"]["Tables"]["weekly_goals"]["Row"];
type CardRow = Pick<
  Database["public"]["Tables"]["task_cards"]["Row"],
  "id" | "position" | "card_type" | "title" | "body" | "evidence" | "draft" | "status"
>;

const RUN_COLUMNS = "id, created_at, status, trigger, done_items, total_items, summary, is_mock";
const CARD_COLUMNS = "id, position, card_type, title, body, evidence, draft, status";

const CARD_NAMES: Record<string, string> = {
  site_info: "사이트 정보 보강",
  faq_content: "FAQ 콘텐츠",
  external_mention: "외부 언급 확보",
  review_community: "리뷰 · 커뮤니티 노출",
  shopping_listing: "쇼핑 검색 등록",
  press_release: "보도자료 배포",
};

const reportOf = (run: Run | undefined) => {
  const r = run?.summary as unknown as ReportData | null | undefined;
  return r?.questions ? r : null;
};

const hitsOf = (run: Run) => {
  const r = reportOf(run);
  if (!r) return null;
  return {
    hits: r.questions.reduce((s, q) => s + q.hits.openai + q.hits.gemini, 0),
    total: r.questions.length * r.engines.length * r.repeats,
  };
};

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "short", timeZone: "Asia/Seoul" });

function daysLeft(due: string) {
  const end = new Date(`${due}T09:00:00+09:00`).getTime();
  return Math.ceil((end - Date.now()) / 86400e3);
}

// 대시보드 한 화면 (T-33 · D-23 · D-28): 브랜드 → 큰 결과 → 이번 주 목표 → 이번 주 할 일(초안) → 주간 추이 → 상세 분석 → 진단 조건.
// 예시(/app/reports/example) · 진단이 끝난 화면(/app/reports/[번호]) · 내 대시보드(/app/dashboard)가 모두 이 화면을 쓴다.
// focusRunId: 큰 결과 · 상세 분석을 이 진단 기준으로 (없으면 최근 진단). example: 예시 데이터로 그리고 저장하지 않는다.
export function Dashboard({
  brands,
  example,
  focusRunId,
}: {
  brands: Brand[];
  example?: () => DashboardData;
  focusRunId?: string;
}) {
  const router = useRouter();
  const access = useDashboardAccess();
  const member = !!example || access === "member"; // 매주 자동 재진단은 이용자만 (D-27)
  const runHref = (id: string) => (example ? "#detail" : `/app/reports/${id}`);
  const [brandId, setBrandId] = useState(brands[0].id);
  const [brand, setBrand] = useState<Brand>(brands[0]);
  const [runs, setRuns] = useState<Run[] | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [cards, setCards] = useState<CardRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let stop = false;
    if (example) {
      // 날짜 계산이 들어 있어 화면이 뜬 뒤에 채운다
      const d = example();
      Promise.resolve().then(() => {
        if (stop) return;
        setRuns(d.runs);
        setGoals(d.goals);
        setCards(d.cards);
      });
      return () => {
        stop = true;
      };
    }
    const supabase = getBrowserSupabase();
    (async () => {
      const [{ data: r }, { data: g }] = await Promise.all([
        supabase.from("diagnosis_runs").select(RUN_COLUMNS).eq("brand_id", brandId).order("created_at", { ascending: false }).limit(8),
        supabase.from("weekly_goals").select("*").eq("brand_id", brandId).order("created_at", { ascending: false }).limit(8),
      ]);
      const list = r ?? [];
      // 오래된 진단을 열었으면 그 진단도 함께 읽는다
      if (focusRunId && !list.some((x) => x.id === focusRunId)) {
        const { data: f } = await supabase.from("diagnosis_runs").select(RUN_COLUMNS).eq("id", focusRunId).maybeSingle();
        if (f) list.push(f);
      }
      // 이번 주 할 일 = 지금 목표의 카드. 목표가 없던 예전 진단이면 그 진단의 카드
      const current = g?.[0];
      const fallbackRun = focusRunId ?? list.find((x) => x.status === "done")?.id;
      const { data: c } = current
        ? await supabase.from("task_cards").select(CARD_COLUMNS).eq("goal_id", current.id).order("position")
        : fallbackRun
          ? await supabase.from("task_cards").select(CARD_COLUMNS).eq("run_id", fallbackRun).order("position")
          : { data: [] as CardRow[] };
      if (stop) return;
      setRuns(list);
      setGoals(g ?? []);
      setCards(c ?? []);
    })();
    return () => {
      stop = true;
    };
  }, [brandId, reload, example, focusRunId]);

  // 진행 중인 진단이 있으면 10초마다 새로 읽는다 (처리는 서버 예약 실행이 한다)
  const running = runs?.find((r) => r.status === "running");
  useEffect(() => {
    if (!running) return;
    const t = setTimeout(() => setReload((n) => n + 1), 10000);
    return () => clearTimeout(t);
  }, [running, reload]);

  async function setStatus(id: string, status: "auto" | "done" | "skipped") {
    setCards((cs) => cs.map((c) => (c.id === id ? { ...c, status } : c)));
    if (example) return;
    const { error } = await getBrowserSupabase().from("task_cards").update({ status }).eq("id", id);
    if (error) toast("저장하지 못했어요. 잠시 후 다시 시도해 주세요.");
  }

  async function setAuto(on: boolean) {
    setBrand((b) => ({ ...b, auto_mode: on }));
    if (example) return;
    const { error } = await getBrowserSupabase().from("brands").update({ auto_mode: on }).eq("id", brand.id);
    toast(error ? "저장하지 못했어요." : on ? "매주 월요일 오전 9시에 자동으로 진단해요." : "자동 진단을 껐어요.");
  }

  // 잘못 찾은 표기 빼기 (선택, D-26) — 다음 진단부터 반영
  async function removeAlias(alias: string) {
    const aliases = brand.aliases.filter((a) => a !== alias);
    setBrand((b) => ({ ...b, aliases }));
    if (example) return;
    const { error } = await getBrowserSupabase().from("brands").update({ aliases }).eq("id", brand.id);
    toast(error ? "저장하지 못했어요." : `“${alias}” 표기를 뺐어요. 다음 진단부터 반영돼요.`);
  }

  async function runNow() {
    if (example) return router.push("/app");
    setBusy(true);
    const res = await fetch("/api/diagnosis/start", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ brandId: brand.id }),
    });
    const data = (await res.json()) as { runId?: string; error?: string };
    setBusy(false);
    if (res.ok && data.runId) router.push(`/app/reports/${data.runId}`);
    else toast(data.error ?? "진단을 시작하지 못했어요.");
  }

  if (!runs) return <Card className="h-72 animate-pulse rounded-2xl" aria-label="불러오는 중" />;

  const goal = goals[0];
  const lastEvaluated = goals.find((g) => g.status !== "active");
  const doneRuns = runs.filter((r) => r.status === "done");
  const focus = (focusRunId && runs.find((r) => r.id === focusRunId)) || doneRuns[0];
  const report = reportOf(focus);
  const isMock = runs.some((r) => r.is_mock);
  const olderFocus = !!focus && !!doneRuns[0] && focus.id !== doneRuns[0].id;

  return (
    <div className="space-y-10">
      {example && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-4">
          <p className="text-sm">
            <strong>예시 화면이에요.</strong> 내 브랜드를 진단하면 이 화면에 실제 결과 · 이번 주 목표 · 할 일이 채워져요.
          </p>
          <Button asChild size="sm" className="bg-brand hover:opacity-90">
            <Link href="/app">내 브랜드 무료 진단</Link>
          </Button>
        </div>
      )}

      {/* ① 브랜드 · 다른 표기 · 자동 진단 */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">{brand.category}</p>
          <h1 className="text-2xl font-bold md:text-3xl">{brand.name}</h1>
          {brand.aliases_checked_at && (
            <AliasNote name={brand.name} aliases={brand.aliases} onRemove={(a) => void removeAlias(a)} />
          )}
          {brands.length > 1 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {brands.map((b) => (
                <Button
                  key={b.id}
                  size="sm"
                  variant={b.id === brandId ? "default" : "outline"}
                  className="h-7 rounded-full"
                  onClick={() => {
                    setBrandId(b.id);
                    setBrand(b);
                    setRuns(null);
                  }}
                >
                  {b.name}
                </Button>
              ))}
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {isMock && (
            <Badge variant="outline" className="gap-1.5 rounded-full border-primary/50">
              <Info className="size-3" /> 연습용 예시
            </Badge>
          )}
          {member ? (
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={brand.auto_mode} onCheckedChange={(v) => void setAuto(v === true)} />
              매주 월요일 자동 진단
            </label>
          ) : (
            access !== "loading" && (
              <span className="text-xs text-muted-foreground">매주 자동 진단은 이용 중인 브랜드에 열려요</span>
            )
          )}
        </div>
      </div>

      {running && (
        <Card className="rounded-2xl">
          <CardContent className="flex flex-wrap items-center justify-between gap-3">
            <p className="flex items-center gap-2 text-sm">
              <Loader2 className="size-4 animate-spin text-primary" />
              {running.trigger === "weekly" ? "이번 주 자동 진단" : "진단"} 중 · {running.total_items}개 중 {running.done_items}개
            </p>
            <Button asChild size="sm" variant="outline">
              <Link href={`/app/reports/${running.id}`}>진행 보기</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ② 큰 결과 */}
      {report && focus ? (
        <div className="space-y-2">
          <ReportHero r={report} dateLabel={fmtDate(focus.created_at)} />
          {olderFocus && (
            <p className="text-center text-xs text-muted-foreground">
              지난 진단을 보고 있어요 ·{" "}
              <Link href={runHref(doneRuns[0].id)} className="underline underline-offset-4">
                최근 진단 보기
              </Link>
            </p>
          )}
        </div>
      ) : (
        !running && (
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-lg">아직 끝난 진단이 없어요</CardTitle>
            </CardHeader>
          </Card>
        )
      )}

      {/* ③ 이번 주 목표 */}
      {goal && (
        <Card className="card-glow rounded-2xl ring-primary/40">
          <CardHeader className="gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="gap-1 rounded-full">
                <Target className="size-3" /> 이번 주 목표
              </Badge>
              <Badge variant="secondary" className="gap-1 rounded-full">
                <CalendarClock className="size-3" /> {fmtDate(`${goal.due_date}T09:00:00+09:00`)} 마감 ·{" "}
                {Math.max(daysLeft(goal.due_date), 0)}일 남음
              </Badge>
            </div>
            <CardTitle className="text-xl leading-snug md:text-2xl">
              AI 답변 노출 <span className="text-brand">{goal.baseline_value}번 → {goal.target_value}번</span>
              <span className="text-base font-medium text-muted-foreground"> / {goal.total}번 중</span>
            </CardTitle>
            <CardDescription>
              {member ? "다음 주 월요일 자동 진단으로 확인해요" : "다음 주에 다시 진단하면 달성 여부를 보여 드려요"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Progress value={Math.round((goal.baseline_value / Math.max(goal.target_value, 1)) * 100)} />
            {lastEvaluated && lastEvaluated.result_value !== null && (
              <>
                <Separator />
                <p className="flex items-center gap-2 text-sm">
                  {lastEvaluated.status === "achieved" ? (
                    <CircleCheck className="size-4 text-primary" />
                  ) : (
                    <CircleDot className="size-4 text-muted-foreground" />
                  )}
                  지난 목표 {lastEvaluated.target_value}번 → 결과 <strong>{lastEvaluated.result_value}번</strong> (
                  {lastEvaluated.status === "achieved" ? "달성" : "미달"})
                </p>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* ④ 이번 주 할 일 (리포트 할 일 카드 + 액션 플랜, D-28) */}
      {cards.length > 0 && (
        <section className="space-y-4">
          <SectionTitle
            eyebrow="이번 주 할 일"
            title={
              <span className="flex items-center gap-2">
                <Zap className="size-5 text-primary" /> 이 3가지부터 하면 돼요
              </span>
            }
          />
          <div className="space-y-3">
            {cards.map((c) => (
              <ActionCard key={c.id} c={c} onStatus={setStatus} />
            ))}
          </div>
        </section>
      )}

      {/* ⑤ 주간 추이 */}
      <section className="space-y-4">
        <SectionTitle eyebrow="주간 추이" title="진단할 때마다 얼마나 나왔나" />
        <Card className="rounded-2xl">
          <CardContent className="divide-y divide-border">
            {doneRuns.length === 0 && <p className="py-2 text-sm text-muted-foreground">아직 끝난 진단이 없어요.</p>}
            {doneRuns.map((r) => {
              const h = hitsOf(r);
              const g = goals.find((x) => x.result_run_id === r.id);
              return (
                <div
                  key={r.id}
                  className={`flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:gap-4 ${r.id === focus?.id ? "font-semibold" : ""}`}
                >
                  <div className="flex min-w-0 items-center gap-2 sm:w-48">
                    <span className="text-sm">{fmtDate(r.created_at)}</span>
                    <Badge variant="outline" className="rounded-full text-[0.7rem] font-normal">
                      {r.trigger === "weekly" ? "자동" : "직접"}
                    </Badge>
                  </div>
                  <div className="flex flex-1 items-center gap-3">
                    <Progress value={h ? Math.round((h.hits / h.total) * 100) : 0} className="flex-1" />
                    <span className="w-14 shrink-0 text-right text-sm tabular-nums text-muted-foreground">
                      {h ? `${h.hits}/${h.total}` : "-"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 sm:w-36 sm:justify-end">
                    {g && (
                      <Badge variant={g.status === "achieved" ? "default" : "secondary"} className="rounded-full text-[0.7rem]">
                        목표 {g.status === "achieved" ? "달성" : "미달"}
                      </Badge>
                    )}
                    {r.id === focus?.id ? (
                      <span className="text-xs text-muted-foreground">보는 중</span>
                    ) : (
                      <Link href={runHref(r.id)} className="text-xs font-normal text-muted-foreground underline-offset-4 hover:underline">
                        상세
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </section>

      {/* ⑥ 상세 분석 · ⑦ 진단 조건 */}
      {report && (
        <div id="detail" className="space-y-10 scroll-mt-6">
          <ReportDetails r={report} />
          <ReportConditions r={report} />
        </div>
      )}

      {/* 다른 행동 (선택) */}
      <div className="flex flex-wrap gap-2 border-t pt-6">
        {!example && (
          <Button variant="outline" disabled={busy || !!running} onClick={() => void runNow()}>
            {busy ? <Loader2 className="animate-spin" /> : <RotateCcw />} 지금 다시 진단
          </Button>
        )}
        <Button asChild variant="ghost">
          <Link href="/app">{example ? "내 브랜드 무료 진단 해보기" : "다른 브랜드 진단"}</Link>
        </Button>
      </div>
      <p className="text-center text-xs text-muted-foreground">
        {example
          ? "GEO 스나이퍼 · 연습용 예시 화면 · 실제 브랜드 · 사이트가 아닌 가짜 데이터예요"
          : isMock
            ? "GEO 스나이퍼 · 연습용 예시 답변으로 만든 결과예요"
            : "GEO 스나이퍼"}
      </p>
    </div>
  );
}

function ActionCard({ c, onStatus }: { c: CardRow; onStatus: (id: string, s: "auto" | "done" | "skipped") => void }) {
  const [open, setOpen] = useState(false);
  const statusLabel = c.status === "done" ? "완료" : c.status === "skipped" ? "보류" : "자동 진행";
  const checks = c.body.split("\n").filter(Boolean);
  return (
    <Card className={`rounded-2xl ${c.status === "skipped" ? "opacity-60" : ""} ${c.position === 1 ? "card-glow ring-primary/40" : ""}`}>
      <CardHeader className="gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="gap-1.5 rounded-full">
            <CircleDot className="size-3 text-primary" />
            {c.position} · {CARD_NAMES[c.card_type] ?? c.card_type}
          </Badge>
          <Badge variant={c.status === "done" ? "default" : "outline"} className="rounded-full">
            {statusLabel}
          </Badge>
        </div>
        <CardTitle className="text-lg leading-snug">{c.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {checks.length > 0 && (
          <ul className="space-y-1.5">
            {checks.map((t) => (
              <li key={t} className="flex items-start gap-2 text-sm text-muted-foreground">
                <CircleCheck className="mt-0.5 size-4 shrink-0 text-primary" />
                {t}
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">근거</span> · {c.evidence}
        </p>
        {c.draft && (
          <>
            <Button size="sm" variant="outline" onClick={() => setOpen((v) => !v)}>
              <FileText /> {open ? "초안 접기" : "실행 초안 보기"}
            </Button>
            {open && (
              <div className="space-y-2">
                <pre className="max-h-80 overflow-auto rounded-xl bg-muted p-4 text-sm leading-relaxed whitespace-pre-wrap">
                  {c.draft}
                </pre>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    navigator.clipboard.writeText(c.draft ?? "").then(
                      () => toast("초안을 복사했어요. 【】 칸을 채워서 쓰세요."),
                      () => toast("복사하지 못했어요."),
                    );
                  }}
                >
                  <Copy /> 복사
                </Button>
              </div>
            )}
          </>
        )}
        <div className="flex flex-wrap gap-1 border-t pt-3">
          <span className="mr-1 self-center text-xs text-muted-foreground">표시 (선택):</span>
          <Button size="sm" variant={c.status === "done" ? "default" : "ghost"} onClick={() => onStatus(c.id, c.status === "done" ? "auto" : "done")}>
            <CircleCheck /> 했어요
          </Button>
          <Button size="sm" variant={c.status === "skipped" ? "secondary" : "ghost"} onClick={() => onStatus(c.id, c.status === "skipped" ? "auto" : "skipped")}>
            <PauseCircle /> 보류
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
