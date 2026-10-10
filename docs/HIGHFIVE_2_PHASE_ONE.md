# HighFive 2.0 — 1차 구현 보고

작성일: 2026-10-10 (Asia/Seoul)

## 기준 저장소와 작업 방식

- 실제 연결된 GitHub 저장소: `hongsh2233/HighFive`, 기본 브랜치 `main`.
- 시작 기준: `d42baed` (JIA 활동 피드에 업무 상세·체크리스트 포함).
- 작업 브랜치: `feat/highfive-2-phase-one`.
- `docs/workflow.md` 및 `.claude/skills/dev-workflow/SKILL.md` 준수: 구조 확인 → 구현 → HISTORY/PROJECT_STRUCTURE 갱신 → lint/TypeScript/build 검증 → main 반영.
- Next.js 15, React 18, Prisma 5, PostgreSQL, NextAuth, 기존 CSS 디자인 토큰과 API를 재사용. 전면 재작성·DB 마이그레이션·운영 데이터 수정 없음.

## 구현 기능

| 영역 | 결과 |
| --- | --- |
| 전체 IA | HOME / 내 업무 / 프로젝트 / 수신함 / 캘린더 / 문서 / 리포트 / JIA / 설정. 플랜·역할·개별 권한에 맞게 노출. 기존 운영 메뉴는 접이식으로 보존 |
| HOME | 오늘 마감, 이번 주, 지연, 대기, 3일 이내 마감, 내가 요청한 다른 담당자 업무, 새 멘션·댓글, 프로젝트 위험 신호, JIA 데이터 기반 브리핑 및 기존 AI 브리핑 호출 |
| 내 업무 | 본인 담당 업무만 오늘/이번 주/지연/대기/완료로 필터. 프로젝트·상태·담당자·우선순위·마감·최근 댓글·위험 표시 |
| 프로젝트 목록 | 기존 등록/수정/멤버 관리 유지, 프로젝트명에서 개요로 진입 |
| 프로젝트 개요 | 정보, PM, 역할·팀원, 완료/미완료/지연, 진행률, 실제 마일스톤, 업무 마감 범위, 최근 업무 변경, 담당자별 미완료 건수·선행 업무 점검 |
| 프로젝트 탭 | 개요 / 업무 / 문서 / 일정 / 활동 / 리포트. 문서·리포트는 후속 확장 지점이며 기존 위키·회의록으로 연결 |
| 업무 보드 | Kanban / List / Calendar / Assignee. 공통 프로젝트 선택. 칸반은 기존 상태/드래그/API/선행 업무 차단/실패 롤백을 재사용. 달력은 월 단위 마감 보기 및 이전/다음 달 이동 |
| 업무 상세 | 기존 설명·상태·담당자·등록자·우선순위·목표일·체크리스트·그룹/하위업무·첨부·댓글/멘션·시간 기록·이력·커스텀 속성 유지 |
| JIA 패널 | 전체 상세 오른쪽 패널 및 빠른 상세 내부. 마감/선행 업무 점검, 최근 수정 시각, 다음 행동, 기존 AI 요약, 확인 댓글 기본 초안. 초안은 기존 입력란에 추가하며 자동 게시하지 않음 |
| 다음 Phase 화면 | 문서/수신함/리포트/JIA/자동화의 진입 화면과 기존 기능 링크. 실제 통합 처리·새 자동 실행은 구현하지 않음 |
| 반응형 | Desktop 2열, 1100px 이하에서 주요 화면과 JIA 패널 1열. 좁은 캘린더는 내부 가로 스크롤. 기존 모바일 메뉴 유지 |

집계는 내 권한으로 조회 가능한 업무에 한정하며 전체 프로젝트 집계로 오인하지 않도록 표시한다. 날짜는 브라우저의 현지 달력 날짜로 비교하고 주간 범위는 월요일~일요일이다. 프로젝트별 `isDone`/`isProgress`를 재사용하므로 커스텀 완료 상태를 지연으로 잡지 않는다. 그룹 부모는 집계에서 제외하고 하위 업무는 포함한다.

## 변경 파일

화면과 기존 기능 연결:

