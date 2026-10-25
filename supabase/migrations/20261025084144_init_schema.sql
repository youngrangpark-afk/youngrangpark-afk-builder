-- GEO 스나이퍼 M1 스키마. 설계 근거: DB.md (표 · 칸 · 누가 읽고 쓰나 · 제약)
-- 사용자 데이터는 RLS 로 본인만. 진단 · 답변 · 리포트는 서버(service role)만 쓴다 (D-08).

-- ── 공통: updated_at 자동 갱신 ─────────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ── 규칙 표 ────────────────────────────────────────────────
create table public.card_types (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  code text not null unique check (code ~ '^[a-z_]{2,40}$'),
  name text not null,
  description text not null,
  trigger_hint text not null
);

create table public.question_templates (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  category text not null,
  intent text not null,
  template text not null
);

-- ── 1) brands ──────────────────────────────────────────────
create table public.brands (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 50),
  category text not null check (char_length(category) between 1 and 50),
  site_domain text check (site_domain = lower(site_domain) and char_length(site_domain) <= 253),
  benchmark_brands text[] not null default '{}' check (cardinality(benchmark_brands) <= 3)
);
create index brands_user_id_idx on public.brands (user_id);
create trigger brands_updated_at before update on public.brands
  for each row execute function public.set_updated_at();

-- ── 2) questions (후보 10 + 직접 쓴 것, 그중 5개 선택 — D-10) ──
create table public.questions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  brand_id uuid not null references public.brands (id) on delete cascade,
  strategy text not null check (strategy in ('quick_win', 'long_term', 'custom')),
  rationale text check (char_length(rationale) <= 300),
  text text not null check (char_length(text) between 2 and 200),
  generated_text text,
  selected boolean not null default false,
  position smallint check (position between 1 and 5),
  template_id uuid references public.question_templates (id) on delete restrict,
  check ((selected and position is not null) or (not selected and position is null))
);
create index questions_user_id_idx on public.questions (user_id);
create index questions_brand_id_idx on public.questions (brand_id);
create index questions_template_id_idx on public.questions (template_id);
create unique index questions_selected_position_uq
  on public.questions (brand_id, position) where selected;
create trigger questions_updated_at before update on public.questions
  for each row execute function public.set_updated_at();

-- 브랜드당 질문 후보 최대 15개
create or replace function public.questions_limit()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select count(*) from public.questions where brand_id = new.brand_id) >= 15 then
    raise exception 'too many questions for this brand';
  end if;
  return new;
end;
$$;
create trigger questions_limit before insert on public.questions
  for each row execute function public.questions_limit();

-- ── 3) diagnosis_runs ──────────────────────────────────────
create table public.diagnosis_runs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid not null references auth.users (id) on delete cascade,
  brand_id uuid not null references public.brands (id) on delete cascade,
  kind text not null default 'free' check (kind in ('free')),
  brand_key text not null check (char_length(brand_key) between 1 and 253),
  status text not null default 'queued' check (status in ('queued', 'running', 'done', 'failed')),
  engines text[] not null default '{openai,gemini}',
  search_mode text not null default 'web_search',
  repeats smallint not null default 3 check (repeats between 1 and 10),
  total_items int not null default 0 check (total_items >= 0),
  done_items int not null default 0 check (done_items >= 0),
  failed_items int not null default 0 check (failed_items >= 0),
  summary jsonb,
  is_mock boolean not null default false,
  started_at timestamptz,
  finished_at timestamptz,
  notified_at timestamptz
);
create index diagnosis_runs_user_id_idx on public.diagnosis_runs (user_id);
create index diagnosis_runs_brand_id_idx on public.diagnosis_runs (brand_id);
-- 무료 진단: 계정당 1회 + 브랜드(도메인 또는 정규화 이름)당 1회
create unique index diagnosis_runs_free_per_user_uq on public.diagnosis_runs (user_id) where kind = 'free';
create unique index diagnosis_runs_free_per_brand_uq on public.diagnosis_runs (brand_key) where kind = 'free';

