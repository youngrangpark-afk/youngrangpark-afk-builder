"use client";

import { useSyncExternalStore } from "react";

// 로그인 전 입력은 브라우저(localStorage)에만 둔다 (D-07). 로그인하면 DB 로 옮기고 지운다 (T-09).
export type BrandDraft = {
  name: string;
  category: string;
  siteDomain: string; // 비어 있으면 입력 안 함
  benchmarkBrands: string[]; // 0~3개 (D-02)
};

const KEY = "geo-sniper:brand-draft";
const EVENT = "geo-sniper:draft-change";

export const emptyDraft: BrandDraft = { name: "", category: "", siteDomain: "", benchmarkBrands: [] };

// 사이트 주소에서 도메인만 뽑는다. "https://www.Example.com/shop" → "example.com"
export function toDomain(input: string): string {
  const raw = input.trim().toLowerCase();
  if (!raw) return "";
  try {
    const url = new URL(raw.includes("://") ? raw : `https://${raw}`);
    return url.hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export function parseDraft(raw: string | null): BrandDraft | null {
  if (!raw) return null;
  try {
    const d = JSON.parse(raw) as Partial<BrandDraft>;
    if (typeof d.name !== "string" || !d.name.trim()) return null;
    return {
      name: d.name,
      category: typeof d.category === "string" ? d.category : "",
      siteDomain: typeof d.siteDomain === "string" ? d.siteDomain : "",
      benchmarkBrands: Array.isArray(d.benchmarkBrands)
        ? d.benchmarkBrands.filter((b): b is string => typeof b === "string" && !!b.trim()).slice(0, 3)
        : [],
    };
  } catch {
    return null;
  }
}

export function saveDraft(draft: BrandDraft) {
  try {
    localStorage.setItem(KEY, JSON.stringify(draft));
    window.dispatchEvent(new Event(EVENT));
  } catch {
    // 개인 창 등에서 저장이 막혀도 화면 이동은 계속된다
  }
}

function readRaw(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

// 저장된 초안 원문. 서버에서 그릴 때는 undefined (아직 모름), 브라우저에서는 문자열 또는 null.
export function useDraftRaw(): string | null | undefined {
  return useSyncExternalStore(subscribe, readRaw, () => undefined);
}
