"use client";

import { useState } from "react";
import { Loader2, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getBrowserSupabase } from "@/lib/supabase/browser";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// [진단 시작] 직전 로그인 (D-03 · D-04). 메일의 링크를 누르면 /auth/callback 을 거쳐 질문 화면으로 돌아온다.
export function LoginDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!EMAIL.test(email.trim())) {
      setError("이메일 주소를 확인해 주세요.");
      return;
    }
    setError(null);
    setState("sending");
    const { error } = await getBrowserSupabase().auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/app/questions` },
    });
    if (error) {
      setState("idle");
      setError(
        error.status === 429
          ? "메일을 너무 자주 보냈어요. 1분쯤 뒤에 다시 시도해 주세요."
          : "로그인 링크를 보내지 못했어요. 잠시 후 다시 시도해 주세요.",
      );
      return;
    }
    setState("sent");
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v && state === "sent") setState("idle");
      }}
    >
      <DialogContent className="rounded-2xl sm:max-w-md">
        {state === "sent" ? (
          <div className="space-y-4 py-2 text-center">
            <MailCheck className="mx-auto size-10 text-primary" />
            <DialogHeader className="items-center text-center">
              <DialogTitle className="text-xl">메일함을 확인해 주세요</DialogTitle>
              <DialogDescription className="text-base leading-relaxed">
                <strong className="text-foreground">{email.trim()}</strong> 로 로그인 링크를 보냈어요. 링크를 누르면 이
                화면으로 돌아와요. 고른 질문은 그대로 있어요.
              </DialogDescription>
            </DialogHeader>
            <Button variant="ghost" onClick={() => setState("idle")}>
              다른 메일로 다시 보내기
            </Button>
          </div>
        ) : (
          <form onSubmit={send} noValidate className="space-y-5">
            <DialogHeader>
              <DialogTitle className="text-xl">진단을 시작하려면 로그인해 주세요</DialogTitle>
              <DialogDescription className="leading-relaxed">
                이메일로 로그인 링크를 보내 드려요. 비밀번호는 필요 없어요. 결과가 나오면 이 메일로 알려 드려요.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="login-email">이메일</Label>
              <Input
                id="login-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="me@example.com"
                aria-invalid={!!error}
                className="h-11 rounded-xl"
              />
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
            <Button type="submit" size="lg" disabled={state === "sending"} className="bg-brand h-12 w-full hover:opacity-90">
              {state === "sending" ? <Loader2 className="animate-spin" /> : null} 로그인 링크 받기
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              이메일은 로그인과 결과 알림에만 써요. 다른 곳에 보내지 않아요.
            </p>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
