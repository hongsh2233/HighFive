---
name: dev-workflow
description: TMS 저장소에서 기능 추가/수정 등 신규 작업 요청을 처리할 때 항상 따라야 하는 작업 절차. 작업 시작 전 docs/PROJECT_STRUCTURE.md 확인, 완료 후 docs/HISTORY.md 기록과 PROJECT_STRUCTURE.md 갱신, 빌드/타입체크 검증, main 브랜치 머지 및 푸시까지 포함. "새 기능 추가해줘", "수정해줘", "구현해줘" 류의 코드 변경 요청에는 반드시 이 skill을 사용한다.
---

# TMS 개발 작업 절차

이 저장소에서 코드를 추가/수정하는 모든 작업은 아래 순서를 반드시 지킨다.

## 1. 작업 시작 전 — 구조 확인

- `docs/PROJECT_STRUCTURE.md`를 먼저 읽고 현재 스키마, 디렉터리 구조, API 목록, 권한 체계를 파악한다.
- 새 기능이 기존 구조(모델, 라우트, 컴포넌트)와 충돌하거나 중복되지 않는지 확인한다.

## 2. 작업 수행

- 요청된 기능/수정 사항을 구현한다.
- 스키마가 바뀌면 `prisma/schema.prisma` 수정 후 마이그레이션을 반영한다.

## 3. 작업 완료 후 — 문서 갱신

작업이 끝나면 **반드시 두 문서를 갱신**한다.

1. `docs/HISTORY.md`에 작업 내역을 한 줄(또는 짧은 단락)로 추가한다.
   - 형식: `## YYYY-MM-DD` 하위에 `- (요약) 무엇을 했는지, 관련 파일/API`
2. `docs/PROJECT_STRUCTURE.md`에 이번에 추가/변경된 기능을 반영한다.
   - 새 모델/필드 → 스키마 섹션에 추가
   - 새 API 라우트 → API 전체 목록 표에 추가
   - 새 페이지/컴포넌트 → 디렉터리 구조 트리에 추가
   - 문서가 실제 코드 상태와 항상 일치하도록 유지한다 (사라진 기능은 제거).

## 4. 디버깅 체크 (필수)

문서 갱신 후 머지 전에 아래를 실행해서 깨진 게 없는지 확인한다.

```bash
npm run lint
npx tsc --noEmit
npm run build
```

- 에러가 있으면 머지하지 않고 먼저 수정한다.
- DB 스키마를 변경했다면 `npm run db:push` (또는 `db:migrate`)까지 실행해 마이그레이션이 정상 반영되는지 확인한다.

## 5. main 브랜치에 머지 & 푸시

검증을 통과하면 작업 브랜치를 **항상 main에 바로 머지하고 push**한다.

```bash
git add -A
git commit -m "<작업 내용>"
git push -u origin <현재 브랜치>

git fetch origin main
git checkout -B main origin/main
git merge --ff-only <현재 브랜치>   # ff 불가능하면 일반 merge
git push origin main
```

다른 브랜치로 작업했다면 머지 후 원래 작업 브랜치로 다시 돌아온다.
