"use client";

import { useEffect, useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase/browser";

export type Access = "loading" | "guest" | "member" | "none";

// 대시보드 이용 권한 (D-27): 로그인 안 함 · 운영자가 켜 준 계정 · 그 밖의 계정
export function useDashboardAccess(): Access {
  const [access, setAccess] = useState<Access>("loading");
  useEffect(() => {
    const supabase = getBrowserSupabase();
    let stop = false;
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        if (!stop) setAccess("guest");
        return;
      }
      const { data } = await supabase.from("dashboard_access").select("user_id").eq("user_id", auth.user.id).maybeSingle();
      if (!stop) setAccess(data ? "member" : "none");
    })();
    return () => {
      stop = true;
    };
  }, []);
  return access;
}
