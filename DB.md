# GEO 스나이퍼 — 저장할 데이터 (DB)

> 3단계 문서. 근거: PLAN.md · FLOW.md · DECISIONS.md (D-01 검색 켠 모드 · D-02 경쟁사 자동 + 기준 브랜드 · D-03 진단 시작 직전 로그인 · D-04 이메일 매직링크 · D-05 돌아오면 바로 시작 · D-06 완료 메일)
> 저장소: Supabase Postgres (서울 리전, 1주차에 연결한 프로젝트)

## 0. 어디에 저장하나
| 무엇 | 어디에 | 언제까지 |
|---|---|---|
| 로그인 **전** 브랜드 입력 · 추천 질문 후보 10개 · 고른 질문 | 사용자 브라우저(localStorage) | 로그인 후 DB 로 옮기면 지움 (D-03, D-07) |
| 브랜드 · 질문 · 진단 · 답변 원문 · 리포트 · 사전 예약 | Supabase DB | 회원이 탈퇴(계정 삭제)하면 같이 지워짐 |
| 이메일 | Supabase Auth (auth.users) — 우리 표에는 따로 저장하지 않음 | 계정 삭제 시 |
| 하루 사용량 집계 | Supabase DB (서버만 접근) | 30일 지나면 지워도 됨 |
| 백업 | Supabase 무료 플랜 기본 백업에 맡긴다. 표 구조는 `supabase/migrations/` SQL 파일로 GitHub 에 남는다 | — |

## 1. 로그인
- 로그인이 필요한 사람: [진단 시작]을 누르는 사람부터 (D-03). 랜딩 · 브랜드 입력 · 질문 확인은 로그인 없이.
- 방식: Supabase Auth 이메일 매직링크 (D-04). 카카오 · 구글은 실제 사용자가 생긴 뒤.
- 메일 발송: Supabase 기본 메일은 시간당 보낼 수 있는 양이 아주 적다 → 메일 발송 서비스(예: Resend)를 Supabase 로그인 메일(SMTP)과 완료 메일에 함께 쓴다 (D-06, T-21).

## 2. 표 목록
| # | 표 | 한 줄 설명 |
|---|---|---|
| 1 | `brands` | 회원이 진단할 브랜드 (이름 · 카테고리 · 사이트 주소 · 기준 브랜드) |
| 2 | `questions` | 브랜드별 추천 질문 후보 10개(공략형 5 · 장기형 5)와 회원이 고른 5개 (AI 원본 · 고친 글 · 추천 이유) (D-10) |
| 3 | `diagnosis_runs` | 진단 1회 (상태 · 조건 · 진행률 · 완료 메일 보낸 시각) |
| 4 | `run_items` | 진단을 쪼갠 작업 한 칸 = 질문 × 엔진 × 반복 1회 (순서대로 처리 · 실패만 재시도) |
| 5 | `engine_answers` | 작업 한 칸의 AI 답변 **원문** + 응답 전체(재분석용) |
| 6 | `citations` | 답변이 인용한 출처 URL 하나씩 + 매체 종류(블로그 · 매거진 등) |
| 7 | `mentions` | 답변에 나온 브랜드 하나씩 + AI 가 그 브랜드를 설명한 문장 |
| 8 | `task_cards` | 리포트의 이번 주 할 일 카드 3장 + 근거 데이터 |
| 9 | `waitlist` | 유료 플랜 사전 예약 |
| 10 | `report_actions` | 리포트 이후 행동 기록 (상세 리포트 버튼 클릭 등) |
| 11 | `usage_counters` | 하루 호출 상한용 집계 (서버만) |
| 12 | `card_types` | 할 일 카드 유형 목록 (규칙 데이터, 운영자가 SQL 로 관리) |
| 13 | `question_templates` | 카테고리별 한국어 질문 틀 (규칙 데이터, 운영자가 SQL 로 관리) |

## 3. 표별 칸
공통: 모든 표에 `id uuid 기본 gen_random_uuid()` · `created_at timestamptz 기본 now()`. 사용자 데이터 표(1~10)에는 `user_id uuid 필수 → auth.users` (누구 것인지).

