import Link from "next/link";

// 제품 화면(/app) 공통 머리. 서비스 이름을 누르면 랜딩으로 간다.
export function AppHeader({ step }: { step?: string }) {
  return (
    <header className="mx-auto flex max-w-5xl items-center justify-between px-4 pt-6">
      <Link href="/" className="text-base font-bold">
        GEO 스나이퍼
      </Link>
      {step && <span className="text-xs font-medium text-muted-foreground">{step}</span>}
    </header>
  );
}
