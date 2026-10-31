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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import type { Database } from "@/lib/database.types";
import type { ReportData } from "@/lib/report/types";
import { getBrowserSupabase } from "@/lib/supabase/browser";

type Brand = Pick<Database["public"]["Tables"]["brands"]["Row"], "id" | "name" | "category" | "auto_mode">;
type Run = Pick<
  Database["public"]["Tables"]["diagnosis_runs"]["Row"],
  "id" | "created_at" | "status" | "trigger" | "done_items" | "total_items" | "summary" | "is_mock"
>;
type Goal = Database["public"]["Tables"]["weekly_goals"]["Row"];
type CardRow = Pick<
  Database["public"]["Tables"]["task_cards"]["Row"],
  "id" | "position" | "card_type" | "title" | "body" | "evidence" | "draft" | "status"
>;

const CARD_NAMES: Record<string, string> = {
  site_info: "사이트 정보 보강",
  faq_content: "FAQ 콘텐츠",
  external_mention: "외부 언급 확보",
  review_community: "리뷰 · 커뮤니티 노출",
  shopping_listing: "쇼핑 검색 등록",
  press_release: "보도자료 배포",
};

const hitsOf = (run: Run) => {
  const r = run.summary as unknown as ReportData | null;
  if (!r?.questions) return null;
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

// 대시보드 (T-33, D-23): 이번 주 목표 · 액션 플랜(실행 초안) · 주간 추이. 기본은 자동, 표시는 선택.
export function Dashboard({ brands, onNewBrand }: { brands: Brand[]; onNewBrand: () => void }) {
  const router = useRouter();
  const [brandId, setBrandId] = useState(brands[0].id);
  const [brand, setBrand] = useState<Brand>(brands[0]);
  const [runs, setRuns] = useState<Run[] | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [cards, setCards] = useState<CardRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const supabase = getBrowserSupabase();
    let stop = false;
    (async () => {
      const [{ data: r }, { data: g }] = await Promise.all([
        supabase
          .from("diagnosis_runs")
          .select("id, created_at, status, trigger, done_items, total_items, summary, is_mock")
          .eq("brand_id", brandId)
          .order("created_at", { ascending: false })
          .limit(8),
        supabase.from("weekly_goals").select("*").eq("brand_id", brandId).order("created_at", { ascending: false }).limit(8),
      ]);
      const current = g?.[0];
      const { data: c } = current
        ? await supabase
            .from("task_cards")
            .select("id, position, card_type, title, body, evidence, draft, status")
            .eq("goal_id", current.id)
            .order("position")
        : { data: [] as CardRow[] };
      if (stop) return;
      setRuns(r ?? []);
      setGoals(g ?? []);
      setCards(c ?? []);
    })();
    return () => {
      stop = true;
    };
  }, [brandId, reload]);

  // 진행 중인 진단이 있으면 10초마다 새로 읽는다 (처리는 서버 예약 실행이 한다)
  const running = runs?.find((r) => r.status === "running");
  useEffect(() => {
    if (!running) return;
    const t = setTimeout(() => setReload((n) => n + 1), 10000);
    return () => clearTimeout(t);
  }, [running, reload]);

  async function setStatus(id: string, status: "auto" | "done" | "skipped") {
    setCards((cs) => cs.map((c) => (c.id === id ? { ...c, status } : c)));
    const { error } = await getBrowserSupabase().from("task_cards").update({ status }).eq("id", id);
    if (error) toast("저장하지 못했어요. 잠시 후 다시 시도해 주세요.");
  }

  async function setAuto(on: boolean) {
    setBrand((b) => ({ ...b, auto_mode: on }));
    const { error } = await getBrowserSupabase().from("brands").update({ auto_mode: on }).eq("id", brand.id);
    toast(error ? "저장하지 못했어요." : on ? "매주 월요일 오전 9시에 자동으로 진단해요." : "자동 진단을 껐어요.");
  }

  async function runNow() {
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
  const latestDone = runs.find((r) => r.status === "done");
  const latest = latestDone ? hitsOf(latestDone) : null;
  const isMock = runs.some((r) => r.is_mock);

  return (
    <div className="space-y-6">
      {/* 머리: 브랜드 · 자동 모드 · 다시 진단 */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">{brand.category}</p>
          <h1 className="text-2xl font-bold md:text-3xl">{brand.name}</h1>
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
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={brand.auto_mode} onCheckedChange={(v) => void setAuto(v === true)} />
            매주 월요일 자동 진단
          </label>
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

      {/* 이번 주 목표 */}
      {goal ? (
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
            <CardDescription className="leading-relaxed">
              ChatGPT · Gemini 에 같은 질문을 {goal.total}번 물었을 때 우리 브랜드가 나온 횟수예요. 다음 주 월요일 자동 진단으로
              결과를 확인해요.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Progress value={Math.round((goal.baseline_value / Math.max(goal.target_value, 1)) * 100)} />
            <p className="text-xs text-muted-foreground">
              지표: AI 답변 노출 수 · AI 검색 유입(방문 수)은 브랜드 사이트 Google Analytics 를 연결하면 함께 보여 드려요.
            </p>
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
      ) : (
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-lg">첫 진단이 끝나면 이번 주 목표가 자동으로 만들어져요</CardTitle>
          </CardHeader>
        </Card>
      )}

      {/* 액션 플랜 */}
      {cards.length > 0 && (
        <section className="space-y-3">
          <div className="space-y-1">
            <h2 className="flex items-center gap-2 text-lg font-bold">
              <Zap className="size-4 text-primary" /> 액션 플랜
            </h2>
            <p className="text-sm text-muted-foreground">
              실행 초안까지 자동으로 만들어 뒀어요. 완료 · 보류 표시는 선택이에요 — 표시하지 않아도 다음 주에 결과를 재요.
            </p>
          </div>
          {cards.map((c) => (
            <ActionCard key={c.id} c={c} onStatus={setStatus} />
          ))}
        </section>
      )}

      {/* 주간 추이 */}
      <section className="space-y-3">
        <h2 className="text-lg font-bold">주간 추이</h2>
        <Card className="rounded-2xl">
          <CardContent className="divide-y divide-border">
            {runs.filter((r) => r.status === "done").length === 0 && (
              <p className="py-2 text-sm text-muted-foreground">아직 끝난 진단이 없어요.</p>
            )}
            {runs
              .filter((r) => r.status === "done")
              .map((r) => {
                const h = hitsOf(r);
                const g = goals.find((x) => x.result_run_id === r.id);
                return (
                  <div key={r.id} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:gap-4">
                    <div className="flex min-w-0 items-center gap-2 sm:w-48">
                      <span className="text-sm font-medium">{fmtDate(r.created_at)}</span>
                      <Badge variant="outline" className="rounded-full text-[0.7rem]">
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
                      <Link href={`/app/reports/${r.id}`} className="text-xs text-muted-foreground underline-offset-4 hover:underline">
                        상세
                      </Link>
                    </div>
                  </div>
                );
              })}
          </CardContent>
        </Card>
      </section>

      {/* 다른 행동 (선택) */}
      <div className="flex flex-wrap gap-2">
        {latestDone && (
          <Button asChild variant="outline">
            <Link href={`/app/reports/${latestDone.id}`}>
              <FileText /> 최근 상세 리포트{latest ? ` (${latest.hits}/${latest.total})` : ""}
            </Link>
          </Button>
        )}
        <Button variant="ghost" disabled={busy || !!running} onClick={() => void runNow()}>
          {busy ? <Loader2 className="animate-spin" /> : <RotateCcw />} 지금 다시 진단
        </Button>
        <Button variant="ghost" onClick={onNewBrand}>
          다른 브랜드 진단
        </Button>
      </div>
    </div>
  );
}

function ActionCard({ c, onStatus }: { c: CardRow; onStatus: (id: string, s: "auto" | "done" | "skipped") => void }) {
  const [open, setOpen] = useState(false);
  const statusLabel = c.status === "done" ? "완료" : c.status === "skipped" ? "보류" : "자동 진행";
  return (
    <Card className={`rounded-2xl ${c.status === "skipped" ? "opacity-60" : ""}`}>
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
        <CardDescription className="text-sm">
          <span className="font-semibold text-foreground">근거</span> · {c.evidence}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
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
