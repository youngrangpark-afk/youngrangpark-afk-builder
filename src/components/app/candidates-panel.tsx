"use client";

import { useEffect, useState } from "react";
import { Crosshair, Info, Loader2, Mountain, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { BrandDraft } from "@/lib/draft";
import { suggestKey, type Candidate, type SuggestInput, type SuggestResult } from "@/lib/questions";

const STORE = "geo-sniper:candidates";

type Stored = { key: string } & SuggestResult;

function readStored(key: string): SuggestResult | null {
  try {
    const s = JSON.parse(localStorage.getItem(STORE) ?? "null") as Stored | null;
    return s && s.key === key && Array.isArray(s.candidates) ? { isMock: !!s.isMock, candidates: s.candidates } : null;
  } catch {
    return null;
  }
}

function writeStored(key: string, result: SuggestResult) {
  try {
    localStorage.setItem(STORE, JSON.stringify({ key, ...result }));
  } catch {
    // 저장이 막혀도 화면에는 보여 준다
  }
}

// 추천 질문 후보 10개 (T-07). 같은 브랜드 입력이면 저장해 둔 후보를 다시 쓴다 (D-07, 브라우저에만).
// 이 컴포넌트는 브라우저에서만 그려진다 (부모가 저장값을 읽은 뒤에 그림).
export function CandidatesPanel({ draft }: { draft: BrandDraft }) {
  const input: SuggestInput = { name: draft.name, category: draft.category, benchmarkBrands: draft.benchmarkBrands };
  const key = suggestKey(input);
  const [result, setResult] = useState<SuggestResult | null>(() => readStored(key));
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (result) return;
    let cancelled = false;
    fetch("/api/questions/suggest", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error ?? "질문을 만들지 못했어요.");
        return data as SuggestResult;
      })
      .then((data) => {
        if (cancelled) return;
        writeStored(key, data);
        setResult(data);
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message || "질문을 만들지 못했어요.");
      });
    return () => {
      cancelled = true;
    };
    // input 은 key 로 대표된다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, attempt, result]);

  if (error) {
    return (
      <Card className="rounded-2xl text-center">
        <CardHeader className="gap-2">
          <CardTitle className="text-lg">질문을 만들지 못했어요</CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            onClick={() => {
              setError(null);
              setAttempt((n) => n + 1);
            }}
          >
            <RotateCcw /> 다시 만들기
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!result) {
    return (
      <div className="space-y-3" aria-live="polite">
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> 질문 만드는 중…
        </p>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-2xl bg-muted" />
        ))}
      </div>
    );
  }

  const quick = result.candidates.filter((c) => c.strategy === "quick_win");
  const long = result.candidates.filter((c) => c.strategy === "long_term");

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold md:text-3xl">추천 질문 10개</h1>
          {result.isMock && (
            <Badge variant="outline" className="gap-1.5 rounded-full border-primary/50">
              <Info className="size-3" /> 연습용 예시
            </Badge>
          )}
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">
          AI 에 물어볼 질문 후보예요. 다음 단계에서 이 중 5개를 골라 진단해요. 추천 이유는 진단 전{" "}
          <strong className="text-foreground">예상</strong>이고, 실제 노출은 리포트에서 확인해요.
        </p>
      </div>

      <CandidateGroup
        icon={<Crosshair className="size-4 text-primary" />}
        title="공략형"
        description="지금 상위 노출될 가능성이 비교적 높은 질문"
        items={quick}
      />
      <CandidateGroup
        icon={<Mountain className="size-4 text-primary" />}
        title="장기형"
        description="지금은 경쟁이 세도 길게 보고 꼭 잡아야 할 질문"
        items={long}
      />
    </div>
  );
}

function CandidateGroup({
  icon,
  title,
  description,
  items,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  items: Candidate[];
}) {
  return (
    <section className="space-y-3">
      <div className="space-y-1">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          {icon} {title} <span className="text-sm font-medium text-muted-foreground">{items.length}개</span>
        </h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="space-y-3">
        {items.map((c) => (
          <Card key={c.id} className="rounded-2xl">
            <CardContent className="space-y-2">
              <p className="text-base font-semibold leading-snug">{c.text}</p>
              <p className="text-sm leading-relaxed text-muted-foreground">
                <span className="font-medium text-foreground">예상</span> · {c.rationale}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
