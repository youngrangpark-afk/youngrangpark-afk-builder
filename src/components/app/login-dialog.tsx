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

// 구글 "G" 표시 (구글 로그인 버튼 안내에 따른 공식 4색 — 브랜드 표시라 디자인 토큰 예외)
function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" className="size-5">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.3-.4-3.5z" />
    </svg>
  );
}

// [진단 시작] 직전 로그인 (D-03 · D-04). 메일의 링크를 누르면 /auth/callback 을 거쳐 질문 화면으로 돌아온다.
export function LoginDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);
  const [googleBusy, setGoogleBusy] = useState(false);

  // 구글 로그인 (D-15): 같은 창에서 구글에 다녀와 /auth/callback 을 거쳐 질문 화면으로 돌아온다.
  async function google() {
    setError(null);
    setGoogleBusy(true);
    const { error } = await getBrowserSupabase().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/app/questions` },
    });
    if (error) {
      setGoogleBusy(false);
      setError("구글 로그인을 시작하지 못했어요. 잠시 후 다시 시도해 주세요.");
    }
  }

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
                구글 계정이나 이메일로 로그인해요. 비밀번호는 필요 없어요. 결과가 나오면 로그인한 메일로 알려 드려요.
              </DialogDescription>
            </DialogHeader>
            <Button
              type="button"
              size="lg"
              variant="outline"
              disabled={googleBusy}
              onClick={() => void google()}
              className="h-12 w-full text-base"
            >
              {googleBusy ? <Loader2 className="animate-spin" /> : <GoogleMark />} 구글로 계속하기
            </Button>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="h-px flex-1 bg-border" />
              또는 이메일 링크로
              <span className="h-px flex-1 bg-border" />
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              이메일 링크는 <strong className="text-foreground">지금 이 브라우저에서</strong> 메일을 열어 눌러야 로그인돼요.
            </p>
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
