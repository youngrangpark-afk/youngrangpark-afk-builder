import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

// 서버 전용 Supabase (비밀 키 · RLS 를 건너뛴다). 진단 · 답변 · 리포트 쓰기에만 쓴다 (D-08).
// 이 파일은 브라우저 코드에서 import 하면 빌드가 실패한다 (server-only).
export function getAdminSupabase() {
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!key) throw new Error("SUPABASE_SECRET_KEY 가 없어요.");
  return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
