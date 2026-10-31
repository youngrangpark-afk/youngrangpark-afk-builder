"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { parseDraft, saveDraft, toDomain, useDraftRaw, type BrandDraft } from "@/lib/draft";

const categoryPresets = ["프래그런스", "뷰티", "패션", "식품", "리빙"];

// `/app` 브랜드 입력 (T-04). 저장된 초안을 읽은 뒤에 폼을 그린다.
export function BrandFormLoader() {
  const raw = useDraftRaw();
  if (raw === undefined) {
    return <Card className="h-[30rem] animate-pulse rounded-2xl" aria-label="불러오는 중" />;
  }
  return <BrandForm initial={parseDraft(raw)} />;
}

function BrandForm({ initial }: { initial: BrandDraft | null }) {
  const router = useRouter();
  const [name, setName] = useState(initial?.name ?? "");
  const [category, setCategory] = useState(initial?.category ?? "");
  const [site, setSite] = useState(initial?.siteDomain ?? "");
  const [benchmarks, setBenchmarks] = useState<string[]>(() => {
    const b = initial?.benchmarkBrands ?? [];
    return [b[0] ?? "", b[1] ?? "", b[2] ?? ""];
  });
  const [errors, setErrors] = useState<{ name?: string; category?: string; site?: string }>({});

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const next: typeof errors = {};
    if (!name.trim()) next.name = "브랜드명을 넣어 주세요.";
    else if (name.trim().length > 50) next.name = "브랜드명은 50자 안으로 넣어 주세요.";
    if (!category.trim()) next.category = "카테고리를 고르거나 직접 써 주세요.";
    else if (category.trim().length > 50) next.category = "카테고리는 50자 안으로 넣어 주세요.";
    const domain = toDomain(site);
    if (site.trim() && !domain.includes(".")) next.site = "주소 모양이 아니에요. 예: mybrand.com";
    setErrors(next);
    if (Object.keys(next).length) return;

    saveDraft({
      name: name.trim(),
      category: category.trim(),
      siteDomain: domain,
      benchmarkBrands: benchmarks.map((b) => b.trim()).filter(Boolean).slice(0, 3),
    });
    router.push("/app/questions");
  }

  return (
    <Card className="rounded-2xl">
      <CardHeader className="gap-2">
        <CardTitle className="text-2xl font-bold md:text-3xl">어떤 브랜드를 진단할까요?</CardTitle>
        <CardDescription className="text-base">
          브랜드명과 카테고리만 있으면 돼요. 나머지는 비워 둬도 괜찮아요.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} noValidate className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="brand-name">브랜드명</Label>
            <Input
              id="brand-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 우리 브랜드"
              maxLength={50}
              aria-invalid={!!errors.name}
              className="h-11 rounded-xl"
            />
            {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="brand-category">카테고리</Label>
            <div className="flex flex-wrap gap-2">
              {categoryPresets.map((c) => (
                <Button
                  key={c}
                  type="button"
                  size="sm"
                  variant={category === c ? "default" : "outline"}
                  className="rounded-full"
                  onClick={() => setCategory(c)}
                >
                  {c}
                </Button>
              ))}
            </div>
            <Input
              id="brand-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="고르거나 직접 써 주세요"
              maxLength={50}
              aria-invalid={!!errors.category}
              className="h-11 rounded-xl"
            />
            {errors.category && <p className="text-sm text-destructive">{errors.category}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="brand-site">
              사이트 주소 <span className="font-normal text-muted-foreground">(선택)</span>
            </Label>
            <Input
              id="brand-site"
              value={site}
              onChange={(e) => setSite(e.target.value)}
              placeholder="예: mybrand.com"
              inputMode="url"
              aria-invalid={!!errors.site}
              className="h-11 rounded-xl"
            />
            {errors.site ? (
              <p className="text-sm text-destructive">{errors.site}</p>
            ) : (
              <p className="text-xs text-muted-foreground">리포트에서 내 브랜드 사이트 출처를 구분하는 데 써요.</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>
              함께 비교할 기준 브랜드 <span className="font-normal text-muted-foreground">(선택, 최대 3개)</span>
            </Label>
            <div className="grid gap-2 sm:grid-cols-3">
              {benchmarks.map((b, i) => (
                <Input
                  key={i}
                  aria-label={`기준 브랜드 ${i + 1}`}
                  value={b}
                  onChange={(e) => setBenchmarks((prev) => prev.map((x, j) => (j === i ? e.target.value : x)))}
                  placeholder={`기준 브랜드 ${i + 1}`}
                  maxLength={50}
                  className="h-11 rounded-xl"
                />
              ))}
            </div>
            <p className="text-xs text-muted-foreground">비워 둬도 돼요. 경쟁 브랜드는 AI 답변에서 자동으로 찾아요.</p>
          </div>

          <Button type="submit" size="lg" className="bg-brand h-12 w-full text-base hover:opacity-90">
            진단 시작하기 <ArrowRight />
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            추천 질문 5개로 자동 진단해요. 끝나면 이번 주 목표와 액션 플랜이 만들어지고, 매주 월요일 자동으로 다시 재요.
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
