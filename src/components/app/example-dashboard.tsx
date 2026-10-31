"use client";

import { Dashboard } from "@/components/app/dashboard";
import { exampleBrand, makeExampleDashboard } from "@/lib/mock/example-dashboard";

const brands = [exampleBrand];

// `/app/reports/example` — 누구나 보는 예시 화면 (D-27 · D-28). 저장하지 않는다.
export function ExampleDashboard() {
  return <Dashboard brands={brands} example={makeExampleDashboard} />;
}
