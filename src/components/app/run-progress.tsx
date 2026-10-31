"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { CircleCheck, Info, Loader2, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AppHeader } from "@/components/app/app-header";
import { DashboardBanner } from "@/components/app/dashboard-banner";
import { ReportView } from "@/components/app/report-view";
import { PICKS_STORE } from "@/lib/picks";
import type { ReportData } from "@/lib/report/types";

type ProgressState = { status: string; total: number; done: number; failed: number; isMock: boolean };

const POLL_MS = 2000;

// 진행 중 · 오류 화면의 바깥 틀 (리포트는 자체 틀을 쓴다)
function shell(children: React.ReactNode) {
  return (
    <main className="page-glow flex-1 pb-16">
      <AppHeader step="진단" />
      <div className="mx-auto max-w-xl px-4 pt-10 md:pt-16">{children}</div>
    </main>
  );
}

// 진행률을 받기 전 잠깐 보이는 카드 — 빈 화면 대신 무슨 일이 일어나는지 알려 준다
export function PreparingCard() {
  return (
    <Card className="rounded-2xl" aria-live="polite">
      <CardHeader className="gap-3">
        <CardTitle className="flex items-center gap-2 text-2xl font-bold">
          <Loader2 className="size-6 animate-spin text-primary" /> 진단을 준비하고 있어요
        </CardTitle>
        <CardDescription className="leading-relaxed">
          질문 5개를 ChatGPT · Gemini 에 보낼 준비를 하고 있어요. 곧 진행률이 보여요.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Progress value={0} />
      </CardContent>
    </Card>
  );
}

// `/app/reports/[번호]` 진행 화면 (T-11) → 끝나면 리포트 한 장 (T-15 ~ T-17).
// 열려 있는 동안 서버에 "한 걸음"을 계속 부탁하며 진행률을 보여 준다.
export function RunProgress() {
  const { id } = useParams<{ id: string }>();
  const [state, setState] = useState<ProgressState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<ReportData | null>(null);

  // 진단이 시작됐으니 브라우저에 남은 입력 복사본은 지운다 (D-16)
  useEffect(() => {
    try {
      for (const k of ["geo-sniper:brand-draft", PICKS_STORE, "geo-sniper:saved-brand-id"]) localStorage.removeItem(k);
      window.dispatchEvent(new Event("geo-sniper:draft-change"));
    } catch {
      // 지우지 못해도 진단은 계속된다
    }
  }, []);

  useEffect(() => {
    let stop = false;
    let timer: ReturnType<typeof setTimeout>;
    // 첫 번째는 진행률만 바로 읽어 화면을 띄우고(GET), 그다음부터 한 걸음씩 처리(POST)
    let first = true;
    async function tick() {
      try {
        const res = await fetch(`/api/diagnosis/${id}/step`, { method: first ? "GET" : "POST" });
        const wasFirst = first;
        first = false;
        const data = await res.json();
        if (stop) return;
        if (!res.ok) {
          setError(data?.error ?? "진단 상태를 불러오지 못했어요.");
          return;
        }
        setError(null);
        setState(data as ProgressState);
        if (data.status === "running" || data.status === "queued") timer = setTimeout(tick, wasFirst ? 0 : POLL_MS);
        else if (data.status === "done") {
          const r = await fetch(`/api/diagnosis/${id}/report`);
          const rd = await r.json();
          if (!stop && r.ok && rd.report) setReport(rd.report as ReportData);
        }
      } catch {
        if (!stop) {
          setError("연결이 잠깐 끊겼어요. 다시 시도하는 중…");
          timer = setTimeout(tick, POLL_MS * 2);
        }
      }
    }
    tick();
    return () => {
      stop = true;
      clearTimeout(timer);
    };
  }, [id]);

  if (report)
    return (
      <ReportView r={report} banner={<DashboardBanner />} />
    );

  if (error && !state) {
    return shell(
      <Card className="rounded-2xl text-center">
        <CardHeader className="gap-2">
          <TriangleAlert className="mx-auto size-8 text-destructive" />
          <CardTitle className="text-lg">{error}</CardTitle>
          <CardDescription>로그인한 계정의 진단만 볼 수 있어요.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline">
            <Link href="/app">처음으로</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!state) return shell(<PreparingCard />);

  const finished = state.done + state.failed;
  const pct = state.total ? Math.round((finished / state.total) * 100) : 0;
  const running = state.status === "running" || state.status === "queued";

  return shell(
    <div className="space-y-6">
      <Card className={`rounded-2xl ${running ? "" : "card-glow ring-primary/40"}`}>
        <CardHeader className="gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {state.isMock && (
              <Badge variant="outline" className="gap-1.5 rounded-full border-primary/50">
                <Info className="size-3" /> 연습용 예시
              </Badge>
            )}
            <Badge variant="secondary" className="rounded-full">
              {running ? "진단 중" : state.status === "done" ? "진단 완료" : "진단 멈춤"}
            </Badge>
          </div>
          <CardTitle className="flex items-center gap-2 text-2xl font-bold">
            {running ? (
              <>
                <Loader2 className="size-6 animate-spin text-primary" /> AI 에게 묻는 중이에요
              </>
            ) : state.status === "done" ? (
              <>
                <CircleCheck className="size-6 text-primary" /> 진단이 끝났어요
              </>
            ) : (
              <>
                <TriangleAlert className="size-6 text-destructive" /> 진단이 멈췄어요
              </>
            )}
          </CardTitle>
          <CardDescription className="leading-relaxed">
            질문 5개 × AI 2곳(ChatGPT · Gemini) × 3번 = 모두 {state.total}번 물어봐요.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Progress value={pct} />
          <p className="flex justify-between text-sm text-muted-foreground" aria-live="polite">
            <span>
              {state.total}개 중 <strong className="text-foreground">{finished}개</strong> 끝남
              {state.failed > 0 && ` (그중 ${state.failed}개 실패)`}
            </span>
            <span className="tabular-nums">{pct}%</span>
          </p>
          {running && (
            <p className="rounded-xl bg-muted p-3 text-xs leading-relaxed text-muted-foreground">
              <strong className="text-foreground">창을 닫아도 서버에서 계속 진행돼요.</strong> 끝나면 이 화면에서 리포트와
              할 일 3가지를 볼 수 있어요.
            </p>
          )}
          {error && <p className="text-xs text-muted-foreground">{error}</p>}
        </CardContent>
      </Card>

      {!running && state.status === "done" && (
        <Card className="rounded-2xl">
          <CardHeader className="gap-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Loader2 className="size-5 animate-spin text-primary" /> 리포트를 정리하는 중이에요
            </CardTitle>
            <CardDescription className="leading-relaxed">
              {state.done}개의 답변 원문을 노출 빈도 · 경쟁사 · 인용 출처 · 할 일 카드로 정리하고 있어요. 잠시 뒤에도 안 바뀌면
              새로고침해 주세요.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="ghost" size="sm">
              <Link href="/app/reports/example">예시 리포트 먼저 보기</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
