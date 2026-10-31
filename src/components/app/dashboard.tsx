"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowRight, CircleCheck, CircleDot, Copy, Info, Loader2, PauseCircle, RotateCcw, ThumbsUp } from "lucide-react";
import { AliasNote } from "@/components/app/alias-note";
import { ReportConditions, ReportDetails } from "@/components/app/report-view";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { useDashboardAccess } from "@/lib/dashboard-access";
import type { Database } from "@/lib/database.types";
import type { ReportData } from "@/lib/report/types";
import { getBrowserSupabase } from "@/lib/supabase/browser";

export type Brand = Pick<
  Database["public"]["Tables"]["brands"]["Row"],
  "id" | "name" | "category" | "auto_mode" | "action_mode" | "aliases" | "aliases_checked_at"
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
type CardStatus = "auto" | "approved" | "done" | "skipped";

const RUN_COLUMNS = "id, created_at, status, trigger, done_items, total_items, summary, is_mock";
const CARD_COLUMNS = "id, position, card_type, title, body, evidence, draft, status";

const CARD_NAMES: Record<string, string> = {
  site_info: "사이트 정보",
  faq_content: "FAQ 콘텐츠",
  external_mention: "외부 언급",
  review_community: "리뷰 · 커뮤니티",
  shopping_listing: "쇼핑 검색",
  press_release: "보도자료",
};

const reportOf = (run: Run | undefined) => {
  const r = run?.summary as unknown as ReportData | null | undefined;
  return r?.questions ? r : null;
};

const hitsOf = (run: Run | undefined) => {
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
  return Math.max(0, Math.ceil((end - Date.now()) / 86400e3));
}

