import Link from "next/link";
import { Button } from "@/components/ui/button";

// 랜딩의 [무료 진단 해보기] → `/app` 브랜드 입력 (T-03)
export function StartButton() {
  return (
    <Button asChild size="lg" variant="outline" className="h-12 px-6 text-base">
      <Link href="/app">무료 진단 해보기</Link>
    </Button>
  );
}
