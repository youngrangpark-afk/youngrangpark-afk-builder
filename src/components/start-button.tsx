"use client";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";

// 무료 진단 버튼. `/app` 화면이 아직 없어 누르면 안내만 띄운다 (실제 연결은 T-03).
export function StartButton() {
  return (
    <Button
      size="lg"
      variant="outline"
      className="h-12 px-6 text-base"
      onClick={() => toast("무료 진단은 곧 열려요. 조금만 기다려 주세요!")}
    >
      무료 진단 · 곧 열려요
    </Button>
  );
}
