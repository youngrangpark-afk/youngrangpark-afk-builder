import { NextResponse, type NextRequest } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";

// 로그인 링크(메일) · 구글 로그인이 돌아오는 주소 (T-09). 화면 없이 처리하고 원래 화면으로 보낸다.
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get("code");
  const next = safeNext(url.searchParams.get("next"));
  const back = new URL(next, url.origin);

  if (code) {
    const supabase = await getServerSupabase();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      back.searchParams.set("login", "ok");
      return NextResponse.redirect(back);
    }
  }
  back.searchParams.set("login", "failed");
  return NextResponse.redirect(back);
}

// 다른 사이트로 튕겨 보내지 않게 우리 사이트 안의 `/app` 주소만 허용한다
function safeNext(next: string | null): string {
  if (next && next.startsWith("/app") && !next.startsWith("//")) return next;
  return "/app/questions";
}
