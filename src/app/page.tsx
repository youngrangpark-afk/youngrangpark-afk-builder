import Link from "next/link";
import { ArrowRight, CircleCheck, CircleDot, Crosshair, Mountain } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { StartButton } from "@/components/start-button";

// 랜딩 (T-02). 문구는 SITE.md, 모양은 DESIGN.md 를 따른다.
const pains = [
  "어떤 질문에서 노출을 노려야 할지 모르겠어요",
  "“나오나 안 나오나”만 보면 다음에 할 일이 없어요",
  "AI 여러 곳에 반복해 묻고 정리할 시간이 없어요",
];

const steps = [
  {
    label: "브랜드 입력",
    title: "브랜드명과 카테고리만 넣어요",
    checks: ["함께 비교할 기준 브랜드는 원하면 더해요"],
  },
  {
    label: "질문 고르기",
    title: "AI 가 추천한 질문 10개 중 5개를 골라요",
    checks: ["공략형 · 장기형을 자유롭게 섞어요", "고르고 나서 고칠 수도 있어요"],
  },
  {
    label: "리포트 받기",
    title: "노출 빈도 · 경쟁사 · 인용 출처 · 이번 주 할 일 3개",
    checks: ["ChatGPT · Gemini 에 웹 검색을 켜고 여러 번 물어요"],
  },
];

const differences = [
  <>
    측정 툴은 &ldquo;나오나&rdquo;를 보여 주고, GEO 스나이퍼는{" "}
    <strong className="text-foreground">&ldquo;왜 나오나 → 그래서 할 일&rdquo;</strong>까지 보여 줘요.
  </>,
  <>
    무료 GPT 에 직접 물으면 한 번의 답이지만, 여기서는 같은 질문을 여러 AI 에 여러 번 묻고 원문과 출처를
    함께 남겨요.
  </>,
  <>결과는 정해진 질문과 검색 조건에서 받은 답이라, 그 조건을 리포트에 함께 적어 드려요.</>,
];

const keywords = ["GEO", "AI 검색 노출", "1인 창업", "브랜드 마케팅"];

function ExampleReportButton() {
  return (
    <Button asChild size="lg" className="bg-brand h-12 px-6 text-base hover:opacity-90">
      <Link href="/app/reports/example">
        예시 리포트 보기 <ArrowRight />
      </Link>
    </Button>
  );
}

function SectionHead({ eyebrow, title }: { eyebrow: string; title: React.ReactNode }) {
  return (
    <div className="reveal mx-auto max-w-3xl space-y-3 text-center">
      <p className="text-sm font-medium text-muted-foreground">{eyebrow}</p>
      <h2 className="text-2xl font-bold md:text-4xl">{title}</h2>
    </div>
  );
}

