# GEO 스나이퍼 — 랜딩 페이지

AI 추천 목록에 내 브랜드 자리 만들기. 니치 홈프레이그런스 브랜드를 위한 GEO 운영 도구의 랜딩 페이지예요.
(AI 프로덕트 빌더 클럽 3기 1주차 실습)

## 주소

- 사이트: https://youngrangpark-afk-builder.vercel.app
- GitHub 저장소: https://github.com/youngrangpark-afk/youngrangpark-afk-builder
- Supabase 대시보드: https://supabase.com/dashboard/project/hwjpuhivnwemnpetoynf

## Supabase

연결만 해 둔 상태예요. 다음 주에 신청 저장 같은 기능을 붙일 때 씁니다.
DB 비밀번호와 키는 내 컴퓨터의 `.env.local` 에만 있고, GitHub 에는 올라가지 않아요.

## 다시 고칠 때

1. Claude 나 Codex 앱에서 이 폴더를 열고, 고칠 곳을 말해요.
2. 다 고쳤으면 아래 한 줄로 저장하고 올려요. GitHub 에 올라가면 Vercel 이 사이트를 자동으로 다시 배포해요.

```bash
git add -A && git commit -m "수정" && git push
```

## 도메인을 붙이고 싶으면

vercel.com 에서 이 프로젝트 → Settings → Domains 에서 내 도메인을 추가해요.

## 파일 안내

- `ONEPAGER.md` — 아이템 1pager 초안 (1주차 과제). 다음 주 프로토타입을 만들 때 AI 에게 이 파일을 먼저 읽혀요.
- `SITE.md` — 랜딩 페이지 문구
- `src/app/page.tsx` — 랜딩 페이지 화면
