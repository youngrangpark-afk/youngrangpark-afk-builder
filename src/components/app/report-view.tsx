import { CalendarDays, Crosshair, Globe, Mountain, Repeat } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ReportActions } from "@/components/report-actions";
import { engineLabel, sourceTypeLabel, type ReportData, type Strategy } from "@/lib/report/types";

// 진단 1번의 결과 조각들 (T-15 · T-16). 대시보드 한 화면(D-28) 안에서 차례로 쓴다.

const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0);

function StrategyBadge({ strategy }: { strategy: Strategy }) {
  const Icon = strategy === "quick_win" ? Crosshair : Mountain;
  return (
    <Badge variant="secondary" className="gap-1 rounded-full">
      <Icon className="size-3" />
      {strategy === "quick_win" ? "공략형" : strategy === "long_term" ? "장기형" : "직접 쓴 질문"}
    </Badge>
  );
}

export function SectionTitle({ eyebrow, title }: { eyebrow: string; title: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium tracking-wide text-muted-foreground">{eyebrow}</p>
      <h2 className="text-xl font-bold md:text-2xl">{title}</h2>
    </div>
  );
}

const totals = (r: ReportData) => {
  const totalAsks = r.questions.length * r.engines.length * r.repeats;
  const selfHits = r.questions.reduce((s, q) => s + q.hits.openai + q.hits.gemini, 0);
  return { totalAsks, selfHits };
};

// 큰 결과: "AI 에게 30번 물으니 9번 우리를 말했어요"
export function ReportHero({ r, dateLabel }: { r: ReportData; dateLabel: string }) {
  const { totalAsks, selfHits } = totals(r);
  const quickWins = r.questions.filter((q) => q.strategy === "quick_win");
  const quickWinHit = quickWins.filter((q) => q.hits.openai + q.hits.gemini > 0).length;
  return (
    <section className="card-glow space-y-3 rounded-2xl border p-6 text-center md:p-10">
      <p className="text-sm text-muted-foreground">{dateLabel} 진단</p>
      <h2 className="text-3xl leading-tight font-bold tracking-tight md:text-5xl">
        AI 에게 {totalAsks}번 물으니
        <br />
        <span className="text-brand">{selfHits}번</span> 우리를 말했어요
      </h2>
      <p className="mx-auto max-w-xl text-sm text-muted-foreground md:text-base">
        질문 {r.questions.length}개를 {r.engines.map((e) => engineLabel[e]).join(" · ")} 에 {r.repeats}번씩 물어본 결과예요
        (노출 빈도 {pct(selfHits, totalAsks)}%). 공략형 질문 {quickWins.length}개 중 {quickWinHit}개에서 이미 이름이 나왔어요.
      </p>
    </section>
  );
}

