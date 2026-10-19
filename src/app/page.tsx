import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { StartButton } from "@/components/start-button";

const pains = [
  "어떤 질문을 AI 에 던져 봐야 할지부터 막막하다",
  "\"내 브랜드가 나오나\"만 보면 매번 \"안 나옴\"이라 다음 할 일이 없다",
  "AI 3곳 × 질문 10개를 손으로 묻고 옮겨 적기엔 시간이 너무 든다",
];

const steps = [
  {
    title: "질문과 기준 브랜드 정하기",
    body: "상황 · 가격대별 질문과 함께 묶이고 싶은 기준 브랜드를 정한다",
  },
  {
    title: "세 AI 에 같은 질문 던지기",
    body: "ChatGPT · Gemini · Claude 에 같은 질문을 던져 추천 브랜드와 인용 출처를 모은다",
  },
  {
    title: "이번 주 할 일 받기",
    body: "출처를 매체 종류별로 나눠 \"자료를 깔 곳\"과 이번 주 할 일을 한 장으로 받는다",
  },
];

const brandNeeds = [
  "집들이 · 선물 같은 상황별, 가격대별 질문 세팅",
  "함께 묶이고 싶은 기준 브랜드와 같이 추천되는지",
  "언론 보도 · 쇼핑 검색 · 블로그 · 커뮤니티 중 어디에 배경 자료를 깔아야 하는지",
];

const keywords = ["니치 홈프레이그런스", "GEO", "AI 추천 노출", "브랜드 운영 자동화"];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-sm font-semibold tracking-wide text-muted-foreground">
      {children}
    </p>
  );
}