// 대시보드 한 화면 (T-33 · D-28 · D-32): 스크롤 없이 ① 현황 ② 이번 주 할 일(실행 모드), 그 아래 ③ 전체 리포트는 접어 둔다.
// 예시(/app/reports/example) · 진단이 끝난 화면(/app/reports/[번호]) · 내 대시보드(/app/dashboard)가 모두 이 화면을 쓴다.
// focusRunId: 이 진단 기준으로 (없으면 최근 진단). example: 예시 데이터로 그리고 저장하지 않는다.
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
  const runHref = (id: string) => (example ? "/app/reports/example" : `/app/reports/${id}`);
  const [brandId, setBrandId] = useState(brands[0].id);
  const [brand, setBrand] = useState<Brand>(brands[0]);
  const [runs, setRuns] = useState<Run[] | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [cards, setCards] = useState<CardRow[]>([]);
  const [openCard, setOpenCard] = useState<CardRow | null>(null);
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

  async function setStatus(id: string, status: CardStatus) {
    setCards((cs) => cs.map((c) => (c.id === id ? { ...c, status } : c)));
    setOpenCard((c) => (c && c.id === id ? { ...c, status } : c));
    if (example) return;
    const { error } = await getBrowserSupabase().from("task_cards").update({ status }).eq("id", id);
    if (error) toast("저장하지 못했어요. 잠시 후 다시 시도해 주세요.");
  }

  async function updateBrand(patch: Partial<Pick<Brand, "auto_mode" | "action_mode" | "aliases">>, done: string) {
    setBrand((b) => ({ ...b, ...patch }));
    if (example) return;
    const { error } = await getBrowserSupabase().from("brands").update(patch).eq("id", brand.id);
    toast(error ? "저장하지 못했어요." : done);
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

  if (!runs) return <Card className="h-96 animate-pulse rounded-2xl" aria-label="불러오는 중" />;

  const doneRuns = runs.filter((r) => r.status === "done");
  const focus = (focusRunId && runs.find((r) => r.id === focusRunId)) || doneRuns[0];
  const focusIndex = focus ? doneRuns.findIndex((r) => r.id === focus.id) : -1;
  const report = reportOf(focus);
  const now = hitsOf(focus);
  const before = focusIndex >= 0 ? hitsOf(doneRuns[focusIndex + 1]) : null;
  const goal = goals[0];
  const isMock = runs.some((r) => r.is_mock);
  const confirmMode = brand.action_mode === "confirm";

  // ① 현황 숫자
  const asksPerQuestion = report ? report.engines.length * report.repeats : 0;
  const topQuestions = report
    ? [...report.questions]
        .map((q) => ({ ...q, hits: q.hits.openai + q.hits.gemini }))
        .sort((a, b) => b.hits - a.hits)
        .slice(0, 3)
    : [];
  const self = report?.brands.find((b) => b.role === "self");
  const rivals = report ? report.brands.filter((b) => b.role !== "self").slice(0, 3) : [];
  const leader = rivals[0];
  const rate = now && now.total ? now.hits / now.total : 0;

  return (
    <div className="space-y-3">
      {example && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-card px-4 py-1.5 text-sm">
          <span>
            <strong>예시 화면</strong> · 내 브랜드를 진단하면 이 화면이 실제 결과로 채워져요
          </span>
          <Button asChild size="sm" className="bg-brand h-7 hover:opacity-90">
            <Link href="/app">내 브랜드 무료 진단</Link>
          </Button>
        </div>
      )}

      {/* 머리: 브랜드 · 실행 모드 · 자동 진단 */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0 space-y-0.5">
          <p className="text-xs text-muted-foreground">
            {brand.category}
            {focus && ` · ${fmtDate(focus.created_at)} 진단`}
            {focus && doneRuns[0] && focus.id !== doneRuns[0].id && (
              <>
                {" · "}
                <Link href={runHref(doneRuns[0].id)} className="underline underline-offset-4">
                  최근 진단 보기
                </Link>
              </>
            )}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold">{brand.name}</h1>
            {isMock && (
              <Badge variant="outline" className="gap-1 rounded-full border-primary/50">
                <Info className="size-3" /> 연습용 예시
              </Badge>
            )}
            {brands.length > 1 &&
              brands
                .filter((b) => b.id !== brandId)
                .map((b) => (
                  <Button
                    key={b.id}
                    size="sm"
                    variant="ghost"
                    className="h-7 rounded-full text-xs text-muted-foreground"
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
          {brand.aliases_checked_at && brand.aliases.length > 0 && (
            <AliasNote
              name={brand.name}
              aliases={brand.aliases}
              onRemove={(a) =>
                void updateBrand({ aliases: brand.aliases.filter((x) => x !== a) }, `“${a}” 표기를 뺐어요. 다음 진단부터 반영돼요.`)
              }
            />
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <div className="flex rounded-full border bg-card p-0.5" role="group" aria-label="실행 모드">
            {(["auto", "confirm"] as const).map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={brand.action_mode === m}
                className={`rounded-full px-3 py-1 text-xs font-medium ${brand.action_mode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
                onClick={() =>
                  brand.action_mode !== m &&
                  void updateBrand(
                    { action_mode: m },
                    m === "auto" ? "자동 모드: 할 일을 알아서 진행해요." : "확인 모드: 승인한 할 일만 진행해요.",
                  )
                }
              >
                {m === "auto" ? "자동 모드" : "확인 모드"}
              </button>
            ))}
          </div>
          {member ? (
            <label className="flex items-center gap-1.5 text-xs">
              <Checkbox
                checked={brand.auto_mode}
                onCheckedChange={(v) =>
                  void updateBrand({ auto_mode: v === true }, v === true ? "매주 월요일 오전 9시에 자동으로 진단해요." : "자동 진단을 껐어요.")
                }
              />
              매주 자동 진단
            </label>
          ) : (
            access !== "loading" && <span className="text-xs text-muted-foreground">매주 자동 진단은 이용 중인 브랜드에 열려요</span>
          )}
          {!example && (
            <Button size="sm" variant="ghost" className="h-8" disabled={busy || !!running} onClick={() => void runNow()}>
              {busy ? <Loader2 className="animate-spin" /> : <RotateCcw />} 다시 진단
            </Button>
          )}
        </div>
      </div>

      {running && (
        <div className="flex items-center justify-between gap-3 rounded-xl border bg-card px-4 py-2 text-sm">
          <span className="flex items-center gap-2">
            <Loader2 className="size-4 animate-spin text-primary" />
            {running.trigger === "weekly" ? "이번 주 자동 진단" : "진단"} 중 · {running.total_items}개 중 {running.done_items}개
          </span>
          <Link href={`/app/reports/${running.id}`} className="text-xs underline underline-offset-4">
            진행 보기
          </Link>
        </div>
      )}

      {!report ? (
        !running && (
          <Card className="rounded-2xl">
            <CardContent className="py-6 text-center text-sm text-muted-foreground">아직 끝난 진단이 없어요.</CardContent>
          </Card>
        )
      ) : (
        <>
          {/* ① 현황 — 숫자 4칸 */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Kpi label="AI 노출" sub={before && now ? delta(now.hits - before.hits) : "첫 진단"}>
              <span className="text-brand">{now?.hits}</span>
              <span className="text-base font-medium text-muted-foreground">/{now?.total}</span>
            </Kpi>
            <Kpi label="AI 유입 (방문)" sub="GA 연결 후 표시" muted>
              —
            </Kpi>
            <Kpi
              label="이번 주 목표"
              sub={goal ? `D-${daysLeft(goal.due_date)} · ${Math.max(0, goal.target_value - (now?.hits ?? 0))}번 더` : "다음 진단 후 정해져요"}
            >
              {goal ? goal.target_value : "—"}
            </Kpi>
            <Kpi
              label="경쟁 1위"
              sub={leader ? `${leader.count}번${self && self.count > 0 ? ` · 우리의 ${Math.round((leader.count / self.count) * 10) / 10}배` : ""}` : "—"}
            >
              <span className="block truncate text-lg">{leader?.name ?? "—"}</span>
            </Kpi>
          </div>

          {/* ① 현황 — 질문 · 경쟁 */}
          <div className="grid gap-3 md:grid-cols-2">
            <MiniList title="노출이 나오는 질문">
              {topQuestions.map((q) => (
                <Row key={q.position} label={q.text} value={`${q.hits}/${asksPerQuestion}`} dim={q.hits === 0} />
              ))}
            </MiniList>
            <MiniList title="같이 비교되는 브랜드">
              {rivals.length === 0 && <p className="text-sm text-muted-foreground">아직 찾지 못했어요</p>}
              {rivals.map((b) => (
                <Row key={b.name} label={b.name} value={`${b.count}번`} />
              ))}
              {self && <Row label={`${self.name} (우리)`} value={`${self.count}번`} strong />}
            </MiniList>
          </div>

          {/* ① 현황 — 지금 막힌 곳 */}
          <Bottleneck rate={rate} fixes={cards.map((c) => CARD_NAMES[c.card_type] ?? c.card_type)} />
        </>
      )}

      {/* ② 이번 주 할 일 */}
      {cards.length > 0 && (
        <Card className="gap-0 rounded-2xl py-0">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2.5">
            <h2 className="text-sm font-bold">이번 주 할 일</h2>
            <span className="text-xs text-muted-foreground">
              {confirmMode ? "확인 모드 · 승인한 할 일만 진행해요" : "자동 모드 · 알아서 진행해요 (표시는 선택)"}
            </span>
          </div>
          <ul className="divide-y">
            {cards.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-2 px-4 py-2.5">
                <Badge variant="secondary" className="shrink-0 rounded-full">
                  {c.position} · {CARD_NAMES[c.card_type] ?? c.card_type}
                </Badge>
                <span className={`min-w-0 flex-1 truncate text-sm font-medium ${c.status === "skipped" ? "text-muted-foreground line-through" : ""}`}>
                  {c.title}
                </span>
                <StatusChip status={c.status as CardStatus} confirmMode={confirmMode} />
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" className="h-8" onClick={() => setOpenCard(c)}>
                    전략 보기
                  </Button>
                  <PrimaryAction c={c} confirmMode={confirmMode} onStatus={setStatus} />
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* ③ 전체 리포트 — 접어 둠 */}
      {report && (
        <Accordion type="single" collapsible className="rounded-2xl border bg-card px-4">
          <AccordionItem value="full" className="border-none">
            <AccordionTrigger className="text-sm">
              <span>
                전체 리포트{" "}
                <span className="font-normal text-muted-foreground">
                  · 주간 추이 · 질문 {report.questions.length} · 경쟁 {report.brands.filter((b) => b.role !== "self").length} · 출처{" "}
                  {report.citations.reduce((s, c) => s + c.count, 0)}곳 · 원문
                </span>
              </span>
            </AccordionTrigger>
            <AccordionContent className="space-y-8 pb-6">
              <Trend runs={doneRuns} goals={goals} focusId={focus?.id} runHref={runHref} />
              <ReportDetails r={report} />
              <ReportConditions r={report} />
              <div className="flex justify-end">
                <Button asChild variant="ghost" size="sm">
                  <Link href="/app">
                    {example ? "내 브랜드 무료 진단 해보기" : "다른 브랜드 진단"} <ArrowRight />
                  </Link>
                </Button>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}

      <p className="text-center text-xs text-muted-foreground">
        {example
          ? "GEO 스나이퍼 · 연습용 예시 화면 · 실제 브랜드 · 사이트가 아닌 가짜 데이터예요"
          : isMock
            ? "GEO 스나이퍼 · 연습용 예시 답변으로 만든 결과예요"
            : "GEO 스나이퍼"}
      </p>

      <StrategyDialog card={openCard} confirmMode={confirmMode} onClose={() => setOpenCard(null)} onStatus={setStatus} />
    </div>
  );
}

const delta = (d: number) => (d === 0 ? "지난 진단과 같음" : d > 0 ? `지난 진단 +${d}` : `지난 진단 ${d}`);

function Kpi({ label, sub, muted, children }: { label: string; sub: string; muted?: boolean; children: React.ReactNode }) {
  return (
    <Card className="gap-1 rounded-2xl px-4 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-3xl leading-tight font-extrabold tabular-nums ${muted ? "text-muted-foreground/60" : ""}`}>{children}</p>
      <p className="truncate text-xs text-muted-foreground">{sub}</p>
    </Card>
  );
}

function MiniList({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="gap-2 rounded-2xl px-4 py-3">
      <p className="text-sm font-bold">{title}</p>
      <div className="space-y-1.5">{children}</div>
    </Card>
  );
}

function Row({ label, value, dim, strong }: { label: string; value: string; dim?: boolean; strong?: boolean }) {
  return (
    <div className={`flex items-center justify-between gap-3 text-sm ${dim ? "text-muted-foreground" : ""} ${strong ? "font-bold" : ""}`}>
      <span className="min-w-0 truncate">{label}</span>
      <span className="shrink-0 tabular-nums">{value}</span>
    </div>
  );
}

// 지금 막힌 곳: 노출 → 유입 → 전환. 지금 데이터(노출)로는 노출 단계만 판단하고, 유입 · 전환은 GA 연결 후.
function Bottleneck({ rate, fixes }: { rate: number; fixes: string[] }) {
  const stuck = rate < 0.5 ? "노출" : "유입"; // 노출이 절반 미만이면 노출 단계에서 막힌 것으로 본다
  const stages = ["노출", "유입", "전환"];
  return (
    <div className="flex flex-col gap-1.5 rounded-2xl bg-accent px-4 py-3 text-sm md:flex-row md:items-center md:gap-4">
      <div className="flex shrink-0 items-center gap-1.5">
        <span className="font-bold">지금 막힌 곳</span>
        {stages.map((s, i) => (
          <span key={s} className="flex items-center gap-1.5">
            {i > 0 && <span className="text-muted-foreground">→</span>}
            <span className={`rounded-full px-2 py-0.5 text-xs ${s === stuck ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>{s}</span>
          </span>
        ))}
      </div>
      <p className="min-w-0 text-muted-foreground">
        {stuck === "노출" ? (
          <>
            AI 가 아직 우리 브랜드를 잘 몰라요 → 바꿀 것:{" "}
            <strong className="text-foreground">{fixes.length ? [...new Set(fixes)].join(" · ") : "질문에 답하는 콘텐츠 · 인용 출처"}</strong>
          </>
        ) : (
          <>노출은 되고 있어요. 유입 · 전환 중 어디가 막혔는지는 Google Analytics 를 연결하면 알려 드려요.</>
        )}
      </p>
    </div>
  );
}

function StatusChip({ status, confirmMode }: { status: CardStatus; confirmMode: boolean }) {
  const label =
    status === "done"
      ? "완료"
      : status === "skipped"
        ? "보류"
        : status === "approved"
          ? "승인됨 · 진행 중"
          : confirmMode
            ? "승인 대기"
            : "자동 진행";
  return (
    <Badge variant={status === "done" ? "default" : "outline"} className="shrink-0 rounded-full">
      {label}
    </Badge>
  );
}

// 줄마다 하나의 실행 버튼: 확인 모드에서 아직이면 [승인], 그 밖에는 [했어요]
function PrimaryAction({ c, confirmMode, onStatus }: { c: CardRow; confirmMode: boolean; onStatus: (id: string, s: CardStatus) => void }) {
  if (confirmMode && c.status === "auto")
    return (
      <Button size="sm" className="h-8" onClick={() => onStatus(c.id, "approved")}>
        <ThumbsUp /> 승인
      </Button>
    );
  if (c.status === "done")
    return (
      <Button size="sm" variant="ghost" className="h-8" onClick={() => onStatus(c.id, confirmMode ? "approved" : "auto")}>
        되돌리기
      </Button>
    );
  return (
    <Button size="sm" variant="ghost" className="h-8" onClick={() => onStatus(c.id, "done")}>
      <CircleCheck /> 했어요
    </Button>
  );
}

function StrategyDialog({
  card,
  confirmMode,
  onClose,
  onStatus,
}: {
  card: CardRow | null;
  confirmMode: boolean;
  onClose: () => void;
  onStatus: (id: string, s: CardStatus) => void;
}) {
  const checks = card?.body.split("\n").filter(Boolean) ?? [];
  return (
    <Dialog open={!!card} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        {card && (
          <>
            <DialogHeader>
              <Badge variant="secondary" className="w-fit rounded-full">
                {card.position} · {CARD_NAMES[card.card_type] ?? card.card_type}
              </Badge>
              <DialogTitle className="text-lg leading-snug">{card.title}</DialogTitle>
              <DialogDescription>
                <span className="font-semibold text-foreground">근거</span> · {card.evidence}
              </DialogDescription>
            </DialogHeader>
            {checks.length > 0 && (
              <ul className="space-y-1.5">
                {checks.map((t) => (
                  <li key={t} className="flex items-start gap-2 text-sm">
                    <CircleDot className="mt-0.5 size-4 shrink-0 text-primary" />
                    {t}
                  </li>
                ))}
              </ul>
            )}
            {card.draft && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold">실행 초안</p>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      navigator.clipboard.writeText(card.draft ?? "").then(
                        () => toast("초안을 복사했어요. 【】 칸을 채워서 쓰세요."),
                        () => toast("복사하지 못했어요."),
                      )
                    }
                  >
                    <Copy /> 복사
                  </Button>
                </div>
                <pre className="max-h-64 overflow-auto rounded-xl bg-muted p-4 text-sm leading-relaxed whitespace-pre-wrap">{card.draft}</pre>
              </div>
            )}
            <div className="flex flex-wrap justify-end gap-2 border-t pt-3">
              <Button size="sm" variant="ghost" onClick={() => onStatus(card.id, card.status === "skipped" ? "auto" : "skipped")}>
                <PauseCircle /> {card.status === "skipped" ? "보류 풀기" : "보류"}
              </Button>
              {confirmMode && card.status === "auto" ? (
                <Button size="sm" onClick={() => onStatus(card.id, "approved")}>
                  <ThumbsUp /> 승인하고 진행
                </Button>
              ) : (
                <Button size="sm" variant={card.status === "done" ? "outline" : "default"} onClick={() => onStatus(card.id, card.status === "done" ? "auto" : "done")}>
                  <CircleCheck /> {card.status === "done" ? "완료 취소" : "했어요"}
                </Button>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Trend({
  runs,
  goals,
  focusId,
  runHref,
}: {
  runs: Run[];
  goals: Goal[];
  focusId?: string;
  runHref: (id: string) => string;
}) {
  return (
    <section className="space-y-3">
      <p className="text-sm font-bold">주간 추이</p>
      <div className="divide-y rounded-xl border">
        {runs.map((r) => {
          const h = hitsOf(r);
          const g = goals.find((x) => x.result_run_id === r.id);
          return (
            <div key={r.id} className="flex items-center gap-3 px-3 py-2 text-sm">
              <span className="w-28 shrink-0">{fmtDate(r.created_at)}</span>
              <Progress value={h ? Math.round((h.hits / h.total) * 100) : 0} className="flex-1" />
              <span className="w-12 shrink-0 text-right tabular-nums text-muted-foreground">{h ? `${h.hits}/${h.total}` : "-"}</span>
              <span className="hidden w-20 shrink-0 sm:block">
                {g && (
                  <Badge variant={g.status === "achieved" ? "default" : "secondary"} className="rounded-full text-[0.7rem]">
                    목표 {g.status === "achieved" ? "달성" : "미달"}
                  </Badge>
                )}
              </span>
              {r.id === focusId ? (
                <span className="w-10 shrink-0 text-right text-xs text-muted-foreground">보는 중</span>
              ) : (
                <Link href={runHref(r.id)} className="w-10 shrink-0 text-right text-xs text-muted-foreground underline-offset-4 hover:underline">
                  보기
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
