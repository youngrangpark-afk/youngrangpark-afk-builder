-- 카테고리 이름 "홈프레이그런스" → "프래그런스" (D-17).
-- 향수 · 홈 · 바디를 함께 하는 향 브랜드(이솝 · 바이레도 형)를 한 카테고리로 묶는다.

update public.question_templates
set category = '프래그런스'
where category = '홈프레이그런스';

update public.question_templates
set template = replace(template, '니치 홈프레이그런스', '니치 프래그런스')
where template like '%니치 홈프레이그런스%';