-- ── 4) run_items (질문 × 엔진 × 반복 1회) ───────────────────
create table public.run_items (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid not null references auth.users (id) on delete cascade,
  run_id uuid not null references public.diagnosis_runs (id) on delete cascade,
  question_id uuid references public.questions (id) on delete set null,
  question_position smallint not null check (question_position between 1 and 5),
  question_text text not null,
  question_strategy text not null check (question_strategy in ('quick_win', 'long_term', 'custom')),
  engine text not null check (engine in ('openai', 'gemini')),
  repeat_no smallint not null check (repeat_no between 1 and 10),
  status text not null default 'pending' check (status in ('pending', 'running', 'done', 'failed')),
  attempts smallint not null default 0 check (attempts between 0 and 3),
  locked_at timestamptz,
  last_error text,
  done_at timestamptz,
  unique (run_id, question_position, engine, repeat_no)
);
create index run_items_user_id_idx on public.run_items (user_id);
create index run_items_question_id_idx on public.run_items (question_id);
create index run_items_queue_idx on public.run_items (status, created_at);

-- ── 5) engine_answers (원문 — 집계와 별도) ──────────────────
create table public.engine_answers (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid not null references auth.users (id) on delete cascade,
  item_id uuid not null unique references public.run_items (id) on delete cascade,
  run_id uuid not null references public.diagnosis_runs (id) on delete cascade,
  engine text not null check (engine in ('openai', 'gemini')),
  model text not null,
  answer_text text not null,
  raw_response jsonb,
  request_meta jsonb not null default '{}'
);
create index engine_answers_user_id_idx on public.engine_answers (user_id);
create index engine_answers_run_id_idx on public.engine_answers (run_id);

-- ── 6) citations ───────────────────────────────────────────
create table public.citations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid not null references auth.users (id) on delete cascade,
  answer_id uuid not null references public.engine_answers (id) on delete cascade,
  run_id uuid not null references public.diagnosis_runs (id) on delete cascade,
  url text not null,
  domain text not null,
  title text,
  source_type text not null default 'other'
    check (source_type in ('press', 'shopping', 'blog', 'magazine', 'community', 'brand_site', 'other'))
);
create index citations_user_id_idx on public.citations (user_id);
create index citations_answer_id_idx on public.citations (answer_id);
create index citations_run_id_idx on public.citations (run_id);

-- ── 7) mentions ────────────────────────────────────────────
create table public.mentions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid not null references auth.users (id) on delete cascade,
  answer_id uuid not null references public.engine_answers (id) on delete cascade,
  run_id uuid not null references public.diagnosis_runs (id) on delete cascade,
  brand_name text not null,
  role text not null check (role in ('self', 'benchmark', 'competitor')),
  rank smallint check (rank >= 1),
  description text
);
create index mentions_user_id_idx on public.mentions (user_id);
create index mentions_answer_id_idx on public.mentions (answer_id);
create index mentions_run_id_idx on public.mentions (run_id);

-- ── 8) task_cards ──────────────────────────────────────────
create table public.task_cards (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid not null references auth.users (id) on delete cascade,
  run_id uuid not null references public.diagnosis_runs (id) on delete cascade,
  position smallint not null check (position between 1 and 3),
  card_type text not null references public.card_types (code) on delete restrict,
  title text not null,
  body text not null,
  evidence text not null,
  unique (run_id, position)
);
create index task_cards_user_id_idx on public.task_cards (user_id);
create index task_cards_card_type_idx on public.task_cards (card_type);

-- ── 9) waitlist ────────────────────────────────────────────
create table public.waitlist (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid not null unique default auth.uid() references auth.users (id) on delete cascade,
  run_id uuid references public.diagnosis_runs (id) on delete set null,
  note text check (char_length(note) <= 200)
);
create index waitlist_run_id_idx on public.waitlist (run_id);

-- ── 10) report_actions ─────────────────────────────────────
create table public.report_actions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  run_id uuid not null references public.diagnosis_runs (id) on delete cascade,
  action text not null check (action in ('detail_report_click', 'raw_view'))
);
create index report_actions_user_id_idx on public.report_actions (user_id);
create index report_actions_run_id_idx on public.report_actions (run_id);

-- ── 11) usage_counters (서버만) ────────────────────────────
create table public.usage_counters (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  day date not null default (now() at time zone 'Asia/Seoul')::date,
  scope text not null,
  kind text not null check (kind in ('question_gen', 'diagnosis', 'engine_call')),
  count int not null default 0 check (count >= 0),
  unique (day, scope, kind)
);

