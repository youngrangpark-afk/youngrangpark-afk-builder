-- 브랜드 다른 표기 (D-26, DB.md 8-3).
-- 입력한 이름 외에 같은 브랜드로 셀 표기. 서버가 진단 시작 때 자동으로 채우고, 오너는 빼기만 한다(선택).
-- 접근 규칙은 brands 의 기존 규칙(본인 보기 · 수정) 그대로.

alter table public.brands
  add column if not exists aliases text[] not null default '{}',
  add column if not exists aliases_checked_at timestamptz;

alter table public.brands
  add constraint brands_aliases_check check (
    cardinality(aliases) <= 8
    and array_position(aliases, '') is null
  );
