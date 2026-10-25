"use client";

import Link from "next/link";
import { ArrowLeft, Crosshair, Info, Mountain } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { parseDraft, useDraftRaw } from "@/lib/draft";

// `/app/questions` — 지금은 입력한 브랜드 요약만 (질문 추천은 T-07, 고르기는 T-08 에서 채운다)
export function QuestionsView() {
  const raw = useDraftRaw();
  if (raw === undefined) {
    return <Card className="h-64 animate-pulse rounded-2xl" aria-label="불러오는 중" />;
  }
  const draft = parseDraft(raw);

  if (!draft) {
    return (
      <Card className="rounded-2xl text-center">
        <CardHeader className="gap-2">
          <CardTitle className="text-xl">먼저 브랜드를 입력해 주세요</CardTitle>
          <CardDescription>브랜드명과 카테고리를 넣으면 질문을 추천해 드려요.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="bg-brand hover:opacity-90">
            <Link href="/app">브랜드 입력하러 가기</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="rounded-2xl">
        <CardHeader className="gap-3">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <CardDescription>진단할 브랜드</CardDescription>
              <CardTitle className="text-2xl font-bold">{draft.name}</CardTitle>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/app">
                <ArrowLeft /> 고치기
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-muted-foreground">카테고리</span>
            <Badge variant="secondary" className="rounded-full">
              {draft.category}
            </Badge>
          </div>
          {draft.siteDomain && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-muted-foreground">사이트</span>
              <span>{draft.siteDomain}</span>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-muted-foreground">기준 브랜드</span>
            {draft.benchmarkBrands.length ? (
              draft.benchmarkBrands.map((b) => (
                <Badge key={b} variant="outline" className="rounded-full">
                  {b}
                </Badge>
              ))
            ) : (
              <span className="text-muted-foreground">없음 (AI 답변에서 자동으로 찾아요)</span>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="card-glow rounded-2xl">
        <CardHeader className="gap-3">
          <Badge variant="outline" className="w-fit gap-1.5 rounded-full border-primary/50">
            <Info className="size-3" /> 준비 중
          </Badge>
          <CardTitle className="text-xl leading-snug">질문 추천은 다음 단계에서 열려요</CardTitle>
          <CardDescription className="text-base leading-relaxed">
            곧 이 자리에 AI 가 추천한 질문 10개가 나와요. 그중 5개를 골라 진단을 시작해요.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Badge variant="secondary" className="gap-1 rounded-full">
            <Crosshair className="size-3" /> 공략형 5개
          </Badge>
          <Badge variant="secondary" className="gap-1 rounded-full">
            <Mountain className="size-3" /> 장기형 5개
          </Badge>
        </CardContent>
      </Card>
    </div>
  );
}