### 1) brands
| 칸 | 종류 | 필수 | 기본값 | 설명 |
|---|---|---|---|---|
| name | text | ✓ | | 브랜드명 (1~50자) |
| category | text | ✓ | | 카테고리 (예: 홈프레이그런스) |
| site_domain | text | | | 사이트 주소에서 뽑은 도메인 (예: example.com). 소문자 저장 |
| benchmark_brands | text[] | ✓ | `{}` | 함께 비교할 기준 브랜드, 0~3개 (D-02) |
| updated_at | timestamptz | ✓ | now() | |

### 2) questions
| 칸 | 종류 | 필수 | 기본값 | 설명 |
|---|---|---|---|---|
| brand_id | uuid | ✓ | | → brands |
| strategy | text | ✓ | | `quick_win` 🎯 공략형 · `long_term` 🏔 장기형 · `custom` 회원이 직접 쓴 질문 (D-10) |
| rationale | text | | | 추천 이유 한 줄 (AI 의 추정, 화면에 "예상"으로 표시) |
| text | text | ✓ | | 지금 쓰는 질문 (회원이 고쳤으면 고친 글) |
| generated_text | text | | | AI 가 처음 만든 원본 (고치기 전) |
| selected | boolean | ✓ | false | 진단에 쓰도록 골랐나 |
| position | smallint | | | 고른 질문의 순서 1~5 (안 골랐으면 비움) |
| template_id | uuid | | | → question_templates (어느 틀에서 나왔나) |
| updated_at | timestamptz | ✓ | now() | |

### 3) diagnosis_runs
| 칸 | 종류 | 필수 | 기본값 | 설명 |
|---|---|---|---|---|
| brand_id | uuid | ✓ | | → brands |
| kind | text | ✓ | `'free'` | `free` (M1 은 무료만) |
| brand_key | text | ✓ | | 무료 1회 판단용: site_domain 이 있으면 그것, 없으면 브랜드명을 소문자 · 공백 제거한 값 |
| status | text | ✓ | `'queued'` | `queued` · `running` · `done` · `failed` |
| engines | text[] | ✓ | `{openai,gemini}` | 측정 엔진 |
| search_mode | text | ✓ | `'web_search'` | 검색 조건 (D-01). 리포트에 그대로 표시 |
| repeats | smallint | ✓ | 3 | 질문당 반복 횟수 (1~10, 최종값은 PLAN 미정 사항) |
| total_items / done_items / failed_items | int | ✓ | 0 | 진행률 |
| summary | jsonb | | | 노출 빈도 · 경쟁사 위치 · 출처 집계 (원본 표에서 다시 계산 가능) |
| is_mock | boolean | ✓ | false | 키가 없어 "연습용 예시"로 돈 진단인지 |
| started_at / finished_at / notified_at | timestamptz | | | 시작 · 끝 · 완료 메일 보낸 시각 (D-06) |

### 4) run_items
| 칸 | 종류 | 필수 | 기본값 | 설명 |
|---|---|---|---|---|
| run_id | uuid | ✓ | | → diagnosis_runs |
| question_id | uuid | | | → questions (질문을 나중에 지워도 기록은 남게 비워질 수 있음) |
| question_text | text | ✓ | | 진단 당시 질문 글 (스냅숏) |
| question_strategy | text | ✓ | | 진단 당시 질문 종류 (스냅숏, 리포트에서 공략형 · 장기형 구분용) |
| engine | text | ✓ | | `openai` · `gemini` |
| repeat_no | smallint | ✓ | | 1~repeats |
| status | text | ✓ | `'pending'` | `pending` · `running` · `done` · `failed` |
| attempts | smallint | ✓ | 0 | 시도 횟수 (최대 3) |
| locked_at | timestamptz | | | 워커가 집어 간 시각 (두 워커가 같은 칸을 동시에 처리하지 않게) |
| last_error | text | | | 마지막 실패 이유 (키 · 개인정보 없이) |
| done_at | timestamptz | | | |

### 5) engine_answers
| 칸 | 종류 | 필수 | 기본값 | 설명 |
|---|---|---|---|---|
| item_id | uuid | ✓ | | → run_items (한 칸에 답 하나) |
| run_id | uuid | ✓ | | → diagnosis_runs (조회 편하게) |
| engine / model | text | ✓ | | 엔진과 모델 이름 |
| answer_text | text | ✓ | | 답변 **원문** |
| raw_response | jsonb | | | API 응답 전체 (재분석용, 키는 들어가지 않음) |
| request_meta | jsonb | ✓ | `{}` | 검색 조건 · 지역 · 언어 등 요청 설정 |

