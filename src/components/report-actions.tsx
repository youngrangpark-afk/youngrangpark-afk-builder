"use client";

import { toast } from "sonner";
import { FileText, BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";

// 리포트 맨 아래 다음 행동. 지금은 연습용 예시라 누르면 안내만 띄운다 (실제 연결은 5단계 T-18).
export function ReportActions() {
  const practice = () => toast("연습용 예시예요. 실제 서비스에서 열려요.");
  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <Button size="lg" className="bg-brand h-12 px-6 text-base hover:opacity-90" onClick={practice}>
        <FileText /> 상세 리포트 받기 · 1만원
      </Button>
      <Button size="lg" variant="outline" className="h-12 px-6 text-base" onClick={practice}>
        <BellRing /> 유료 플랜 사전 예약
      </Button>
    </div>
  );
}
