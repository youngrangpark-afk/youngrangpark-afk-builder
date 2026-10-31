-- 대시보드 이용 권한 (D-27, DB.md 8-4).
-- 운영자가 켜 준 계정만 실제 대시보드 · 매주 자동 재진단. 켜고 끄기는 서버(운영자 스크립트)만.

create table public.dashboard_access (
  user_id uuid primary key references auth.users (id) on delete cascade,
  granted_at timestamptz not null default now(),
  note text check (char_length(note) <= 200)
);

alter table public.dashboard_access enable row level security;
create policy "dashboard_access: 본인 보기" on public.dashboard_access for select to authenticated
  using (user_id = (select auth.uid()));
revoke all on public.dashboard_access from anon;
revoke insert, update, delete on public.dashboard_access from authenticated;
