-- 무료 1회 규칙 삭제 (D-22): 나와 1~2명의 테스트용 도구로 쓰므로 같은 계정 · 브랜드도 여러 번 진단한다.
-- 대신 서버가 계정당 20회 · 전체 하루 50회로 막는다.
drop index if exists public.diagnosis_runs_free_per_user_uq;
drop index if exists public.diagnosis_runs_free_per_brand_uq;