### 6) citations
| 칸 | 종류 | 필수 | 기본값 | 설명 |
|---|---|---|---|---|
| answer_id | uuid | ✓ | | → engine_answers |
| run_id | uuid | ✓ | | → diagnosis_runs |
| url | text | ✓ | | 인용 URL |
| domain | text | ✓ | | 도메인 |
| title | text | | | 제목 |
| source_type | text | ✓ | `'other'` | `press` 언론 · `shopping` 쇼핑 검색 · `blog` · `magazine` · `community` · `brand_site` · `other` |

### 7) mentions
| 칸 | 종류 | 필수 | 기본값 | 설명 |
|---|---|---|---|---|
| answer_id | uuid | ✓ | | → engine_answers |
| run_id | uuid | ✓ | | → diagnosis_runs |
| brand_name | text | ✓ | | 답변에 나온 브랜드 |
| role | text | ✓ | | `self` 내 브랜드 · `benchmark` 내가 넣은 기준 브랜드 · `competitor` 자동으로 찾은 경쟁사 (D-02) |
| rank | smallint | | | 답변 안에서 몇 번째로 나왔나 |
| description | text | | | AI 가 그 브랜드를 설명한 문장 |

### 8) task_cards
| 칸 | 종류 | 필수 | 기본값 | 설명 |
|---|---|---|---|---|
| run_id | uuid | ✓ | | → diagnosis_runs |
| position | smallint | ✓ | | 1~3 |
| card_type | text | ✓ | | → card_types.code |
| title / body | text | ✓ | | 카드 제목 · 내용 |
| evidence | text | ✓ | | 근거 데이터 한 줄 (예: "기준 브랜드 인용의 ○%가 블로그") |

### 9) waitlist
| 칸 | 종류 | 필수 | 기본값 | 설명 |
|---|---|---|---|---|
| run_id | uuid | | | 어느 리포트에서 눌렀나 |
| note | text | | | 원하는 것 한 줄 (선택, 200자) |

### 10) report_actions
| 칸 | 종류 | 필수 | 기본값 | 설명 |
|---|---|---|---|---|
| run_id | uuid | ✓ | | → diagnosis_runs |
| action | text | ✓ | | `detail_report_click` (Groble 버튼) · `raw_view` (원문 펼침) |

### 11) usage_counters (서버만)
| 칸 | 종류 | 필수 | 기본값 | 설명 |
|---|---|---|---|---|
| day | date | ✓ | 오늘(한국 시간) | |
| scope | text | ✓ | | `global` 전체 · `user:<id>` · `ip:<해시>` |
| kind | text | ✓ | | `question_gen` · `diagnosis` · `engine_call` |
| count | int | ✓ | 0 | |

### 12) card_types (규칙)
| 칸 | 종류 | 필수 | 설명 |
|---|---|---|---|
| code | text | ✓ (고유) | 예: `site_info`, `faq_content`, `external_mention`, `review_community`, `shopping_listing`, `press_release` |
| name / description | text | ✓ | 화면에 보일 이름 · 설명 |
| trigger_hint | text | ✓ | 어떤 진단 결과일 때 고르나 (예: "기준 브랜드 인용 중 블로그 비율이 높을 때") |

### 13) question_templates (규칙)
| 칸 | 종류 | 필수 | 설명 |
|---|---|---|---|
| category | text | ✓ | 카테고리 (`*` 은 모든 카테고리) |
| intent | text | ✓ | 상황 · 가격대 · 비교 · 추천 등 질문 유형 |
| template | text | ✓ | 예: "{상황} 선물로 {카테고리} 추천해 줘" |

## 4. 관계 (지우면 같이 지워지나)
```
auth.users ─┬─ brands ─┬─ questions
            │          └─ diagnosis_runs ─┬─ run_items ── engine_answers ─┬─ citations
            │                             │                               └─ mentions
            │                             ├─ task_cards
            │                             ├─ report_actions
            │                             └─ waitlist(run_id, 비워질 수 있음)
            └─ (모든 사용자 표의 user_id)
card_types ── task_cards.card_type      question_templates ── questions.template_id
```
- 회원 계정을 지우면 → 그 회원의 모든 표 행이 같이 지워진다.
- 브랜드를 지우면 → 질문 · 진단 · 진단 아래 모든 것이 같이 지워진다.
- 진단을 지우면 → 작업 칸 · 답변 · 출처 · 언급 · 카드 · 행동 기록이 같이 지워진다. 사전 예약은 남고 run_id 만 비워진다.
- 질문을 지우면 → 지난 진단의 작업 칸은 남고 question_id 만 비워진다 (질문 글은 스냅숏으로 남아 있음).
- 규칙 표(card_types · question_templates)는 쓰이는 중이면 지울 수 없다.

