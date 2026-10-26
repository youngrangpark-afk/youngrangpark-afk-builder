"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  CircleCheck,
  Crosshair,
  Info,
  Loader2,
  Mountain,
  PenLine,
  Plus,
  RotateCcw,
  Sparkles,
  Target,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { LoginDialog } from "@/components/app/login-dialog";
import type { BrandDraft } from "@/lib/draft";
import { readPicks as readStored, writePicks as writeStored, type Picks } from "@/lib/picks";
import {
  isValidQuestionText,
  likelihoodLabel,
  MAX_CUSTOM,
  PICK_COUNT,
  QUESTION_MAX,
  suggestKey,
  type Candidate,
  type CandidateStrategy,
  type Recommendation,
  type SuggestInput,
  type SuggestResult,
} from "@/lib/questions";
import { saveToAccount } from "@/lib/save-to-account";
import { getBrowserSupabase } from "@/lib/supabase/browser";

async function postSuggest(body: object): Promise<SuggestResult> {
  const res = await fetch("/api/questions/suggest", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? "질문을 만들지 못했어요.");
  return data as SuggestResult;
}

// 질문 후보 10개 + 5개 고르기 (T-07 · T-08). 브라우저에서만 그려진다 (부모가 저장값을 읽은 뒤에 그림).
export function CandidatesPanel({ draft }: { draft: BrandDraft }) {
  const input: SuggestInput = { name: draft.name, category: draft.category, benchmarkBrands: draft.benchmarkBrands };
  const key = suggestKey(input);
  const [picks, setPicks] = useState<Picks | null>(() => readStored(key));
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [loginOpen, setLoginOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedTo, setSavedTo] = useState<string | null>(null); // 저장한 계정 이메일
  const router = useRouter();

  // 로그인한 뒤 브라우저의 브랜드 · 질문을 내 계정으로 옮긴다 (T-09). 진단 실행 자체는 T-10 · T-11.
  async function saveForDiagnosis() {
    const current = picks;
    if (!current || current.selected.length !== PICK_COUNT) return;
    setSaving(true);
    try {
      const { data } = await getBrowserSupabase().auth.getUser();
      if (!data.user) {
        setLoginOpen(true);
        return;
      }
      const brandId = await saveToAccount(draft, current);
      setSavedTo(data.user.email ?? "내 계정");

      // 진단 시작 (T-10 · T-11): 무료 1회 · 하루 상한은 서버가 확인한다
      const res = await fetch("/api/diagnosis/start", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ brandId }),
      });
      const result = (await res.json()) as { runId?: string | null; error?: string };
      if (res.ok && result.runId) {
        toast("진단을 시작했어요.");
        router.push(`/app/reports/${result.runId}`);
        return;
      }
      if (res.status === 409 && result.runId) {
        toast(result.error ?? "무료 진단은 1회예요.");
        router.push(`/app/reports/${result.runId}`);
        return;
      }
      toast(result.error ?? "진단을 시작하지 못했어요. 잠시 후 다시 시도해 주세요.");
    } catch (e) {
      toast((e as Error).message || "저장하지 못했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setSaving(false);
    }
  }

  // 메일 링크(/auth/callback)에서 돌아오면 바로 저장한다 (D-05: 돌아오면 이어서 진행)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const login = params.get("login");
    if (!login) return;
    params.delete("login");
    const rest = params.toString();
    window.history.replaceState(null, "", window.location.pathname + (rest ? `?${rest}` : ""));
    if (login === "failed") {
      toast("로그인 링크가 만료됐거나 이미 쓰였어요. 다시 받아 주세요.");
      return;
    }
    void Promise.resolve().then(saveForDiagnosis);
    // 처음 한 번만 (저장된 고른 질문은 첫 렌더 때 이미 읽혀 있다)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (picks) return;
    let cancelled = false;
    postSuggest(input)
      .then((data) => {
        if (cancelled) return;
        const next = {
          isMock: data.isMock,
          candidates: data.candidates,
          selected: [],
          recommendation: data.recommendation,
        };
        writeStored(key, next);
        setPicks(next);
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message || "질문을 만들지 못했어요.");
      });
    return () => {
      cancelled = true;
    };
    // input 은 key 로 대표된다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, attempt, picks]);

  function update(fn: (p: Picks) => Picks) {
    setPicks((prev) => {
      if (!prev) return prev;
      const next = fn(prev);
      writeStored(key, next);
      return next;
    });
  }

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

  if (!picks) {
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

  const selectedSet = new Set(picks.selected);
  const count = picks.selected.length;
  const byStrategy = (s: Candidate["strategy"]) => picks.candidates.filter((c) => c.strategy === s);
  const customs = byStrategy("custom");
  const pickedCount = (s: Candidate["strategy"]) =>
    picks.candidates.filter((c) => c.strategy === s && selectedSet.has(c.id)).length;

  function toggle(id: string) {
    if (!selectedSet.has(id) && count >= PICK_COUNT) {
      toast(`${PICK_COUNT}개까지 고를 수 있어요. 다른 질문을 먼저 빼 주세요.`);
      return;
    }
    update((p) => ({
      ...p,
      selected: p.selected.includes(id) ? p.selected.filter((x) => x !== id) : [...p.selected, id],
    }));
  }

  function saveText(id: string, text: string) {
    update((p) => ({
      ...p,
      candidates: p.candidates.map((c) =>
        c.id === id ? { ...c, text: text.trim(), generatedText: c.generatedText ?? (c.strategy === "custom" ? undefined : c.text) } : c,
      ),
    }));
  }

  async function regenerate(c: Candidate) {
    if (c.strategy === "custom") return;
    const data = await postSuggest({
      ...input,
      replace: { strategy: c.strategy as CandidateStrategy, exclude: picks!.candidates.map((x) => x.text) },
    });
    const fresh = data.candidates[0];
    if (!fresh) {
      toast("더 만들 수 있는 질문이 없어요. 고치기로 바꿔 보세요.");
      return;
    }
    update((p) => ({
      ...p,
      candidates: p.candidates.map((x) => (x.id === c.id ? fresh : x)),
      selected: p.selected.map((id) => (id === c.id ? fresh.id : id)),
      recommendation: p.recommendation && {
        ...p.recommendation,
        ids: p.recommendation.ids.map((id) => (id === c.id ? fresh.id : id)),
      },
    }));
  }

  // 추천 조합 그대로 고르기 (D-18). 이미 고른 것이 있으면 추천 조합으로 바꾼다.
  function applyRecommendation() {
    const rec = picks?.recommendation;
    if (!rec) return;
    update((p) => ({ ...p, selected: rec.ids.slice(0, PICK_COUNT) }));
    toast("추천 조합 5개를 골랐어요. 아래에서 빼거나 바꿀 수 있어요.");
  }

  function addCustom(text: string) {
    const id = `custom-${Date.now().toString(36)}`;
    update((p) => ({
      ...p,
      candidates: [...p.candidates, { id, strategy: "custom", text: text.trim(), rationale: "" }],
      selected: p.selected.length < PICK_COUNT ? [...p.selected, id] : p.selected,
    }));
  }

  function removeCustom(id: string) {
    update((p) => ({
      ...p,
      candidates: p.candidates.filter((c) => c.id !== id),
      selected: p.selected.filter((x) => x !== id),
    }));
  }

  const cardProps = { selectedSet, onToggle: toggle, onSave: saveText, onRegenerate: regenerate, onRemove: removeCustom };

  return (
    <div className="space-y-8 pb-28">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold md:text-3xl">질문 {PICK_COUNT}개를 골라 주세요</h1>
          {picks.isMock && (
            <Badge variant="outline" className="gap-1.5 rounded-full border-primary/50">
              <Info className="size-3" /> 연습용 예시
            </Badge>
          )}
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">
          추천 조합을 그대로 써도 되고, 아래 10개 중 공략형 · 장기형을 자유롭게 섞어 골라도 돼요. 이유와 노출 가능성은
          진단 전 <strong className="text-foreground">예상</strong>이고, 실제 노출은 리포트에서 확인해요.
        </p>
      </div>

      {picks.recommendation && picks.recommendation.ids.length === PICK_COUNT && (
        <RecommendationCard
          rec={picks.recommendation}
          candidates={picks.candidates}
          applied={
            picks.selected.length === PICK_COUNT &&
            picks.recommendation.ids.every((id) => selectedSet.has(id))
          }
          onApply={applyRecommendation}
        />
      )}

      <CandidateGroup
        icon={<Crosshair className="size-4 text-primary" />}
        title="공략형"
        description="지금 상위 노출될 가능성이 비교적 높은 질문"
        items={byStrategy("quick_win")}
        picked={pickedCount("quick_win")}
        {...cardProps}
      />
      <CandidateGroup
        icon={<Mountain className="size-4 text-primary" />}
        title="장기형"
        description="지금은 경쟁이 세도 길게 보고 꼭 잡아야 할 질문"
        items={byStrategy("long_term")}
        picked={pickedCount("long_term")}
        {...cardProps}
      />

      <section className="space-y-3">
        <div className="space-y-1">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <PenLine className="size-4 text-primary" /> 직접 쓰기
            <span className="text-sm font-medium text-muted-foreground">
              {customs.length}/{MAX_CUSTOM}
            </span>
          </h2>
          <p className="text-sm text-muted-foreground">마음에 드는 후보가 없으면 내가 노리는 질문을 직접 넣어요.</p>
        </div>
        {customs.map((c) => (
          <QuestionCard key={c.id} c={c} {...cardProps} />
        ))}
        {customs.length < MAX_CUSTOM && <CustomForm onAdd={addCustom} />}
      </section>

      {savedTo && (
        <Card className="card-glow rounded-2xl ring-primary/40">
          <CardHeader className="gap-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <CircleCheck className="size-5 text-primary" /> 내 계정에 저장됨
            </CardTitle>
            <CardDescription className="leading-relaxed">
              <strong className="text-foreground">{savedTo}</strong> 계정에 브랜드와 질문 5개를 저장했어요. 진단이 시작되지
              않았다면 위쪽 안내를 확인하고 [진단 시작]을 다시 눌러 주세요.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <LoginDialog open={loginOpen} onOpenChange={setLoginOpen} />

      {/* 아래 고정 바 — 정확히 5개일 때만 진단 시작 (D-10) */}
      <div className="fixed inset-x-0 bottom-0 z-10 border-t bg-background/90 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-xl items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold" aria-live="polite">
              {PICK_COUNT}개 중 <span className="text-brand">{count}개</span> 골랐어요
            </p>
            <p className="truncate text-xs text-muted-foreground">
              공략형 {pickedCount("quick_win")} · 장기형 {pickedCount("long_term")} · 직접 {pickedCount("custom")}
            </p>
          </div>
          <Button
            size="lg"
            disabled={count !== PICK_COUNT || saving}
            className="bg-brand h-11 shrink-0 px-5 hover:opacity-90 disabled:bg-none disabled:bg-muted disabled:text-muted-foreground"
            onClick={() => void saveForDiagnosis()}
          >
            진단 시작
          </Button>
        </div>
      </div>
    </div>
  );
}

// 추천 조합 카드 (D-18): 5개 질문 + 왜 이 조합인지 + 예상 결과. 맨 위에 먼저 보여 준다.
function RecommendationCard({
  rec,
  candidates,
  applied,
  onApply,
}: {
  rec: Recommendation;
  candidates: Candidate[];
  applied: boolean;
  onApply: () => void;
}) {
  const items = rec.ids.map((id) => candidates.find((c) => c.id === id)).filter((c): c is Candidate => !!c);
  return (
    <Card className="card-glow rounded-2xl ring-primary/40">
      <CardHeader className="gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="gap-1 rounded-full">
            <Sparkles className="size-3" /> 추천 조합
          </Badge>
          <span className="text-xs text-muted-foreground">
            공략형 {items.filter((c) => c.strategy === "quick_win").length} · 장기형{" "}
            {items.filter((c) => c.strategy === "long_term").length}
          </span>
        </div>
        <CardTitle className="text-lg leading-snug">이 5개로 시작하는 걸 추천해요</CardTitle>
        <CardDescription className="leading-relaxed">
          <span className="font-medium text-foreground">왜</span> · {rec.why}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ol className="space-y-2">
          {items.map((c, i) => (
            <li key={c.id} className="flex items-start gap-2 text-sm">
              <span className="w-4 shrink-0 font-semibold text-muted-foreground tabular-nums">{i + 1}</span>
              <span className="min-w-0 flex-1">
                <span className="font-medium">{c.text}</span>
                <span className="mt-1 flex flex-wrap gap-1.5">
                  <Badge variant="outline" className="gap-1 rounded-full text-[0.7rem]">
                    {c.strategy === "quick_win" ? <Crosshair className="size-3" /> : <Mountain className="size-3" />}
                    {c.strategy === "quick_win" ? "공략형" : "장기형"}
                  </Badge>
                  {c.likelihood && (
                    <Badge variant="secondary" className="rounded-full text-[0.7rem]">
                      예상 노출 {likelihoodLabel[c.likelihood]}
                    </Badge>
                  )}
                </span>
              </span>
            </li>
          ))}
        </ol>
        <p className="flex items-start gap-2 rounded-xl bg-muted p-3 text-sm leading-relaxed text-muted-foreground">
          <Target className="mt-0.5 size-4 shrink-0 text-primary" />
          <span>
            <span className="font-medium text-foreground">예상 결과</span> · {rec.expected}
          </span>
        </p>
        {applied ? (
          <p className="flex items-center gap-2 text-sm font-medium text-primary">
            <CircleCheck className="size-4" /> 추천 조합을 골랐어요. 아래에서 바꿀 수 있어요.
          </p>
        ) : (
          <Button onClick={onApply} className="bg-brand w-full hover:opacity-90 sm:w-auto">
            이 조합으로 고르기
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

type CardHandlers = {
  selectedSet: Set<string>;
  onToggle: (id: string) => void;
  onSave: (id: string, text: string) => void;
  onRegenerate: (c: Candidate) => Promise<void>;
  onRemove: (id: string) => void;
};

function CandidateGroup({
  icon,
  title,
  description,
  items,
  picked,
  ...handlers
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  items: Candidate[];
  picked: number;
} & CardHandlers) {
  return (
    <section className="space-y-3">
      <div className="space-y-1">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          {icon} {title}
          <span className="text-sm font-medium text-muted-foreground">
            {items.length}개 중 {picked}개 고름
          </span>
        </h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="space-y-3">
        {items.map((c) => (
          <QuestionCard key={c.id} c={c} {...handlers} />
        ))}
      </div>
    </section>
  );
}

function QuestionCard({ c, selectedSet, onToggle, onSave, onRegenerate, onRemove }: { c: Candidate } & CardHandlers) {
  const selected = selectedSet.has(c.id);
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(c.text);
  const [busy, setBusy] = useState(false);
  const checkboxId = `pick-${c.id}`;
  const valid = isValidQuestionText(text);

  return (
    <Card className={`rounded-2xl transition-shadow ${selected ? "card-glow ring-primary/50" : ""}`}>
      <CardContent className="space-y-3">
        <div className="flex items-start gap-3">
          <Checkbox
            id={checkboxId}
            checked={selected}
            onCheckedChange={() => onToggle(c.id)}
            className="mt-1 size-5"
            aria-label={`이 질문 고르기: ${c.text}`}
          />
          <div className="min-w-0 flex-1 space-y-2">
            {editing ? (
              <div className="space-y-2">
                <Textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  maxLength={QUESTION_MAX}
                  rows={2}
                  aria-label="질문 고치기"
                  aria-invalid={!valid}
                  className="rounded-xl"
                />
                {!valid && <p className="text-xs text-destructive">2~200자로 써 주세요.</p>}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    disabled={!valid}
                    onClick={() => {
                      onSave(c.id, text);
                      setEditing(false);
                    }}
                  >
                    저장
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setText(c.text);
                      setEditing(false);
                    }}
                  >
                    취소
                  </Button>
                </div>
              </div>
            ) : (
              <label htmlFor={checkboxId} className="block cursor-pointer text-base font-semibold leading-snug">
                {c.text}
              </label>
            )}
            {c.strategy === "custom" ? (
              <p className="text-sm text-muted-foreground">직접 쓴 질문</p>
            ) : (
              <p className="text-sm leading-relaxed text-muted-foreground">
                {c.likelihood && (
                  <Badge variant="secondary" className="mr-1.5 rounded-full align-middle text-[0.7rem]">
                    예상 노출 {likelihoodLabel[c.likelihood]}
                  </Badge>
                )}
                <span className="font-medium text-foreground">예상</span> · {c.rationale}
                {c.generatedText && c.generatedText !== c.text && <span> · 고친 질문</span>}
              </p>
            )}
          </div>
        </div>
        {!editing && (
          <div className="flex flex-wrap gap-1 pl-8">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setText(c.text);
                setEditing(true);
              }}
            >
              <PenLine /> 고치기
            </Button>
            {c.strategy === "custom" ? (
              <Button size="sm" variant="ghost" onClick={() => onRemove(c.id)}>
                <Trash2 /> 지우기
              </Button>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await onRegenerate(c);
                  } catch (e) {
                    toast((e as Error).message || "다시 만들지 못했어요.");
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {busy ? <Loader2 className="animate-spin" /> : <RotateCcw />} 다시 만들기
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CustomForm({ onAdd }: { onAdd: (text: string) => void }) {
  const [text, setText] = useState("");
  const valid = isValidQuestionText(text);
  return (
    <Card className="rounded-2xl border-dashed">
      <CardContent className="space-y-3">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={QUESTION_MAX}
          rows={2}
          placeholder="예: 비 오는 날 어울리는 디퓨저 추천해 줘"
          aria-label="직접 쓸 질문"
          className="rounded-xl"
        />
        <Button
          variant="outline"
          disabled={!valid}
          onClick={() => {
            onAdd(text);
            setText("");
          }}
        >
          <Plus /> 질문 추가
        </Button>
      </CardContent>
    </Card>
  );
}
