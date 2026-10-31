-- 실행 모드 (D-32, DB.md 8-5).
-- 자동(auto): 할 일을 알아서 진행 · 확인(confirm): 오너가 전략을 보고 승인해야 진행.
-- 접근 규칙은 brands 의 기존 규칙(본인 보기 · 수정) 그대로, 카드 상태는 기존 "본인 상태 수정" 그대로.

alter table public.brands
  add column if not exists action_mode text not null default 'auto' check (action_mode in ('auto', 'confirm'));

-- 할 일 상태에 '승인됨'(approved) 추가
alter table public.task_cards drop constraint if exists task_cards_status_check;
alter table public.task_cards
  add constraint task_cards_status_check check (status in ('auto', 'approved', 'done', 'skipped'));
