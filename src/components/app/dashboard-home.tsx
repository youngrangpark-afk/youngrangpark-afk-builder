"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LayoutDashboard } from "lucide-react";
import { Dashboard, type Brand } from "@/components/app/dashboard";
import { LoginDialog } from "@/components/app/login-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useDashboardAccess } from "@/lib/dashboard-access";
import { getBrowserSupabase } from "@/lib/supabase/browser";

// `/app/dashboard` (D-27): 운영자가 켜 준 계정만 실제 대시보드. 아니면 안내 + 예시 대시보드.
export function DashboardHome() {
  const access = useDashboardAccess();
  const [brands, setBrands] = useState<Brand[] | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);

  useEffect(() => {
    if (access !== "member") return;
    const supabase = getBrowserSupabase();
    let stop = false;
    (async () => {
      // 진단을 한 번이라도 시작한 브랜드만, 최근 진단 순
      const { data: runs } = await supabase
        .from("diagnosis_runs")
        .select("brand_id, created_at")
        .order("created_at", { ascending: false })
        .limit(50);
      const order = [...new Set((runs ?? []).map((r) => r.brand_id))];
      const { data: b } = order.length
        ? await supabase
            .from("brands")
            .select("id, name, category, auto_mode, action_mode, aliases, aliases_checked_at")
            .in("id", order)
        : { data: [] };
      if (!stop) setBrands(order.map((id) => b?.find((x) => x.id === id)).filter((x): x is Brand => !!x));
    })();
    return () => {
      stop = true;
    };
  }, [access]);

  if (access === "loading" || (access === "member" && brands === null)) {
    return <Card className="h-72 animate-pulse rounded-2xl" aria-label="불러오는 중" />;
  }
  if (access === "member" && brands?.length) return <Dashboard brands={brands} />;

  const copy =
    access === "guest"
      ? { title: "로그인하면 내 대시보드를 볼 수 있어요", desc: "대시보드는 이용 중인 분께 열려 있어요. 먼저 예시로 둘러보세요." }
      : access === "none"
        ? {
            title: "대시보드는 이용 중인 분께 열려요",
            desc: "매주 월요일 자동 진단 · 주간 목표 · 액션 플랜 관리는 이용 신청한 브랜드에 제공돼요. 어떤 모습인지 예시로 둘러보세요.",
          }
        : { title: "아직 진단한 브랜드가 없어요", desc: "브랜드를 진단하면 이번 주 목표와 액션 플랜이 여기에 만들어져요." };

  return (
    <Card className="mx-auto max-w-xl rounded-2xl text-center">
      <CardHeader className="gap-2">
        <LayoutDashboard className="mx-auto size-8 text-primary" />
        <CardTitle className="text-xl">{copy.title}</CardTitle>
        <CardDescription className="leading-relaxed">{copy.desc}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap justify-center gap-2">
        {access === "member" ? (
          <Button asChild className="bg-brand hover:opacity-90">
            <Link href="/app">브랜드 진단하기</Link>
          </Button>
        ) : (
          <>
            <Button asChild className="bg-brand hover:opacity-90">
              <Link href="/app/reports/example">예시 대시보드 보기</Link>
            </Button>
            {access === "guest" ? (
              <Button variant="outline" onClick={() => setLoginOpen(true)}>
                로그인
              </Button>
            ) : (
              <Button asChild variant="outline">
                <Link href="/app">무료 진단 해보기</Link>
              </Button>
            )}
          </>
        )}
      </CardContent>
      <LoginDialog open={loginOpen} onOpenChange={setLoginOpen} next="/app/dashboard" />
    </Card>
  );
}
