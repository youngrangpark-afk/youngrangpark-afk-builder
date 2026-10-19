import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <CardTitle className="text-2xl">랜딩 페이지 — 곧 열립니다</CardTitle>
          <CardDescription>AI 프로덕트 빌더 클럽 3기</CardDescription>
        </CardHeader>
      </Card>
    </main>
  );
}
