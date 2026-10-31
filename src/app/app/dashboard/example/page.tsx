import { redirect } from "next/navigation";

// 예전 주소 — 예시는 한 화면으로 합쳤다 (D-28)
export default function ExampleDashboardPage() {
  redirect("/app/reports/example");
}
