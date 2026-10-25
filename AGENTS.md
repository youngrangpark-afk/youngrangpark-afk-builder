<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## 2주차 규칙

# GEO 스나이퍼 — 작업 규칙

## 진행 순서
- 6단계: 1 계획 → 2 화면 흐름(FLOW.md) → 3 저장할 데이터(DB.md) → 4 디자인(DESIGN.md) → 5 만들기 → 6 점검·테스트. 사용자가 붙여넣은 단계만 한다.
- 새 대화를 시작하면 PLAN.md · TASKS.md · DECISIONS.md 와 있는 설계 문서(FLOW.md · DB.md · DESIGN.md)부터 읽는다.
- PLAN.md · DECISIONS.md 의 최신 결정이 프롬프트에 적힌 초기 제안보다 우선한다.
- 코드보다 문서가 먼저. PLAN.md 에 없는 기능은 만들지 않는다. 한 번에 태스크 하나만 한다.

## 질문
- 지금 작업 결과를 바꾸는 미정 사항만 한 번에 하나씩 묻는다. 나중에 정해도 되는 건 PLAN.md 미정 사항에 적고 계속한다.
- Claude 는 AskUserQuestion 도구로, Codex 는 번호 붙은 선택지로 보여 주고 답을 기다린다.
- 질문은 "사용자가 보거나 하는 일이 어떻게 달라지는지"로 쓴다. 기술 이름은 괄호 안에만. 선택지는 2~4개, 각각 비용 · 준비할 것 · 이번 2주에 미치는 영향을 쉬운 말로 한 줄. 추천안은 첫 번째에 두고 끝에 "(추천)".
- 사용자가 판단할 필요 없는 구현 방식은 직접 정하고 이유만 알려 준다.
- 답을 받으면 바로 DECISIONS.md 에 기록하고 PLAN.md · TASKS.md 를 갱신한다.
- 사용자가 "모르겠어/알아서 해" 라고 하면 기본값을 정하고 근거를 DECISIONS.md 에 남긴다. 단, 개인정보 공개 범위 · 실제 비용 · 외부 전송에 관한 결정은 "모르겠어"만으로 승인된 것으로 보지 말고 한 번 더 쉬운 말로 확인한다.

## 도구
- GitHub · Vercel · Supabase 는 1주차에 연결한 그대로 쓴다. 다른 DB·백엔드·호스팅으로 바꾸지 않는다. (운영 중인 서비스가 있으면 그 서비스의 기술을 따른다.)
- 1주차 랜딩은 `/`, 제품 화면은 `/app` 아래.
- 화면은 shadcn/ui 컴포넌트와 globals.css 디자인 토큰으로 만든다. 같은 역할의 컴포넌트를 새로 만들지 않는다. 디자인은 DESIGN.md 를 따른다.
- CLI 명령은 설치된 버전의 도움말(`--help`)로 먼저 확인하고 쓴다. 지원하지 않는 명령을 반복하지 않는다. 확인을 못 하면 "미확인"으로 남기고 다른 확인 방법을 안내한다.

## 데이터 · 보안
- Supabase 테이블은 `npx supabase migration new` 로 만든 SQL 파일 → `npx supabase db push` 로만 바꾼다. 대시보드에서 직접 고치지 않는다.
- 모든 테이블에 RLS(행 단위 접근 규칙)를 켜고, 누가 읽고 쓰는지 정책을 DB.md 와 같게 쓴다. 사진·파일 저장소와 서버 기능도 같은 기준으로 막는다.
- 비밀값(API 키, DB 비밀번호, service_role·secret 키)은 `.env.local` 과 Vercel 환경변수에만. 채팅·화면·로그·커밋에 내보내지 않는다.
- 서비스가 "공개해도 된다"고 안내한 값만 NEXT_PUBLIC_ 이름으로 브라우저에서 쓴다. 비밀 키는 이름을 바꿔도 공개하면 안 된다. LLM 등 외부 API 호출은 서버(Route Handler·Server Action)에서만.
- 키가 필요하면 발급 위치와, 키를 채팅에 보내지 않고 `.env.local` 에 넣는 방법을 한 단계씩 안내한다. 채팅창에 키를 붙여넣지 말라고 말한다.
- 키가 없으면 예시 응답(mock)으로 동작시키고, 실제 키로 바꿀 지점을 파일 하나로 분리한다. 예시 응답으로 동작하는 기능은 화면에 "연습용 예시"라고 표시하고, TASKS.md 에는 "화면 완료 · 실제 연결 대기"로 남긴다. 실제 연결과 사용 확인 전에는 완료로 표시하지 않는다.
- 결제는 PG(토스 등) 직접 연동 금지 — Groble(groble.im) 판매 링크 + 운영자 확인으로 처리한다. 선택지에도 직접 연동을 넣지 않는다.
- 개인정보·회사 자료는 가짜 자료로 개발한다. 실제 자료는 사용 권한 · 보내는 곳 · 볼 수 있는 사람 · 삭제 시점을 확인한 뒤 넣는다.
- 시드·더미 데이터로 제품 화면이 비어 보이지 않게 한다. 단 랜딩에는 없는 사용자 수·후기·로고를 넣지 않는다.

## 태스크를 끝낼 때
- `npm run build` 통과 → 커밋 · GitHub push → 배포가 끝났는지와 실패 원인을 확인 → 인터넷 주소에서 그 기능을 직접 확인 → TASKS.md 체크. 배포를 확인하지 못하면 "구현 완료 · 배포 확인 대기"로 남긴다. 자동 배포가 안 되면 원인을 먼저 알려 주고 해결한다.
- 주소를 알려 줄 때는 "이 컴퓨터에서만 열리는 확인용 주소(localhost)"인지 "휴대폰·다른 사람도 열 수 있는 인터넷 주소"인지 함께 적는다.
