"use client";

import { PICK_COUNT, type Candidate, type Recommendation } from "@/lib/questions";

// 질문 후보 · 고친 글 · 고른 순서 · 추천 조합을 브라우저에 두는 곳 (D-07, D-16, D-18)
export const PICKS_STORE = "geo-sniper:candidates";

export type Picks = { isMock: boolean; candidates: Candidate[]; selected: string[]; recommendation?: Recommendation };
type Stored = { key: string } & Picks;

export function readPicks(key: string): Picks | null {
  try {
    const s = JSON.parse(localStorage.getItem(PICKS_STORE) ?? "null") as Stored | null;
    if (!s || s.key !== key || !Array.isArray(s.candidates)) return null;
    const ids = new Set(s.candidates.map((c) => c.id));
    const selected = Array.isArray(s.selected) ? s.selected.filter((id) => ids.has(id)).slice(0, PICK_COUNT) : [];
    const rec = s.recommendation;
    const recommendation =
      rec && Array.isArray(rec.ids) && typeof rec.why === "string" && typeof rec.expected === "string"
        ? { ...rec, ids: rec.ids.filter((id) => ids.has(id)) }
        : undefined;
    return { isMock: !!s.isMock, candidates: s.candidates, selected, recommendation };
  } catch {
    return null;
  }
}

export function writePicks(key: string, picks: Picks) {
  try {
    localStorage.setItem(PICKS_STORE, JSON.stringify({ key, ...picks }));
  } catch {
    // 저장이 막혀도 화면에서는 계속 고를 수 있다
  }
}
