import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

let client: SupabaseClient<Database> | null = null;

// 두 값이 다 있을 때만 연결을 돌려준다. 없으면 null.
export function getSupabase(): SupabaseClient<Database> | null {
  if (!url || !key) return null;
  client ??= createClient<Database>(url, key);
  return client;
}
