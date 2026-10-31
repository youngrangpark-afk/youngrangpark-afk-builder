"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useDashboardAccess } from "@/lib/dashboard-access";

// 리포트 맨 위 안내 (D-27). example: 예시 리포트 → 예시 대시보드. 아니면 이용자는 [대시보드로], 그 밖은 [예시 대시보드 보기].
export function DashboardBanner({ example = false }: { example?: boolean }) {
  const access = useDashboardAccess();
  const member = !example && access === "member";
  if (!example && access === "loading") return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-4">
      <p className="text-sm">
        {member ? (
          <>
            <strong>이번 주 목표 · 액션 플랜(실행 초안)</strong>이 대시보드에 자동으로 만들어졌어요.
          </>
        ) : (
          <>
            <strong>매주 자동 관리</strong> — 월요일마다 다시 진단하고 이번 주 목표 · 할 일을 대시보드에서 관리해요.
            {!example && " 이용 중인 브랜드에 열려요."}
          </>
        )}
      </p>
      <Button asChild size="sm" className="bg-brand hover:opacity-90">
        <Link href={member ? "/app/dashboard" : "/app/dashboard/example"}>
          {member ? "대시보드로" : "예시 대시보드 보기"}
        </Link>
      </Button>
    </div>
  );
}
