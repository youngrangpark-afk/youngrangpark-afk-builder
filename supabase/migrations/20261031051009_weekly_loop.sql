-- 주간 루프 (D-23, DB.md 8-2): 자동 모드 · 주간 목표 · 액션 상태 · 예약 실행

-- ── 브랜드: 매주 자동 재진단 켜짐/꺼짐 ──
alter table public.brands add column if not exists auto_mode boolean not null default true;

-- ── 진단: 사람이 시작했나(manual) / 매주 자동(weekly) ──
alter table public.diagnosis_runs
  add column if not exists trigger text not null default 'manual' check (trigger in ('manual', 'weekly'));

-- ── 주간 목표 ──
create table public.weekly_goals (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid not null references auth.users (id) on delete cascade,
  brand_id uuid not null references public.brands (id) on delete cascade,
  baseline_run_id uuid not null unique references public.diagnosis_runs (id) on delete cascade,
  result_run_id uuid references public.diagnosis_runs (id) on delete set null,
  metric text not null default 'ai_mentions' check (metric in ('ai_mentions')),
  baseline_value int not null check (baseline_value >= 0),
  total int not null check (total > 0),
  target_value int not null check (target_value >= 0),
  due_date date not null,
  status text not null default 'active' check (status in ('active', 'achieved', 'missed')),
  result_value int check (result_value >= 0),
  evaluated_at timestamptz
);
create index weekly_goals_user_id_idx on public.weekly_goals (user_id);
create index weekly_goals_brand_id_idx on public.weekly_goals (brand_id, created_at desc);
create index weekly_goals_result_run_id_idx on public.weekly_goals (result_run_id);
alter table public.weekly_goals enable row level security;
create policy "weekly_goals: 본인 보기" on public.weekly_goals for select to authenticated
  using (user_id = (select auth.uid()));
revoke all on public.weekly_goals from anon;
revoke insert, update, delete on public.weekly_goals from authenticated;

-- ── 액션(할 일 카드): 실행 초안 · 진행 상태 · 어느 목표의 액션인가 ──
alter table public.task_cards add column if not exists draft text;
alter table public.task_cards
  add column if not exists status text not null default 'auto' check (status in ('auto', 'done', 'skipped'));
alter table public.task_cards add column if not exists goal_id uuid references public.weekly_goals (id) on delete set null;
create index if not exists task_cards_goal_id_idx on public.task_cards (goal_id);
-- 본인은 상태 칸만 바꿀 수 있다 (완료 · 보류 표시 — 선택)
grant update (status) on public.task_cards to authenticated;
create policy "task_cards: 본인 상태 수정" on public.task_cards for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- ── 예약 실행 (D-09): 1분마다 우리 서버의 /api/cron/tick 을 부른다 ──
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

-- 예약 실행이 쓸 비밀값을 Vault 에 넣는 기능 (값은 서버가 환경변수에서 넘긴다 — SQL 파일에는 없다)
create or replace function public.set_cron_secret(p_secret text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from vault.secrets where name = 'geo_cron_secret';
  perform vault.create_secret(p_secret, 'geo_cron_secret');
end;
$$;
revoke all on function public.set_cron_secret(text) from public, anon, authenticated;
grant execute on function public.set_cron_secret(text) to service_role;

select cron.unschedule(jobid) from cron.job where jobname = 'geo-tick';
select cron.schedule(
  'geo-tick',
  '* * * * *',
  $$
  select net.http_post(
    url := 'https://youngrangpark-afk-builder.vercel.app/api/cron/tick',
    headers := jsonb_build_object(
      'content-type', 'application/json',
      'authorization', 'Bearer ' || coalesce(
        (select decrypted_secret from vault.decrypted_secrets where name = 'geo_cron_secret'), ''
      )
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 55000
  );
  $$
);
