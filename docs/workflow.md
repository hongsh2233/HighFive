# High5 작업 절차 (Workflow)

> 이 저장소에서 기능 추가/수정 등 신규 작업을 진행할 때는 항상 아래 절차를 따른다.
> Claude Code에서는 `.claude/skills/dev-workflow/SKILL.md`가 이 문서를 가리키는 skill로 등록되어 있다.

## 1. 신규 작업 요청 시 — 구조 확인

- 작업을 시작하기 전에 `docs/PROJECT_STRUCTURE.md`를 먼저 확인한다.
- 현재 스키마, 디렉터리 구조, API 목록, 권한 체계를 파악하고 기존 구조와 충돌/중복이 없는지 확인한다.

## 2. 작업 완료 후 — 문서 기록

작업이 끝나면 아래 두 문서를 반드시 갱신한다.

1. **`docs/HISTORY.md`**: 작업 내역을 기록한다.
   - 형식: `## YYYY-MM-DD` 하위에 `- (요약) 무엇을 했는지, 관련 파일/API`
2. **`docs/PROJECT_STRUCTURE.md`**: 이번에 추가한 기능을 반영한다.
   - 새 모델/필드 → 스키마 섹션
   - 새 API 라우트 → API 전체 목록 표
   - 새 페이지/컴포넌트 → 디렉터리 구조 트리
   - 문서가 항상 실제 코드 상태와 일치하도록 유지한다 (제거된 기능은 삭제).

## 3. 작업 완료 후 — 디버깅 체크 (필수)

문서 갱신 후 머지 전에 반드시 아래를 실행해 깨진 게 없는지 확인한다.

```bash
npm run lint
npx tsc --noEmit
npm run build
```

- 에러가 있으면 머지하지 않고 먼저 수정한다.
- DB 스키마를 변경했다면 `npm run db:push` (또는 `db:migrate`)까지 실행해 마이그레이션이 정상 반영되는지 확인한다.

## 4. main 브랜치에 머지 & 푸시

검증을 통과하면 항상 main 브랜치에 바로 머지하고 push한다.

```bash
git add -A
git commit -m "<작업 내용>"
git push -u origin <현재 브랜치>

git fetch origin main
git checkout -B main origin/main
git merge --ff-only <현재 브랜치>   # ff 불가능하면 일반 merge
git push origin main
```

머지 후에는 원래 작업 브랜치로 다시 돌아온다.