export default function Home() {
  return (
    <main className="flex-1">
      {/* 1. 히어로 */}
      <section className="page-glow px-4 pt-6 pb-16 md:pb-28">
        <div className="mx-auto max-w-5xl">
          <div className="flex items-center justify-between">
            <span className="text-base font-bold">GEO 스나이퍼</span>
          </div>
          <div className="mx-auto max-w-3xl space-y-8 pt-16 text-center md:pt-24">
            <Badge variant="outline" className="gap-1.5 rounded-full border-primary/50 px-3 py-1">
              <CircleDot className="size-3 text-primary" />
              검증 중인 서비스 · 1인 창업자용 GEO
            </Badge>
            <h1 className="text-4xl leading-tight font-bold tracking-tight md:text-6xl">
              브랜드명만 넣으면
              <br />
              <span className="text-brand">AI 검색 노출</span>을 진단해요
            </h1>
            <div className="mx-auto max-w-2xl space-y-2 text-base leading-relaxed text-muted-foreground md:text-lg">
              <p>
                ChatGPT · Gemini 가 우리 브랜드를 얼마나 자주 말하는지, 그리고 이번 주에 할 일 3가지를 한 장으로
                보여 드려요.
              </p>
              <p>마케터 없이 혼자 브랜드를 키우는 분을 위해 만들고 있어요.</p>
            </div>
            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
              <ExampleReportButton />
              <StartButton />
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {keywords.map((k) => (
                <Badge key={k} variant="secondary" className="rounded-full">
                  {k}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 2. 문제 */}
      <section className="px-4 py-16 md:py-28">
        <div className="mx-auto max-w-5xl space-y-10">
          <SectionHead eyebrow="문제" title="AI 가 추천하는 브랜드, 왜 늘 같을까요?" />
          <p className="reveal mx-auto max-w-2xl text-center text-base leading-relaxed text-muted-foreground md:text-lg">
            &ldquo;집들이 선물 디퓨저 추천&rdquo;처럼 AI 에 물으면 늘 같은 브랜드가 나와요. 갓 시작한 브랜드는
            이름이 없고, 어디서부터 손대야 할지 알기 어려워요.
          </p>
          <div className="grid gap-4 md:grid-cols-3">
            {pains.map((p, i) => (
              <Card key={p} className="reveal rounded-2xl">
                <CardHeader className="gap-3">
                  <CardDescription>불편 {i + 1}</CardDescription>
                  <CardTitle className="text-lg leading-snug">{p}</CardTitle>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <Separator />

      {/* 3. 작동 방식 */}
      <section className="px-4 py-16 md:py-28">
        <div className="mx-auto max-w-5xl space-y-10">
          <SectionHead eyebrow="작동 방식" title="세 단계면 돼요" />
          <div className="grid gap-4 md:grid-cols-3">
            {steps.map((s, i) => (
              <Card key={s.label} className={`reveal rounded-2xl ${i === 2 ? "card-glow ring-primary/40" : ""}`}>
                <CardHeader className="gap-4">
                  <Badge variant="secondary" className="w-fit gap-1.5 rounded-full">
                    <CircleDot className="size-3 text-primary" />
                    {i + 1} · {s.label}
                  </Badge>
                  <CardTitle className="text-lg leading-snug">{s.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {i === 1 && (
                    <div className="flex flex-wrap gap-2 pb-1">
                      <Badge variant="outline" className="gap-1 rounded-full">
                        <Crosshair className="size-3" /> 공략형
                      </Badge>
                      <Badge variant="outline" className="gap-1 rounded-full">
                        <Mountain className="size-3" /> 장기형
                      </Badge>
                    </div>
                  )}
                  {s.checks.map((c) => (
                    <p key={c} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CircleCheck className="mt-0.5 size-4 shrink-0 text-primary" />
                      {c}
                    </p>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="reveal flex justify-center">
            <Button asChild variant="ghost">
              <Link href="/app/reports/example">
                리포트가 어떻게 나오는지 예시로 보기 <ArrowRight />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <Separator />

      {/* 4. 이래서 쓰게 돼요 */}
      <section className="px-4 py-16 md:py-28">
        <div className="mx-auto max-w-5xl space-y-10">
          <SectionHead eyebrow="이래서 쓰게 돼요" title="처음엔 놀라고, 계속 분명해져요" />
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="reveal rounded-2xl">
              <CardHeader className="gap-3">
                <CardDescription>처음 써 보면</CardDescription>
                <CardTitle className="text-xl leading-snug">
                  몇 분 안에 &ldquo;AI 가 우리를 얼마나 말하는지&rdquo;와 &ldquo;이번 주 할 일 3개&rdquo;가 나와요
                </CardTitle>
              </CardHeader>
            </Card>
            <Card className="reveal rounded-2xl">
              <CardHeader className="gap-3">
                <CardDescription>계속 쓰게 되는 이유</CardDescription>
                <CardTitle className="text-xl leading-snug">
                  목표로 둔 질문에 우리 브랜드가 오를 때까지, 무엇을 고칠지가 분명해져요
                </CardTitle>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      <Separator />

      {/* 5. 다른 점 */}
      <section className="px-4 py-16 md:py-28">
        <div className="mx-auto max-w-3xl space-y-10">
          <SectionHead
            eyebrow="다른 점"
            title={
              <>
                &ldquo;나오나&rdquo;가 아니라 <span className="text-brand">&ldquo;왜 나오나&rdquo;</span>
              </>
            }
          />
          <Card className="reveal rounded-2xl">
            <CardContent className="divide-y divide-border">
              {differences.map((d, i) => (
                <p key={i} className="py-4 text-base leading-relaxed text-muted-foreground first:pt-0 last:pb-0">
                  {d}
                </p>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* 6. 시작하기 */}
      <section className="px-4 pb-16 md:pb-28">
        <div className="card-glow reveal mx-auto max-w-5xl space-y-6 rounded-2xl border px-6 py-12 text-center md:py-16">
          <h2 className="text-2xl font-bold md:text-4xl">
            우리 브랜드는 <span className="text-brand">AI 에서 몇 번</span> 불릴까요?
          </h2>
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <ExampleReportButton />
            <StartButton />
          </div>
          <p className="text-sm text-muted-foreground">브랜드 입력까지 열려 있어요. 질문 추천 · 진단은 곧 열려요.</p>
        </div>
      </section>

      <Separator />

      {/* 7. 만든 사람 */}
      <section className="px-4 py-16 md:py-20">
        <div className="reveal mx-auto flex max-w-3xl items-start gap-4">
          <Avatar className="size-12">
            <AvatarFallback className="font-semibold">W</AvatarFallback>
          </Avatar>
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">만든 사람</p>
            <p className="text-lg font-bold">The witch</p>
            <p className="text-base leading-relaxed text-muted-foreground">
              니치 프래그런스 브랜드를 직접 준비하며, 내게 필요했던 GEO 도구를 모두가 쓸 수 있게 만들고 있어요.
            </p>
          </div>
        </div>
      </section>

      {/* 8. 푸터 */}
      <footer className="border-t px-4 py-10">
        <div className="mx-auto max-w-5xl space-y-1 text-sm text-muted-foreground">
          <p className="font-semibold text-foreground">GEO 스나이퍼 · 2026</p>
          <p>Built with Claude Code · AI 프로덕트 빌더 클럽 3기</p>
        </div>
      </footer>
    </main>
  );
}