- `src/components/AppShell.tsx`
- `src/app/dashboard/page.tsx`
- `src/app/my-work/page.tsx`, `src/app/my-work/layout.tsx`
- `src/app/projects/page.tsx`, `src/app/projects/[id]/page.tsx`
- `src/app/tasks/kanban/page.tsx`, `src/app/tasks/[id]/page.tsx`, `src/app/tasks/page.tsx`
- `src/components/TaskDetailPanel.tsx`, `src/components/kanban/KanbanBoard.tsx`
- `src/app/docs/page.tsx`, `src/app/inbox/page.tsx`, `src/app/reports/page.tsx`, `src/app/jia/page.tsx`, `src/app/settings/automation/page.tsx`

새 컴포넌트·조회·판정:

- `src/components/work/WorkHome.tsx`, `TaskCards.tsx`, `TaskViews.tsx`, `JiaSidePanel.tsx`, `PhaseGateway.tsx`, `WorkHub.module.css`
- `src/hooks/useWorkHub.ts`, `src/hooks/useProjectStatuses.ts`
- `src/lib/work-hub.ts`, `src/lib/route-config.ts`
- `src/types/index.ts`, `src/app/api/tasks/route.ts`

검증·기존 lint 오류 보완·문서:

- `.eslintrc.json`, `.gitignore`, `package.json`, `package-lock.json`
- `vitest.config.ts`, `playwright.config.ts`
- `tests/fixtures.ts`, `tests/work-hub.test.ts`, `tests/work-ui.test.tsx`, `tests/routes.test.ts`, `tests/kanban.test.tsx`, `tests/pagination.test.ts`, `tests/tasks-api.test.ts`, `tests/browser/highfive.spec.ts`
- `src/app/projects/[id]/statuses/page.tsx`, `src/app/settings/approval-line/page.tsx` (JSX 문구 escaping)
- `docs/HISTORY.md`, `docs/PROJECT_STRUCTURE.md`, `docs/HIGHFIVE_2_PHASE_ONE.md`

업무 목록의 기존 early return 아래 Hook 호출은 로딩 종료 시 Hook 순서가 달라지는 오류였다. 모든 Hook 선언 이후에 로딩 return을 두어 수정했다. lint 규칙을 끄거나 타입 검사를 우회하지 않았다.

## 미구현 항목과 확장 계약

- **Work Docs**: 기존 WikiPage·Meeting을 유지한다. 다음 단계에서 문서 유형, Task–Doc 연결 모델/조회, 수정 이력, 회의록 Action Item의 검토·업무 생성 흐름을 추가한다. 현재 `PhaseGateway('docs')`와 프로젝트 문서 탭이 진입점이다.
- **통합 수신함**: 기존 문의·신청 기능을 연결했다. 다음 단계에서 외부 문의/내부 요청/미배정/JIA 후보를 공통 요청 모델로 정규화하고 소스별 권한·분류·전환을 연결한다. 기존 JIA inbox API는 변경하지 않았다.
- **리포트**: 기존 통계·주간보고를 연결했다. 기간별 스냅샷과 체류 시간, 담당자 분배, JIA 해석은 후속 단계다. 전체 조직/프로젝트 집계는 서버의 권한 범위에서 계산해야 한다.
- **자동화**: 기존 반복 업무·외부연동을 유지했다. 이벤트 규칙, 승인 정책, 실행/실패 기록을 기존 scheduler와 연결하는 작업은 후속 단계다.
- **JIA**: AI 요약과 브리핑은 기존 기능 토글·API에 연결했다. 댓글 초안은 기본 템플릿이며 AI 생성으로 표시하지 않는다. 하위업무/일정 변경/문서 요약의 구조화된 제안, 승인·자율정책 판정, 실행과 감사 로그, 전용 대화는 미구현이다.
- **프로젝트 기간/업무 시작일**: 기존 모델에 명시적 기간·시작일이 없어 새 필드나 임의 값을 만들지 않았다. 프로젝트에는 등록일과 실제 업무 마감 범위를 구분해 표시한다. 이 필드는 다음 Phase의 데이터 모델 설계에 포함한다.
- **활동**: 최근 업무 수정과 기존 개별 업무 이력을 제공한다. 모든 문서·댓글·JIA 실행을 합친 프로젝트 통합 타임라인은 미구현이다.
- **캘린더**: 새 보드는 월별 업무 마감 보기이며, 기존 전역 캘린더의 휴가·Google 일정 연결을 유지했다. 통합 주 보기·일정 충돌 분석은 후속 범위다.

## 기존 기능 영향

