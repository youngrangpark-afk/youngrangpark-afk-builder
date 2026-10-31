import Link from "next/link";
import { DashboardLink } from "@/components/app/dashboard-link";

// 제품 화면(/app) 공통 머리. 서비스 이름을 누르면 랜딩으로 간다. 대시보드 이용자에겐 [내 대시보드] (D-27).
export function AppHeader({ step }: { step?: string }) {
  return (
    <header className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 pt-6">
      <Link href="/" className="text-base font-bold">
        GEO 스나이퍼
      </Link>
      <div className="flex items-center gap-3">
        {step && <span className="text-xs font-medium text-muted-foreground">{step}</span>}
        <DashboardLink />
      </div>
    </header>
  );
}