## 5. 누가 읽고 쓰나 (접근 규칙 = RLS)
운영자 = 서비스 운영자(나). **앱 화면에서는 운영자도 남의 자료를 못 본다.** 운영자는 Supabase 대시보드(관리자 권한)로만 본다.
서버 = 우리 서버 코드(Route Handler)가 비밀 키(service role)로 쓰는 것. 브라우저에는 이 키가 절대 가지 않는다.

| 표 | 로그인 안 한 사람 | 로그인한 본인 | 다른 사용자 | 운영자 | 서버 |
|---|---|---|---|---|---|
| brands | ✗ | 보기 · 추가 · 수정 · 삭제 | ✗ | 대시보드로 보기 | 전부 |
| questions | ✗ | 보기 · 추가 · 수정 · 삭제 | ✗ | 대시보드로 보기 | 전부 |
| diagnosis_runs | ✗ | 보기 (추가 · 수정은 서버가) | ✗ | 대시보드로 보기 | 전부 |
| run_items | ✗ | 보기 | ✗ | 대시보드로 보기 | 전부 |
| engine_answers | ✗ | 보기 | ✗ | 대시보드로 보기 | 전부 |
| citations | ✗ | 보기 | ✗ | 대시보드로 보기 | 전부 |
| mentions | ✗ | 보기 | ✗ | 대시보드로 보기 | 전부 |
| task_cards | ✗ | 보기 | ✗ | 대시보드로 보기 | 전부 |
| waitlist | ✗ | 보기 · 추가 · 삭제 | ✗ | 대시보드로 보기 (예약 명단) | 전부 |
| report_actions | ✗ | 추가 | ✗ | 대시보드로 보기 | 전부 |
| usage_counters | ✗ | ✗ | ✗ | 대시보드로 보기 | 전부 |
| card_types | 보기 | 보기 | 보기 | SQL 파일로 수정 | 전부 |
| question_templates | 보기 | 보기 | 보기 | SQL 파일로 수정 | 전부 |

- 진단 · 답변 · 리포트(3~8번 표)는 **회원이 직접 쓰지 못한다.** 서버만 쓴다. 그래야 결과를 조작하거나 무료 1회 제한을 우회할 수 없다.
- 진단 시작은 서버 기능(Route Handler)으로만: 로그인 확인 → 무료 1회 · 하루 상한 확인 → 진단 생성.
- 파일 저장소(Storage)는 쓰지 않는다 (아래 7).

## 6. 제약 (중복 막기 · 값 범위 · 인덱스)
- **진단 횟수 제한 (함정 2, 2026-10-26 변경 — D-22):**
  - ~~계정당 · 브랜드당 무료 1회 (부분 유니크 인덱스)~~ → 인덱스 삭제 (`20261026103353_relax_free_limit.sql`). 같은 브랜드도 여러 번 진단할 수 있다.
  - **계정당 20회** — 서버가 진단을 만들기 전에 그 계정의 진단 수를 세어 막는다 (`DIAGNOSIS_PER_USER_LIMIT`, 기본 20)
- **하루 상한 (함정 2):** `usage_counters` 에 (day, scope, kind) 유니크. 서버가 호출 전에 1 올리고 상한을 넘으면 거절. 상한 숫자는 환경변수로 (**전체 진단 하루 50회** `DIAGNOSIS_DAILY_LIMIT`, IP 당 질문 생성 하루 10회는 AI 연결 때)
- **작업 쪼개기 (함정 1):** `run_items` 에 (run_id, question_id, engine, repeat_no) 유니크, `attempts` 0~3, 처리 순서용 인덱스 (status, created_at)
- **원문 따로 저장 (함정 3):** `engine_answers` 는 item_id 유니크(한 칸에 답 하나). 집계(`summary`)는 원본 표에서 언제든 다시 계산한다
- 값 범위: questions.position 1~5 · task_cards.position 1~3 · brands.benchmark_brands 최대 3개 · repeats 1~10 · status / engine / role / source_type 은 정해진 값만
- 질문: 브랜드당 후보는 최대 15개(추천 10 + 직접 쓴 것 5), 고른 질문은 최대 5개 — (brand_id, position) 은 고른 질문끼리 유니크, position 은 selected 일 때만 채움. 진단 시작 때 서버가 "정확히 5개 골랐나"를 확인한다. 카드: task_cards 에 (run_id, position) 유니크. 사전 예약: waitlist 에 user_id 유니크
- 인덱스: 모든 user_id, 모든 run_id · answer_id · brand_id 참조 칸