- 인증 제공자, 세션 처리, 로그인/2FA/로그아웃, 역할 코드 및 기존 라우트 권한은 변경하지 않았다. 신규 라우트는 공통 `route-config.ts`에 등록했다. `reports`는 ADMIN/LEADER, PARTNER는 신규 `my-work`만 허용한다.
- 기존 API의 권한·조직·프로젝트 필터와 쓰기 계약 유지. `/api/tasks` 읽기 응답에는 선택 필드 `latestComment`를 추가했다. 기존 필드, pagination, JIA allowedProjectIds 및 파트너 공유 범위를 유지한다.
- 기존 task 상세·댓글/멘션/첨부/체크리스트·타이머·커스텀 단계·의존성·승인 게이트는 기존 코드로 실행한다. JIA 패널에서 변경/게시를 자동 실행하지 않는다.
- JIA integration/activity/inbox, 서비스 인증, webhook, DB 스키마, seed, scheduler는 수정하지 않았다.
- 새 HOME을 기본으로 표시하고 기존 운영 대시보드는 접이식으로 보존했다. 이로 인해 기존 운영 현황 조회도 함께 실행될 수 있다.
- 테스트 도구는 개발 의존성으로 추가했다. 기존 직접 운영 의존성 버전은 유지했다. 잠금 파일에서 공통 간접 의존성 `nanoid`/`source-map-js`의 패치 버전도 갱신되었다.

## 검증

- `npm run lint`: 오류 0, 기존 Hook 의존성·이미지·폰트 경고 12개 유지.
- `npx tsc --noEmit` / `npm run typecheck`: 오류 0.
- `npm test`: 34개 통과. 커스텀 완료 판정, 현지 날짜/주간 경계, 그룹 제외, 위험 표시, 조회 pagination, 본인 필터, 빈/오류 상태, 보기 전환, JIA 호출/초안, 칸반 성공/권한 실패 롤백, 인증·조직/파트너·JIA 서비스 범위를 검증.
- `npm run build`: Node 메모리 한도를 8192MB로 설정해 통과. 기본 2GB 환경의 첫 실행은 메모리 부족으로 실패했으며 코드/타입 오류는 아니었다. 기존 `bcryptjs` crypto 모듈 경고가 남아 있다.
- `npm run test:ui`: 3개 통과. Desktop 1440×1000, Tablet 1024×768의 실제 Chromium에서 비로그인 보호, HOME→내 업무→프로젝트→업무 상세→댓글 초안 흐름, 보드 보기 전환과 페이지 가로 넘침을 검사했다. HOME/프로젝트/업무 상세/Tablet 보드·프로젝트 PNG를 생성해 시각 확인했다.
- `git diff --check`: 통과.

브라우저 테스트는 가상 NextAuth 세션 및 API 응답을 사용한다. API 회귀 테스트는 인증·Prisma 접근을 mock하여 기존 조회 조건과 응답을 확인한다. 운영/스테이징 DB와 실제 AI 키·JIA 서비스 자격 증명은 제공되지 않았으므로 실제 로그인 비밀번호/2FA, DB 쓰기·알림 발송, 외부 JIA 실행은 검증하지 않았다. 이를 운영 회귀 없음으로 단정하지 않는다. 로컬 UI 테스트 서버의 기존 instrumentation/scheduler는 테스트 DB 연결 부재 로그를 출력하며, 실제 DB나 운영 데이터에 접근하지 않는다.

재현:

```powershell
npm ci
npx prisma generate
npm run lint
npm run typecheck
npm test
$env:NODE_OPTIONS='--max-old-space-size=8192'
npm run build
npx playwright install chromium
npm run test:ui
```

## 다음 Phase 권장사항

1. 스테이징에서 ADMIN/LEADER/WORKER/PARTNER 실제 계정으로 로그인·권한·프로젝트/업무 CRUD·댓글/멘션·승인/의존성·JIA 자격 증명·활동 피드 회귀 확인.
2. Work Docs: 기존 위키/회의록을 기반으로 문서 유형과 업무 연결, 수정 이력, Action Item 검토 후 업무 생성.
3. JIA 제안 계약: 읽기 맥락 → 구조화된 제안 → 기존 승인/자율정책 확인 → 기존 쓰기 API → 감사 이력. 변경 실행과 설명 문안을 분리.
4. 수신함·리포트·자동화: 권한을 가진 기존 모듈별 데이터 소스를 순차 통합하고 운영 지표·실패 처리까지 확장.
