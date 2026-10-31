// 주간 목표 규칙 (D-23). 지표 = AI 답변 노출 수 (예: 30번 중 8번).

const KST = 9 * 3600e3;

// 목표 = 지금 + max(3번, 지금의 30%), 최대는 전체 횟수
export function nextTarget(baseline: number, total: number): number {
  return Math.min(total, baseline + Math.max(3, Math.ceil(baseline * 0.3)));
}

// 마감 = 다음 주 월요일 (한국 시간). 오늘이 월요일이면 7일 뒤.
export function nextMonday(from = new Date()): string {
  const kst = new Date(from.getTime() + KST);
  const day = kst.getUTCDay(); // 0 일 ~ 6 토
  const add = day === 1 ? 7 : (8 - day) % 7 || 7;
  const d = new Date(Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate() + add));
  return d.toISOString().slice(0, 10);
}

// 이번 주 월요일 09:00 (한국 시간)을 UTC 시각으로
export function thisMondayNineKst(now = new Date()): Date {
  const kst = new Date(now.getTime() + KST);
  const back = (kst.getUTCDay() + 6) % 7; // 월요일까지 며칠 전
  const mon = Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate() - back, 9, 0, 0);
  return new Date(mon - KST);
}
