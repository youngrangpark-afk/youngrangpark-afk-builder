"use client";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";

// SITE.md: 시작하기 버튼이 갈 곳 = 준비 중 → 누르면 안내만 띄운다.
export function StartButton() {
  return (
    <Button
      size="lg"
      className="h-12 px-6 text-base"
      onClick={() => toast("곧 열려요. 조금만 기다려 주세요!")}
    >
      곧 열려요
    </Button>
  );
}
