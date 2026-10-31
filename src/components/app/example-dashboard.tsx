"use client";

import { Dashboard } from "@/components/app/dashboard";
import { exampleBrand, makeExampleDashboard } from "@/lib/mock/example-dashboard";

const brands = [exampleBrand];

// `/app/dashboard/example` — 누구나 보는 예시 대시보드 (D-27). 저장하지 않는다.
export function ExampleDashboard() {
  return <Dashboard brands={brands} example={makeExampleDashboard} />;
}