-- ── 접근 규칙 (RLS) — DB.md 5. 누가 읽고 쓰나 ───────────────
alter table public.card_types enable row level security;
alter table public.question_templates enable row level security;
alter table public.brands enable row level security;
alter table public.questions enable row level security;
alter table public.diagnosis_runs enable row level security;
alter table public.run_items enable row level security;
alter table public.engine_answers enable row level security;
alter table public.citations enable row level security;
alter table public.mentions enable row level security;
alter table public.task_cards enable row level security;
alter table public.waitlist enable row level security;
alter table public.report_actions enable row level security;
alter table public.usage_counters enable row level security; -- 정책 없음 = 서버만

-- 규칙 표: 누구나 보기만
create policy "card_types: 누구나 보기" on public.card_types for select to anon, authenticated using (true);
create policy "question_templates: 누구나 보기" on public.question_templates for select to anon, authenticated using (true);

-- brands: 본인 보기 · 추가 · 수정 · 삭제
create policy "brands: 본인 보기" on public.brands for select to authenticated
  using (user_id = (select auth.uid()));
create policy "brands: 본인 추가" on public.brands for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "brands: 본인 수정" on public.brands for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "brands: 본인 삭제" on public.brands for delete to authenticated
  using (user_id = (select auth.uid()));

-- questions: 본인 보기 · 추가 · 수정 · 삭제 (내 브랜드에만)
create policy "questions: 본인 보기" on public.questions for select to authenticated
  using (user_id = (select auth.uid()));
create policy "questions: 본인 추가" on public.questions for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.brands b where b.id = brand_id and b.user_id = (select auth.uid()))
  );
create policy "questions: 본인 수정" on public.questions for update to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.brands b where b.id = brand_id and b.user_id = (select auth.uid()))
  );
create policy "questions: 본인 삭제" on public.questions for delete to authenticated
  using (user_id = (select auth.uid()));

-- 진단 · 결과 표: 본인 보기만 (쓰기는 서버)
create policy "diagnosis_runs: 본인 보기" on public.diagnosis_runs for select to authenticated
  using (user_id = (select auth.uid()));
create policy "run_items: 본인 보기" on public.run_items for select to authenticated
  using (user_id = (select auth.uid()));
create policy "engine_answers: 본인 보기" on public.engine_answers for select to authenticated
  using (user_id = (select auth.uid()));
create policy "citations: 본인 보기" on public.citations for select to authenticated
  using (user_id = (select auth.uid()));
create policy "mentions: 본인 보기" on public.mentions for select to authenticated
  using (user_id = (select auth.uid()));
create policy "task_cards: 본인 보기" on public.task_cards for select to authenticated
  using (user_id = (select auth.uid()));

-- waitlist: 본인 보기 · 추가 · 삭제
create policy "waitlist: 본인 보기" on public.waitlist for select to authenticated
  using (user_id = (select auth.uid()));
create policy "waitlist: 본인 추가" on public.waitlist for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and (run_id is null or exists (select 1 from public.diagnosis_runs r where r.id = run_id and r.user_id = (select auth.uid())))
  );
create policy "waitlist: 본인 삭제" on public.waitlist for delete to authenticated
  using (user_id = (select auth.uid()));

-- report_actions: 본인 추가만 (내 리포트에만)
create policy "report_actions: 본인 추가" on public.report_actions for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.diagnosis_runs r where r.id = run_id and r.user_id = (select auth.uid()))
  );

-- 로그인 안 한 사람(anon)은 사용자 표에 아무 권한도 없게 기본 권한을 거둔다 (RLS 와 이중 잠금)
revoke all on public.brands, public.questions, public.diagnosis_runs, public.run_items,
  public.engine_answers, public.citations, public.mentions, public.task_cards,
  public.waitlist, public.report_actions, public.usage_counters from anon;
revoke all on public.usage_counters from authenticated;
-- 로그인한 사람도 서버 전용 표에는 쓰기 권한 자체를 주지 않는다
revoke insert, update, delete on public.diagnosis_runs, public.run_items, public.engine_answers,
  public.citations, public.mentions, public.task_cards from authenticated;
revoke update on public.waitlist, public.report_actions from authenticated;
revoke select, delete on public.report_actions from authenticated;
revoke insert, update, delete on public.card_types, public.question_templates from anon, authenticated;