// 예시 화면 — 제품 첫 화면을 shadcn 컴포넌트로만 그린 것. 실제 데이터가 아니다.
function ExampleScreen() {
  const sources = [
    { label: "블로그", width: "w-4/5" },
    { label: "매거진", width: "w-3/5" },
    { label: "커뮤니티", width: "w-2/5" },
    { label: "쇼핑 검색", width: "w-1/4" },
  ];
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">예시 화면</p>
      <Card className="gap-0 py-0">
        <CardHeader className="border-b py-4">
          <CardTitle className="text-base">이번 주 리포트</CardTitle>
          <CardDescription>질문 · 집들이 선물 디퓨저 추천</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 py-5">
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="outline">ChatGPT</Badge>
            <Badge variant="outline">Gemini</Badge>
            <Badge variant="outline">Claude</Badge>
          </div>
          <div className="space-y-2.5">
            <p className="text-xs font-semibold">기준 브랜드가 인용된 매체</p>
            {sources.map((s) => (
              <div key={s.label} className="flex items-center gap-3">
                <span className="w-16 shrink-0 text-xs text-muted-foreground">
                  {s.label}
                </span>
                <div className="h-1.5 flex-1 bg-muted">
                  <div className={`h-full bg-foreground ${s.width}`} />
                </div>
              </div>
            ))}
          </div>
          <Separator />
          <div className="space-y-2">
            <p className="text-xs font-semibold">이번 주 할 일 3가지</p>
            <ol className="space-y-1.5 text-xs text-muted-foreground">
              <li>1. 자주 인용된 블로그에 제품 소개 자료 보내기</li>
              <li>2. 상세페이지에 향 계열 · 선물 상황 정리하기</li>
              <li>3. 쇼핑 검색에 상품 정보 등록하기</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function Home() {
  return (
    <main className="flex-1">
      {/* 1. 히어로 */}
      <section className="px-4 py-16 md:py-28">
        <div className="mx-auto max-w-4xl space-y-8">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-base font-bold">GEO 스나이퍼</span>
            <Badge variant="outline">지금 검증 중인 아이디어예요</Badge>
          </div>
          <h1 className="text-4xl leading-tight font-bold tracking-tight md:text-6xl">
            AI 추천 목록에
            <br />내 브랜드 자리 만들기
          </h1>
          <div className="max-w-2xl space-y-2 text-lg leading-relaxed text-muted-foreground">
            <p>
              니치 홈프레이그런스 브랜드를 위한 GEO 운영 도구. 기준 브랜드가 왜
              추천되는지 찾아, 이번 주 할 일로 바꿔 드려요.
            </p>
            <p>브랜드 운영을 에이전트로 가볍게.</p>
          </div>
          <StartButton />
          <div className="flex flex-wrap gap-2 pt-2">
            {keywords.map((k) => (
              <Badge key={k} variant="secondary">
                {k}
              </Badge>
            ))}
          </div>
        </div>
      </section>

      <Separator />

      {/* 2. 문제 */}
      <section className="px-4 py-16 md:py-28">
        <div className="mx-auto max-w-5xl space-y-10">
          <div className="reveal max-w-3xl space-y-4">
            <SectionLabel>문제</SectionLabel>
            <h2 className="text-2xl font-bold md:text-4xl">
              늘 같은 브랜드만 추천돼요
            </h2>
            <p className="text-lg leading-relaxed text-muted-foreground">
              &ldquo;집들이 선물 디퓨저 추천&rdquo;을 AI 에 물으면 늘 같은
              브랜드들이 나와요. 갓 런칭한 브랜드는 아무리 찾아봐도 이름이
              없어요. 그 브랜드들이 왜 추천되는지, 나는 어디서부터 손대야 하는지
              알기 어려워요.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {pains.map((p) => (
              <Card key={p} className="reveal">
                <CardContent className="text-base leading-relaxed">{p}</CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <Separator />

      {/* 3. 작동 방식 */}
      <section className="px-4 py-16 md:py-28">
        <div className="mx-auto max-w-5xl space-y-10">
          <div className="reveal max-w-3xl space-y-4">
            <SectionLabel>작동 방식</SectionLabel>
            <h2 className="text-2xl font-bold md:text-4xl">세 단계면 돼요</h2>
          </div>
          <div className="grid gap-10 md:grid-cols-2 md:gap-12">
            <div className="space-y-4">
              {steps.map((s, i) => (
                <Card key={s.title} className="reveal">
                  <CardHeader>
                    <Badge className="mb-2">{i + 1}단계</Badge>
                    <CardTitle className="text-lg">{s.title}</CardTitle>
                    <CardDescription className="text-base leading-relaxed">
                      {s.body}
                    </CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
            <div className="reveal">
              <ExampleScreen />
            </div>
          </div>
        </div>
      </section>

      <Separator />

      {/* 4. 이래서 쓰게 돼요 */}
      <section className="px-4 py-16 md:py-28">
        <div className="mx-auto max-w-5xl space-y-10">
          <div className="reveal max-w-3xl space-y-4">
            <SectionLabel>이래서 쓰게 돼요</SectionLabel>
            <h2 className="text-2xl font-bold md:text-4xl">
              처음엔 놀라고, 계속 열게 돼요
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="reveal">
              <CardHeader>
                <CardDescription>처음 써 보면</CardDescription>
                <CardTitle className="text-xl leading-snug">
                  질문 10개를 넣자마자 &ldquo;이번 주 할 일 3가지&rdquo;가 나와요
                </CardTitle>
              </CardHeader>
            </Card>
            <Card className="reveal">
              <CardHeader>
                <CardDescription>계속 쓰게 되는 이유</CardDescription>
                <CardTitle className="text-xl leading-snug">
                  목표로 둔 질문에 내 브랜드가 오를 때까지, 결과가 나올 때마다
                  다음에 고칠 점을 받아요
                </CardTitle>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      <Separator />

      {/* 5. 다른 점 */}
      <section className="px-4 py-16 md:py-28">
        <div className="reveal mx-auto max-w-3xl space-y-8">
          <div className="space-y-4">
            <SectionLabel>다른 점</SectionLabel>
            <h2 className="text-2xl font-bold md:text-4xl">
              &ldquo;나오나&rdquo;가 아니라 &ldquo;왜 나오나&rdquo;
            </h2>
          </div>
          <div className="space-y-4 text-lg leading-relaxed">
            <p>
              범용 GEO 툴은 &ldquo;내 브랜드가 나오나&rdquo;를 보여주고, GEO
              스나이퍼는 &ldquo;기준 브랜드는 왜 나오나&rdquo;를 보여줘요.
            </p>
            <Separator />
            <p>
              무료 GPT 에 직접 물으면 한 번의 답이지만, GEO 스나이퍼는 세 AI 의
              답과 출처를 같은 기준으로 모아 할 일로 정리해요.
            </p>
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                니치 홈프레이그런스 브랜드라서 필요한 것
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-base leading-relaxed text-muted-foreground">
                {brandNeeds.map((n) => (
                  <li key={n}>— {n}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      <Separator />

      {/* 6. 가격 · 시작 방법 — SITE.md 에서 "준비 중" 이라 뺀다 */}

      {/* 7. 시작하기 */}
      <section className="px-4 py-16 md:py-28">
        <div className="reveal mx-auto max-w-3xl space-y-6 text-center">
          <h2 className="text-2xl font-bold md:text-4xl">
            AI 추천 목록, 이제 이유부터 봐요
          </h2>
          <p className="text-lg text-muted-foreground">
            아직 준비 중이에요. 조금만 기다려 주세요.
          </p>
          <StartButton />
        </div>
      </section>

      <Separator />

      {/* 8. 만든 사람 */}
      <section className="px-4 py-16 md:py-28">
        <div className="reveal mx-auto flex max-w-3xl items-start gap-4">
          <Avatar className="size-12">
            <AvatarFallback className="font-semibold">W</AvatarFallback>
          </Avatar>
          <div className="space-y-1">
            <SectionLabel>만든 사람</SectionLabel>
            <p className="text-lg font-bold">The witch</p>
            <p className="text-base leading-relaxed text-muted-foreground">
              니치 홈프레이그런스 브랜드를 직접 준비하며, 내게 필요한 GEO 도구를
              만들고 있어요.
            </p>
          </div>
        </div>
      </section>

      {/* 9. 푸터 */}
      <footer className="border-t px-4 py-10">
        <div className="mx-auto max-w-5xl space-y-1 text-sm text-muted-foreground">
          <p className="font-semibold text-foreground">GEO 스나이퍼 · 2026</p>
          <p>Built with Claude Code · AI 프로덕트 빌더 클럽 3기</p>
        </div>
      </footer>
    </main>
  );
}
