"use client";

import Link from "next/link";
import { LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDashboardAccess } from "@/lib/dashboard-access";

// 화면 머리의 [내 대시보드] — 운영자가 켜 준 계정에만 보인다 (D-27)
export function DashboardLink() {
  const access = useDashboardAccess();
  if (access !== "member") return null;
  return (
    <Button asChild size="sm" variant="outline" className="rounded-full">
      <Link href="/app/dashboard">
        <LayoutDashboard /> 내 대시보드
      </Link>
    </Button>
  );
}
