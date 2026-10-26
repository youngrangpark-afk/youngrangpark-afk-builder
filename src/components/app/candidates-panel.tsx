"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Crosshair, Info, Loader2, Mountain, PenLine, Plus, RotateCcw, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import type { BrandDraft } from "@/lib/draft";
import {
  isValidQuestionText,
  MAX_CUSTOM,
  PICK_COUNT,
  QUESTION_MAX,
  suggestKey,
  type Candidate,
  type CandidateStrategy,
  type SuggestInput,
  type SuggestResult,
} from "@/lib/questions";

const STORE = "geo-sniper:candidates";

// 브라우저에 저장하는 모양 (D-07): 후보 · 고친 글 · 고른 순서
type Picks = { isMock: boolean; candidates: Candidate[]; selected: string[] };
type Stored = { key: string } & Picks;

function readStored(key: string): Picks | null {
  try {
    const s = JSON.parse(localStorage.getItem(STORE) ?? "null") as Stored | null;
    if (!s || s.key !== key || !Array.isArray(s.candidates)) return null;
    const ids = new Set(s.candidates.map((c) => c.id));
    const selected = Array.isArray(s.selected) ? s.selected.filter((id) => ids.has(id)).slice(0, PICK_COUNT) : [];
    return { isMock: !!s.isMock, candidates: s.candidates, selected };
  } catch {
    return null;
  }
}

function writeStored(key: string, picks: Picks) {
  try {
    localStorage.setItem(STORE, JSON.stringify({ key, ...picks }));
  } catch {
    // 저장이 막혀도 화면에서는 계속 고를 수 있다
  }
}

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

  useEffect(() => {
    if (picks) return;
    let cancelled = false;
    postSuggest(input)
      .then((data) => {
        if (cancelled) return;
        const next = { isMock: data.isMock, candidates: data.candidates, selected: [] };
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
    }));
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
          AI 가 추천한 10개 중 공략형 · 장기형을 자유롭게 섞어 골라요. 고르고 나서 고치거나 직접 써도 돼요. 추천 이유는
          진단 전 <strong className="text-foreground">예상</strong>이고, 실제 노출은 리포트에서 확인해요.
        </p>
      </div>

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
            disabled={count !== PICK_COUNT}
            className="bg-brand h-11 shrink-0 px-5 hover:opacity-90 disabled:bg-none disabled:bg-muted disabled:text-muted-foreground"
            onClick={() => toast("로그인과 진단 시작은 다음 단계(T-09)에서 열려요. 고른 질문은 저장해 뒀어요.")}
          >
            진단 시작
          </Button>
        </div>
      </div>
    </div>
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
