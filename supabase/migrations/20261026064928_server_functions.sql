-- 서버 전용 DB 기능 2개 (DB.md 8-1). 서버(service_role)만 실행할 수 있다.

-- 하루 사용량을 1 올리고, 상한을 넘으면 되돌린 뒤 false (D-03)
create or replace function public.increment_usage(p_scope text, p_kind text, p_limit int)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_day date := (now() at time zone 'Asia/Seoul')::date;
  v_count int;
begin
  insert into public.usage_counters (day, scope, kind, count)
  values (v_day, p_scope, p_kind, 1)
  on conflict (day, scope, kind) do update set count = public.usage_counters.count + 1
  returning count into v_count;

  if v_count > p_limit then
    update public.usage_counters
    set count = count - 1
    where day = v_day and scope = p_scope and kind = p_kind;
    return false;
  end if;
  return true;
end;
$$;

-- 진단의 처리 대기 칸을 집어 "처리 중"으로 바꾼다. 다른 워커가 집은 칸은 건너뛴다 (D-09)
create or replace function public.claim_run_items(p_run_id uuid, p_limit int)
returns setof public.run_items
language sql
security definer
set search_path = ''
as $$
  update public.run_items
  set status = 'running', locked_at = now(), attempts = attempts + 1
  where id in (
    select id
    from public.run_items
    where run_id = p_run_id
      and attempts < 3
      and (
        status = 'pending'
        or (status = 'running' and locked_at < now() - interval '2 minutes')
      )
    order by question_position, engine, repeat_no
    limit p_limit
    for update skip locked
  )
  returning *;
$$;

revoke all on function public.increment_usage(text, text, int) from public, anon, authenticated;
revoke all on function public.claim_run_items(uuid, int) from public, anon, authenticated;
grant execute on function public.increment_usage(text, text, int) to service_role;
grant execute on function public.claim_run_items(uuid, int) to service_role;