// 상세 분석: 엔진 · 질문별 노출, 경쟁사 대비 위치, 인용 출처
export function ReportDetails({ r }: { r: ReportData }) {
  const { totalAsks } = totals(r);
  const perEngine = r.engines.map((e) => ({
    engine: e,
    hits: r.questions.reduce((s, q) => s + q.hits[e], 0),
    asks: r.questions.length * r.repeats,
  }));
  const maxBrand = Math.max(1, ...r.brands.map((b) => b.count));
  const citationTotal = r.citations.reduce((s, c) => s + c.count, 0);

  return (
    <section className="space-y-5">
      <SectionTitle eyebrow="상세 분석" title="엔진별 · 질문별로 얼마나 나왔나" />
      <div className="grid gap-4 sm:grid-cols-2">
        {perEngine.map((e) => (
          <Card key={e.engine} className="rounded-2xl">
            <CardHeader>
              <CardDescription>{engineLabel[e.engine]}</CardDescription>
              <CardTitle className="text-4xl font-extrabold md:text-5xl">
                <span className="text-brand">{pct(e.hits, e.asks)}%</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Progress value={pct(e.hits, e.asks)} />
              <p className="text-xs text-muted-foreground">
                {e.asks}번 중 {e.hits}번 언급
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card className="rounded-2xl">
        <CardContent className="divide-y divide-border">
          {r.questions.map((q) => {
            const hits = q.hits.openai + q.hits.gemini;
            const asks = r.engines.length * r.repeats;
            return (
              <div key={q.position} className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0 md:flex-row md:items-center md:gap-4">
                <div className="flex min-w-0 flex-1 items-start gap-2">
                  <StrategyBadge strategy={q.strategy} />
                  <p className="text-sm font-medium md:text-base">{q.text}</p>
                </div>
                <div className="flex items-center gap-3 md:w-56">
                  <Progress value={pct(hits, asks)} className="flex-1" />
                  <span className="w-14 shrink-0 text-right text-sm tabular-nums text-muted-foreground">
                    {hits}/{asks}
                  </span>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-lg">경쟁사 대비 위치</CardTitle>
            <CardDescription>{totalAsks}번의 답변 중 언급된 횟수</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {r.brands.map((b) => (
              <div key={b.name} className="space-y-1.5">
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className={b.role === "self" ? "font-bold" : "font-medium"}>
                    {b.name}
                    {b.role === "self" && <span className="text-brand"> · 우리</span>}
                  </span>
                  <span className="flex items-center gap-2">
                    <Badge variant="outline" className="rounded-full text-[0.7rem]">
                      {b.role === "competitor" ? "자동으로 찾음" : b.role === "benchmark" ? "내 기준 브랜드" : "내 브랜드"}
                    </Badge>
                    <span className="w-6 text-right tabular-nums text-muted-foreground">{b.count}</span>
                  </span>
                </div>
                <Progress value={pct(b.count, maxBrand)} />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-lg">AI 가 근거로 쓴 출처</CardTitle>
            <CardDescription>경쟁 · 기준 브랜드가 추천될 때 인용된 {citationTotal}곳, 매체 종류별</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {r.citations.length === 0 && <p className="text-sm text-muted-foreground">인용된 출처가 없었어요.</p>}
            {r.citations.map((c) => (
              <div key={c.type} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{sourceTypeLabel[c.type]}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {pct(c.count, citationTotal)}% · {c.count}곳
                  </span>
                </div>
                <Progress value={pct(c.count, citationTotal)} />
                <p className="truncate text-xs text-muted-foreground">예: {c.examples.join(", ")}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

// 상세 리포트 안내 (선택 상품)
export function ReportUpsell() {
  return (
    <section className="card-glow space-y-4 rounded-2xl border p-6 text-center md:p-10">
      <h2 className="text-xl font-bold md:text-2xl">
        질문별 원인과 할 일을 <span className="text-brand">더 자세히</span> 받아 보세요
      </h2>
      <p className="text-sm text-muted-foreground">상세 리포트에는 질문마다 인용된 출처 목록과 매체별 실행 순서가 들어가요.</p>
      <div className="flex justify-center">
        <ReportActions />
      </div>
    </section>
  );
}

// 진단 조건 + 답변 원문
export function ReportConditions({ r }: { r: ReportData }) {
  return (
    <section className="space-y-4">
      <SectionTitle eyebrow="진단 조건" title="이렇게 물어봤어요" />
      <Card className="rounded-2xl">
        <CardContent className="space-y-4">
          <ul className="grid gap-3 text-sm sm:grid-cols-3">
            <li className="flex items-center gap-2">
              <CalendarDays className="size-4 text-muted-foreground" />
              {r.runDate} 실행
            </li>
            <li className="flex items-center gap-2">
              <Globe className="size-4 text-muted-foreground" />
              {r.searchMode}
            </li>
            <li className="flex items-center gap-2">
              <Repeat className="size-4 text-muted-foreground" />
              질문마다 엔진별 {r.repeats}번
            </li>
          </ul>
          <p className="rounded-xl bg-muted p-3 text-xs leading-relaxed text-muted-foreground">
            이 결과는 정해진 질문과 검색 조건에서 API 로 받은 답이에요. 실제 앱에서 모든 사용자에게 똑같이 보이는 결과는
            아니에요.
          </p>
          <Accordion type="single" collapsible>
            {r.rawAnswers.map((a, i) => (
              <AccordionItem key={i} value={`raw-${i}`}>
                <AccordionTrigger className="text-sm">
                  원문 보기 · {engineLabel[a.engine]} · {a.question}
                </AccordionTrigger>
                <AccordionContent className="space-y-2 text-sm text-muted-foreground">
                  <p className="leading-relaxed">{a.text}</p>
                  {a.sources.length > 0 && <p className="text-xs">출처: {a.sources.join(", ")}</p>}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>
    </section>
  );
}