## 7. 개인정보
| 정보 | 어디에 | 꼭 필요한가 |
|---|---|---|
| 이메일 ⚠️ | auth.users 만 | 필요 — 로그인 링크와 완료 메일(D-06)을 보내야 한다. 우리 표에는 복사하지 않는다 |
| IP 주소 ⚠️ | usage_counters 에 **해시로만** (원래 값 저장 안 함) | 필요 — 로그인 전 질문 생성 남용을 막는다. 30일 뒤 삭제 |
| 브랜드명 · 사이트 주소 | brands | 필요 — 진단 대상. 회사 정보이고 개인정보 아님 |
| 이름 · 전화번호 · 사진 | 모으지 않음 | 필요 없음 |
| 파일 (Storage) | 쓰지 않음 | M1 에는 올리는 파일이 없다 |

## 8. 시드(예시) 데이터
- **규칙 표에 넣는 것 (DB 시드):**
  - card_types 6개 — 사이트 정보 보강 · FAQ 콘텐츠 · 외부 언급 확보 · 리뷰 · 커뮤니티 노출 · 쇼핑 검색 등록 · 보도자료
  - question_templates 8개 — 홈프레이그런스 4개(집들이 선물 · 가격대 · 향 계열 · 니치 브랜드 비교) + 공통(`*`) 4개(추천 · 비교 · 선물 · 가성비)
- **화면이 비어 보이지 않게 하는 예시 진단:** 실제 사람 계정 없이 만들기 위해 DB 가 아니라 코드 속 "연습용 예시" 데이터(가짜 브랜드 "예시 브랜드")로 보여 준다. 키가 없을 때의 예시 응답(mock)과 같은 파일을 쓴다.
- 실제 사람처럼 보이는 가짜 개인정보(이름 · 이메일)는 넣지 않는다.

## 8-1. 서버 전용 DB 기능 (2026-10-26 추가, 사용자 확인)
표 구조는 그대로. 서버(비밀 키)만 실행할 수 있고, 로그인한 사용자 · 로그인 안 한 사람은 실행 권한이 없다.
| 기능 | 하는 일 | 왜 DB 기능으로 |
|---|---|---|
| `increment_usage(scope, kind, limit)` | `usage_counters` 의 오늘 숫자를 1 올리고, 상한을 넘으면 되돌린 뒤 "막힘"을 돌려준다 | 여러 사람이 동시에 눌러도 숫자가 꼬이지 않게 한 번에 처리 (D-03 하루 상한) |
| `claim_run_items(run_id, limit)` | 진단의 처리 대기 칸을 limit 개 집어 "처리 중"으로 바꾸고 돌려준다. 2분 넘게 멈춘 칸과 3번 미만 실패한 칸도 다시 집는다 | 화면 요청과 예약 작업이 동시에 깨워도 같은 칸을 두 번 처리하지 않게 (D-09) |

- 적용: `supabase/migrations/20261026064928_server_functions.sql` · 실행 권한은 service_role 만 (anon · authenticated 회수)
- 보안 점검: 새 경고 없음. "유출 비밀번호 확인 꺼짐" 경고 1건은 비밀번호 로그인을 쓰지 않아(구글 · 이메일 링크) 해당 없음
- 접근 점검 (테스트 계정 A · B, 2026-10-26): 로그인 없이 진단 시작 401 · B 가 A 의 브랜드로 시작 404 · B 가 A 의 진단 진행 404 · B 가 A 의 답변 보기 0건 · A 두 번째 무료 진단 409(같은 진단으로 안내) · A 진단 30칸 모두 완료, 답변 원문 30개 저장. 점검 계정 · 자료 삭제

