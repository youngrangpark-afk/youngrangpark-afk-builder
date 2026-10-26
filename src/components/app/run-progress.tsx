"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { CircleCheck, Info, Loader2, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { PICKS_STORE } from "@/lib/picks";

type ProgressState = { status: string; total: number; done: number; failed: number; isMock: boolean };

const POLL_MS = 2000;

// `/app/reports/[번호]` 진행 화면 (T-11). 열려 있는 동안 서버에 "한 걸음"을 계속 부탁하며 진행률을 보여 준다.
export function RunProgress() {
  const { id } = useParams<{ id: string }>();
  const [state, setState] = useState<ProgressState | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    async function tick() {
      try {
        const res = await fetch(`/api/diagnosis/${id}/step`, { method: "POST" });
        const data = await res.json();
        if (stop) return;
        if (!res.ok) {
          setError(data?.error ?? "진단 상태를 불러오지 못했어요.");
          return;
        }
        setError(null);
        setState(data as ProgressState);
        if (data.status === "running" || data.status === "queued") timer = setTimeout(tick, POLL_MS);
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

  if (error && !state) {
    return (
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

  if (!state) {
    return <Card className="h-56 animate-pulse rounded-2xl" aria-label="불러오는 중" />;
  }

  const finished = state.done + state.failed;
  const pct = state.total ? Math.round((finished / state.total) * 100) : 0;
  const running = state.status === "running" || state.status === "queued";

  return (
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
              지금은 <strong className="text-foreground">이 화면을 열어 두는 동안</strong> 진단이 진행돼요. 창을 닫아도
              계속되게 하는 기능과 완료 메일은 곧 붙여요.
            </p>
          )}
          {error && <p className="text-xs text-muted-foreground">{error}</p>}
        </CardContent>
      </Card>

      {!running && state.status === "done" && (
        <Card className="rounded-2xl">
          <CardHeader className="gap-2">
            <CardTitle className="text-lg">리포트는 다음 단계에서 열려요</CardTitle>
            <CardDescription className="leading-relaxed">
              {state.done}개의 답변 원문을 내 계정에 저장했어요. 노출 빈도 · 경쟁사 · 인용 출처 · 할 일 카드로 정리하는
              화면은 곧 이 자리에 나와요. 어떤 모습인지는 예시 리포트로 먼저 볼 수 있어요.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="bg-brand hover:opacity-90">
              <Link href="/app/reports/example">예시 리포트 보기</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
