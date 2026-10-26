"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

let client: SupabaseClient<Database> | null = null;

// 브라우저용 Supabase. 로그인 상태는 쿠키에 저장돼 서버(/auth/callback)와 함께 쓴다.
// 공개해도 되는 값(URL · publishable 키)만 쓴다. 접근은 RLS(DB.md 5)가 막는다.
export function getBrowserSupabase(): SupabaseClient<Database> {
  client ??= createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
  return client;
}