## 8-2. 주간 루프 추가 (2026-10-31, D-23)
| 바뀌는 곳 | 칸 | 설명 |
|---|---|---|
| `brands` | `auto_mode boolean 필수 기본 true` | 매주 자동 재진단 켜짐/꺼짐 (오너가 바꿀 수 있음) |
| `diagnosis_runs` | `trigger text 필수 기본 manual` (`manual` · `weekly`) | 사람이 시작했나, 매주 자동인가 |
| `task_cards` | `draft text` · `status text 필수 기본 auto` (`auto` · `done` · `skipped`) · `goal_id uuid` | 실행 초안 · 진행 상태 · 어느 목표의 액션인가 |
| 새 표 `weekly_goals` | user_id · brand_id · baseline_run_id · result_run_id · metric(`ai_mentions`) · baseline_value · total · target_value · due_date · status(`active` · `achieved` · `missed`) · result_value · evaluated_at | 주간 목표 1개 = 기준 진단 1개 |

누가 읽고 쓰나 (추가분):
| 표 / 칸 | 로그인 안 한 사람 | 본인 | 다른 사용자 | 서버 |
|---|---|---|---|---|
| weekly_goals | ✗ | 보기 | ✗ | 전부 |
| task_cards.status | ✗ | **이 칸만 수정**(완료 · 보류 표시) | ✗ | 전부 |
| brands.auto_mode | ✗ | 수정 (brands 수정 규칙 그대로) | ✗ | 전부 |

서버 전용 기능 · 예약 실행:
- `set_cron_secret(text)` — 예약 실행이 우리 서버를 부를 때 쓰는 비밀값을 Supabase Vault 에 저장 (service_role 만). 비밀값 자체는 SQL 파일에 쓰지 않는다.
- pg_cron + pg_net: **1분마다** `/api/cron/tick` 호출 → 진행 중인 진단을 처리하고, 월요일 09:00(KST) 이후에는 자동 모드 브랜드의 주간 재진단을 만든다. 호출에는 `CRON_SECRET` 이 있어야 한다.

## 9. 만든 기록과 점검 결과 (2026-10-25)
- 적용한 SQL: `supabase/migrations/20261025084144_init_schema.sql` (표 13개 · 제약 · RLS 정책) · `20261025084148_seed_rules.sql` (card_types 6 · question_templates 8)
- 보안 점검 (`npx supabase db advisors --linked --type all`): 경고 · 오류 0건. 참고(INFO)만 — `usage_counters` 에 정책 없음(일부러 서버 전용) · 새 인덱스 아직 미사용
- 타입 파일: `src/lib/database.types.ts` (`npx supabase gen types typescript --linked`)

### 접근 점검 (테스트 사용자 A · B, 로그인 토큰으로 시험 · 관리자 키는 준비와 정리에만 사용)
| 누가 | 무엇을 | 결과 |
|---|---|---|
| A (본인) | brands · questions 보기 · 추가 · 수정 · 삭제 | ✓ 됨 |
| A (본인) | 자기 진단 · 작업 칸 · 답변 · 출처 · 언급 · 카드 보기 | ✓ 됨 |
| A (본인) | 진단 · 카드를 직접 추가 · 수정 | ✓ 막힘 (서버만 씀) |
| A (본인) | 내 리포트에 행동 기록 · 사전 예약 | ✓ 됨 |
| A (본인) | usage_counters 보기 | ✓ 막힘 |
| B (다른 사용자) | A 의 브랜드 보기 · 수정 · 삭제 | ✓ 0건 |
| B (다른 사용자) | A 의 브랜드에 질문 추가 · A 의 리포트에 행동 기록 · 사전 예약 | ✓ 막힘 |
| B (다른 사용자) | 진단 · 답변 · 출처 · 언급 · 카드 · 사전 예약 표에서 A 의 자료 | ✓ 0건 |
| 로그인 안 한 사람 | 사용자 표 보기 · 추가 | ✓ 막힘 |
| 로그인 안 한 사람 | card_types · question_templates 보기 | ✓ 됨 (공개 규칙 데이터) |
| 서버 | 같은 브랜드 · 같은 계정 두 번째 무료 진단 | ✓ 막힘 (제약) |
| 서버 | 브랜드 삭제 시 아래 진단까지 같이 삭제 | ✓ 됨 |
| 파일 저장소(Storage) | — | 해당 없음 (M1 에서 안 씀) |
| 서버 기능(Route Handler) 권한 | 진단 시작 · 워커의 로그인 · 상한 확인 | 미확인 — 아직 코드가 없다. 5단계에서 같은 기준으로 점검 |
- 결과: 45 / 45 통과. 테스트 계정 2개와 점검 자료는 모두 지웠다.
