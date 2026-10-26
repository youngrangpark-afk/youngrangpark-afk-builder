"use client";

import type { BrandDraft } from "@/lib/draft";
import type { Picks } from "@/lib/picks";
import { getBrowserSupabase } from "@/lib/supabase/browser";

const SAVED_BRAND = "geo-sniper:saved-brand-id";

// 로그인한 뒤 브라우저의 브랜드 · 질문을 내 계정(DB)으로 옮긴다 (T-09, D-07 · D-16).
// 본인 권한(RLS)으로만 쓴다. 다시 부르면 같은 브랜드 행을 고치고 질문은 새로 바꿔 넣는다.
export async function saveToAccount(draft: BrandDraft, picks: Picks): Promise<string> {
  const supabase = getBrowserSupabase();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("로그인이 필요해요.");

  const brandRow = {
    name: draft.name,
    category: draft.category,
    site_domain: draft.siteDomain || null,
    benchmark_brands: draft.benchmarkBrands,
  };

  // 전에 저장한 브랜드가 있으면 그 행을 고친다 (본인 것이 아니면 RLS 때문에 0건 → 새로 만든다)
  let brandId: string | null = null;
  const remembered = readRemembered();
  if (remembered) {
    const { data } = await supabase.from("brands").update(brandRow).eq("id", remembered).select("id");
    brandId = data?.[0]?.id ?? null;
  }
  if (!brandId) {
    const { data, error } = await supabase.from("brands").insert(brandRow).select("id").single();
    if (error || !data) throw new Error("브랜드를 저장하지 못했어요.");
    brandId = data.id;
  }

  // 질문은 통째로 바꿔 넣는다 (후보 + 고른 5개의 순서)
  const { error: delError } = await supabase.from("questions").delete().eq("brand_id", brandId);
  if (delError) throw new Error("질문을 저장하지 못했어요.");
  const order = new Map(picks.selected.map((id, i) => [id, i + 1]));
  const rows = picks.candidates.map((c) => ({
    brand_id: brandId!,
    strategy: c.strategy,
    text: c.text,
    generated_text: c.strategy === "custom" ? null : (c.generatedText ?? c.text),
    rationale: c.rationale || null,
    selected: order.has(c.id),
    position: order.get(c.id) ?? null,
  }));
  const { error: insError } = await supabase.from("questions").insert(rows);
  if (insError) throw new Error("질문을 저장하지 못했어요.");

  remember(brandId);
  return brandId;
}

function readRemembered(): string | null {
  try {
    return localStorage.getItem(SAVED_BRAND);
  } catch {
    return null;
  }
}

function remember(id: string) {
  try {
    localStorage.setItem(SAVED_BRAND, id);
  } catch {
    // 기억하지 못하면 다음 저장 때 새 행이 생길 뿐이다
  }
}
