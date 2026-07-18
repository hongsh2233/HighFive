# 작업 히스토리

> 신규 작업 완료 시 `.claude/skills/dev-workflow/SKILL.md` 절차에 따라 이 문서에 기록을 추가한다.

## 2026-06-30

- docs 정리: `README.md`(빈 파일), `README_NEW.md`, `SETUP.md`, `WEBHOOK_SETUP.md` 삭제 후 `README.md`/`docs/PROJECT_STRUCTURE.md`로 통합. 실제 코드(스키마, API, 디렉터리 구조)와 어긋났던 내용을 현재 상태에 맞게 갱신.
- 작업 절차 skill 추가: `.claude/skills/dev-workflow/SKILL.md`, 본 히스토리 문서(`docs/HISTORY.md`) 신설.
- 작업 절차 본문을 `docs/workflow.md`로 분리하고 `SKILL.md`는 이를 가리키는 포인터로 변경.

## 2026-06-30 (2차)

- 서비스명 `TMS` → `High5`로 전면 변경: `package.json`, 로그인 페이지, 헤더 로고, iCal PRODID/캘린더명, Slack/잔디 알림 봇 이름, 문서(`README.md`, `docs/workflow.md`, `docs/PROJECT_STRUCTURE.md`, `SKILL.md`) 포함.
- 로그인 페이지(`src/app/login`) 전면 리디자인: 골드·퍼플 그라디언트 기반의 고급스러운 다크 테마 적용, 좌측 브랜드 패널의 기능 소개 4종 텍스트 제거, 이메일/비밀번호 입력 필드에 입력 시 노출되는 X(지우기) 버튼 추가, 모바일 반응형 스택 레이아웃 추가.
- `AppHeader`에서 알림 벨 아이콘/드롭다운 기능 전체 제거(사용자 확인 완료), 모바일 환경을 위한 햄버거 토글 내비게이션 추가, 관리 메뉴의 "사용자 관리" 라벨을 "팀원관리"로 변경.
- 대시보드(`/dashboard`) 관리 기능 링크 라벨 "팀 사용자 관리" → "팀원관리" 변경.
- `GET /api/users` 인증 로직 수정: `role=WORKER` 필터 조회(업무 담당자 배정 목적)는 인증된 사용자 전체에 허용하도록 완화. 기존에는 ADMIN/MANAGER만 허용되어 WORKER 등 일반 사용자가 `/tasks`, `/tasks/create`에서 담당자 목록을 조회할 수 없어 담당자 드롭다운이 항상 비어 있던 버그를 수정.
- 팀원 관리(`/users`) 페이지 개선: 팀원 생성 시 "생성 완료. 임시 비밀번호: ..." 안내를 인라인 메시지 대신 모달(`Modal` 컴포넌트)로 표시하고 복사 버튼 추가. 소속 프로젝트 선택 UI를 버튼 토글 방식에서 체크박스 방식으로 변경. `users.module.css`가 실제 컴포넌트에서 사용하는 클래스명과 전혀 일치하지 않아 스타일이 적용되지 않던 문제를 발견하여 전체 재작성(버튼/배지/테이블/모달 디자인 포함, 모바일 반응형 추가).
- 디버깅 체크: 이 환경은 외부 네트워크 제약으로 Prisma 엔진 바이너리 다운로드 및 `sanitize-html` 패키지 설치가 불가능하여 `npm run build`를 끝까지 실행할 수 없음. 대신 `npx tsc --noEmit` 결과를 작업 전/후로 비교하여 이번 변경으로 인한 신규 타입 오류가 없음을 확인함(기존에도 존재하던 Prisma 클라이언트 미생성 관련 오류만 남아 있음). `npm run lint`는 저장소에 ESLint 설정 파일이 없어 대화형 설정이 필요하므로 이번 환경에서는 실행하지 못함 — 추후 실제 개발 환경에서 별도 확인 필요.

## 2026-06-30 (3차)

- `prisma/schema.prisma`의 `Task` 모델에 `labels`(콤마 구분 라벨 코드 문자열), `parentTaskId`/자기참조 `subTasks` 관계 필드 추가 — 이 환경은 DB 연결이 없어 `npm run db:push`/`migrate`를 실행하지 못함. **실제 배포/개발 DB에서 반드시 `npm run db:push` 또는 `prisma migrate dev`를 실행해 스키마를 반영해야 함.**
- `src/lib/constants.ts`에 `TASK_LABEL_LIST`/`TASK_LABEL_TEXT`/`TASK_LABEL_COLOR` 추가: 긴급(`URGENT`)/주말대응(`WEEKEND`)/비상(`EMERGENCY`) 라벨 정의.
- `tasks/create` 페이지 개선:
  - "그룹 업무로 등록" 체크박스 추가. 체크 시 비고(Quill 에디터) 입력란이 사라지고 하위 업무(제목/담당자/목표일) 행을 동적으로 추가/삭제할 수 있는 UI로 전환.
  - 라벨 체크박스(긴급/주말대응/비상) 추가, 선택값은 `POST /api/tasks`에 배열로 전달.
  - 담당자 선택 목록에서 본인을 제외하던 필터(`u.id !== Number(user?.id)`)를 제거하여 본인도 담당자로 선택 가능하도록 수정. 대신 ADMIN 역할 사용자는 담당자 후보에서 제외(`assignableWorkers`).
  - 담당자 옵션 표시를 `이름 (이메일)`에서 `이름`만 표시하도록 변경.
- `POST /api/tasks`: `labels` 배열을 콤마 문자열로 저장, `subTasks` 배열이 있으면 부모 Task 생성 후 각 항목을 `parentTaskId`로 연결된 자식 Task로 일괄 생성(라벨/프로젝트 동일 적용). `GET /api/tasks` 목록 응답에 `_count.subTasks` 포함.
- `src/types/index.ts`의 `Task` 타입에 `labels`, `parentTaskId`, `subTasks` 필드 추가.
- 디버깅 체크: 위와 동일한 환경 제약(Prisma 엔진/`sanitize-html` 미설치, DB 미연결)으로 `npm run build`·`db:push` 실행 불가. `npx tsc --noEmit`으로 변경 전후 비교해 신규 타입 오류 없음을 확인.

## 2026-06-30 (4차)

- Railway 배포 기준으로 정비: `railway.json` 신설(빌드 커맨드 `npm run build`, 스타트 커맨드 `npm start`, 헬스체크 `/api/health`, 실패 시 재시작 정책).
- `GET /api/health` 엔드포인트 신설(`src/app/api/health/route.ts`): `SELECT 1`로 DB 연결까지 확인 후 200/503 응답. Railway 헬스체크에서 사용.
- 빌드 스크립트(`npm run build` = `prisma generate && prisma db push --skip-generate && next build`)는 기존부터 존재했고 그대로 유지 — 이 스크립트 덕분에 Railway에 push할 때마다 빌드 단계에서 `prisma/schema.prisma`가 자동으로 DB에 반영되어, 별도 마이그레이션 명령 없이 신규 필드(`labels`, `parentTaskId` 등)가 자동 생성됨.
- `.env.example`의 `DATABASE_URL` 예시를 Supabase 기준에서 Railway Postgres 기준으로 변경, `NEXTAUTH_URL`에 Railway 배포 도메인 사용 안내 주석 추가.
- `README.md`에 "Railway 배포" 절 추가(프로젝트 생성·Postgres 플러그인 추가·환경변수·자동 DB 반영 동작·헬스체크·시드 데이터 안내), `docs/PROJECT_STRUCTURE.md`에 "7-1. 배포 (Railway)" 절 추가.
- 디버깅 체크: 이 환경은 DB 연결이 없어 `/api/health` 실제 호출이나 `prisma db push` 적용까지는 확인할 수 없음. `npx tsc --noEmit` 결과를 변경 전후 비교해 신규 타입 오류 없음을 확인(헬스체크 라우트 포함).

## 2026-06-30 (5차)

- `tasks/create` 업무 제목 입력란 placeholder를 `예: [DCBGIT-39085] ...` → `업무제목을 입력하세요.`로 변경.
- `/tasks` 목록 페이지 담당자 필터 드롭다운 버그 수정: 기존에는 `/api/users?role=WORKER`로 별도 조회해 옵션을 채웠는데, 그룹업무 등록 시 본인(예: MANAGER)도 담당자로 지정할 수 있게 된 이후 `role !== 'WORKER'`인 담당자가 배정된 업무가 있으면 그 담당자 이름이 필터 목록에 전혀 나타나지 않는 문제가 있었음. 별도 API 호출 대신 현재 로드된 `tasks` 배열에서 실제 배정된 담당자(`task.worker`)를 중복 제거해 필터 옵션으로 사용하도록 변경(`src/app/tasks/page.tsx`). 사용하지 않게 된 `axios`/`useEffect` import 제거.
- 디버깅 체크: `npx tsc --noEmit` 결과를 변경 전후 비교해 신규 타입 오류 없음을 확인. DB 미연결로 실제 브라우저 동작 확인은 다음 실제 배포/개발 환경에서 필요.

## 2026-06-30 (6차)

- 그룹 업무를 "하위 업무 없이 그룹만 먼저 등록 → 이후 하나씩 추가" 가능하게 개선:
  - `prisma/schema.prisma`의 `Task` 모델에 `isGroup Boolean @default(false)` 필드 추가(하위 업무가 0건이어도 그룹 여부를 식별하기 위함). `src/types/index.ts`의 `Task` 타입에도 `isGroup`/`_count` 필드 반영.
  - `POST /api/tasks`: 요청 바디에 `parentTaskId`가 있으면 기존 그룹 업무에 하위 업무 1건만 추가하는 경로로 분기(기존 `subTasks` 배열을 통한 그룹+하위업무 일괄 생성 경로는 그대로 유지).
  - `tasks/create` 페이지: `?parentTaskId=123` 쿼리 파라미터가 있으면 "하위 업무 등록" 모드로 전환 — 그룹 체크박스/비고 입력 UI 대신 "상위 그룹: {부모 업무명}" 고정 표시를 보여주고, 등록 시 해당 그룹의 자식 Task로 생성한다. `useSearchParams()` 사용으로 인해 페이지를 `Suspense` 경계로 감싸는 `TaskCreatePage`(래퍼) + `TaskCreateForm`(본문) 구조로 분리.
  - `tasks` 목록 페이지(`/tasks`): 부모 없는 업무만 1차 행으로 노출하고, `isGroup`이거나 하위 업무가 있는 행은 구글시트처럼 ▶/▼ 토글로 하위 업무를 펼치고 접을 수 있도록 변경(`expandedGroups` 상태 + `childrenMap` 클라이언트 사이드 그룹핑). `isGroup` 행에는 "+ 하위 업무" 버튼을 추가해 `/tasks/create?parentTaskId=...`로 연결. `GET /api/tasks` 응답/필터링 로직은 변경하지 않고 순수 클라이언트 트리 변환으로 처리(다른 소비처인 `KanbanBoard.tsx`, 통계, 캘린더, export 라우트 영향 없음).
  - `docs/PROJECT_STRUCTURE.md`에 위 내용 반영(스키마 표, 그룹/하위 업무 절).
- 디버깅 체크: 이 환경은 DB 연결이 없어 `prisma/schema.prisma`의 `isGroup` 필드 변경을 `db:push`로 직접 적용하지 못함 — Railway 빌드 파이프라인(`npm run build` = `prisma generate && prisma db push --skip-generate && next build`)을 통해 다음 배포 시 자동 반영됨. `npx tsc --noEmit`을 변경 전/후로 비교해 신규 타입 오류 없음을 확인. 동일한 환경 제약(Prisma 엔진/`sanitize-html` 미설치, DB 미연결)으로 `npm run build`/`npm run lint`는 이번에도 실행하지 못함 — 실제 개발 환경에서 브라우저 동작(펼치기/접기, 하위 업무 추가 폼) 확인 필요.

## 2026-06-30 (7차)

- `/tasks` 목록 페이지의 드래그 앤 드롭 기능 전면 제거: `draggedTask` 상태, `handleDragStart`/`handleDragOver`/`handleDrop` 핸들러, `<tr>`의 `draggable`/`onDragStart`/`onDragOver`/`onDrop` 속성 및 관련 인라인 스타일 삭제.
- 그룹 업무 행 UX 개선: 펼치기/접기 아이콘을 잘 보이지 않던 ▶/▼ 삼각형에서 테두리가 있는 `+`/`−` 버튼(`groupToggleBtn`)으로 변경. 그룹 행의 비고 칸은 더 이상 비어있지 않고 "하위업무 보기"/"하위업무 접기" 버튼으로 바뀌어 클릭 시 하위 업무 트리를 펼치고 접을 수 있음(그룹 토글 버튼과 동일 동작).
- 비고 칸 버튼 라벨/동작 변경: 일반 업무 행은 "요약보기"(인라인 아코디언으로 비고 펼치기/접기) + "상세보기"(`/tasks/[id]`로 페이지 이동) 두 버튼으로 분리. 그룹 행은 상세보기만 노출.
- `/tasks` 목록 테이블의 "상태"(배지)와 "상태변경"(드롭다운) 두 칼럼을 하나로 통합 — 상태별 색상이 적용된 단일 `<select>`로 표시 겸 변경이 모두 가능하도록 변경(`statusSelectStyle` 헬퍼 추가, 테이블 헤더 9칼럼 → 8칼럼, 관련 `colSpan` 일괄 수정).
- `/tasks` 목록 상단의 상태 필터를 토글형 칩 버튼에서 `<select multiple>` 드롭다운(`statusFilterSelect`)으로 변경. `toggleStatus` 함수와 칩 버튼 마크업 제거, `handleStatusFilterChange`로 대체.
- 상세페이지(`/tasks/[id]`) 수동 타이머(시작/종료 버튼) 기능을 상태 변경 연동 자동 시간 카운트로 전면 교체:
  - `prisma/schema.prisma`의 `Task` 모델에 `timeCounterEnabled Boolean @default(true)` 필드 추가, `src/types/index.ts`의 `Task` 타입에도 반영.
  - `tasks/create` 페이지에 "시간카운터 사용" 체크박스 추가(기본 체크), `POST /api/tasks` 요청 바디 및 세 곳의 `prisma.task.create` 호출(단일 하위 업무 추가/메인 생성/그룹 하위 업무 일괄 생성)에 `timeCounterEnabled` 반영.
  - `PATCH /api/tasks/[id]/status`: 업무의 `timeCounterEnabled`가 true인 경우, 상태가 `PROGRESS`로 진입하면 자동으로 `TimeLog`를 생성(시작)하고, `PROGRESS`에서 다른 상태로 벗어나면 활성 `TimeLog`를 자동 종료(`durationHours`/`finalHours` 계산)하도록 로직 추가. 기존 `TimeLog` 모델·`adjust`(공수 보정) 엔드포인트는 그대로 유지.
  - 상세페이지에서 수동 타이머 UI(`TaskTimerButton`)를 제거하고, 타임로그 카드에 "상태가 진행중으로 바뀌면 자동으로 시간이 누적되고, 다른 상태로 바뀌면 자동 종료됩니다" 안내 문구로 대체(시간카운터 꺼진 업무는 별도 안내).
  - 더 이상 사용하지 않는 `src/hooks/useTimer.ts`, `src/components/task/TaskTimerButton.tsx`(+`.module.css`), `src/app/api/tasks/[id]/timelogs/start/route.ts`, `src/app/api/tasks/[id]/timelogs/[logId]/stop/route.ts`를 삭제(사용처 없음을 Grep으로 확인 후 삭제). 공수 보정용 `timelogs/[logId]/adjust/route.ts`는 유지.
  - `docs/PROJECT_STRUCTURE.md`의 Task 필드 표, 디렉터리 구조, API 표, 타이머 흐름 절을 위 변경사항에 맞게 갱신.
- 디버깅 체크: 이 환경은 DB 연결이 없어 `timeCounterEnabled` 필드 추가를 `db:push`로 직접 적용하지 못함 — Railway 빌드 파이프라인을 통해 다음 배포 시 자동 반영됨. 파일 삭제 직후 `npx tsc --noEmit`에서 `.next/types/`에 남아있던 캐시 타입 오류가 발생했으나 `.next` 캐시 삭제 후 재실행하여 신규 타입 오류 없음을 확인. 동일한 환경 제약(Prisma 엔진/`sanitize-html` 미설치, DB 미연결, ESLint 비대화형 설정 부재)으로 `npm run build`/`npm run lint`는 이번에도 실행하지 못함 — 실제 개발 환경에서 자동 시간 카운트 동작 및 UI 확인 필요.

## 2026-06-30 (8차)

- 상세페이지(`/tasks/[id]`) 기본 정보 카드의 "기획자" 라벨을 "보고자"로 변경(`task.planner` 자체는 유지, 표시 라벨만 변경).
- `/tasks` 목록의 상태 select가 상태별로 글자색/테두리색이 다르게 표시되어 통일감이 없던 문제 수정: `statusColors`/`statusSelectStyle` 동적 컬러링 로직을 제거하고, 담당자 select(`workerSelect`)와 동일한 스타일(`statusSelect` CSS)로 통일.
- 그룹 업무 행(`isGroupRow`)에서는 더 이상 "상세보기" 버튼을 노출하지 않음(하위업무 보기/접기 버튼만 남김). 일반 업무 행은 기존대로 요약보기+상세보기 버튼 유지.
- 대시보드(`/dashboard`)가 실제 데이터와 연동되지 않고 "배정된 업무가 없습니다"/"최근 활동 기록이 없습니다"를 항상 고정 표시하던 문제 수정: `GET /api/tasks`를 호출해 "나의 업무"(본인에게 배정된 미완료 업무, 목표일 임박 순 최대 5건)와 "최근 활동"(조회 가능한 업무 중 `updatedAt` 최신순 최대 5건)을 실제로 표시하도록 변경. 업무가 없을 때만 기존 빈 상태 문구를 표시. `dashboard.module.css`에 `taskList`/`taskItem`/`taskTitle`/`taskStatus`/`taskDate` 클래스 추가.
- 디버깅 체크: `npx tsc --noEmit`을 변경 전/후로 비교해 신규 타입 오류 없음을 확인. DB/Prisma 엔진 미설치로 `npm run build`는 실행 불가, `npm run lint`는 ESLint 대화형 설정 필요로 실행 불가(이전 세션과 동일한 환경 제약) — 실제 개발 환경에서 대시보드 데이터 노출 및 상태 select 스타일 확인 필요.

## 2026-06-30 (9차)

- `/tasks` 목록 상단 상태 필터를 `<select multiple>`(다중 선택 리스트박스)에서 일반 단일 `<select>`로 변경. 옵션에 "전체 상태"를 추가하고 기본값을 전체로 설정(`selectedStatuses` 배열 상태 → `selectedStatus` 단일 문자열 상태로 변경, `handleStatusFilterChange` 제거).
- 그룹 업무의 하위 업무 행은 기존에도 `isGroupRow: false`로 렌더링되어 요약보기/상세보기 버튼이 정상 노출되고 있었음을 확인(추가 코드 변경 불필요).
- 칸반 보드(`KanbanColumn.tsx`)에서 그룹 타이틀 카드와 하위 업무 카드를 시각적으로 구분: `task.isGroup`인 카드는 "그룹" 배지 + 노란색 배경/테두리로 강조, `task.parentTaskId`가 있는 하위 업무 카드는 `↳` 화살표 + 들여쓰기 + 연한 배경으로 구분(`KanbanColumn.module.css`에 `cardGroup`/`groupBadge`/`cardChild`/`childArrow` 클래스 추가).
- 대시보드(`/dashboard`)의 "나의 업무"/"최근 활동" 목록에도 업무 그룹핑 정보를 반영: 단일 `/api/tasks?limit=300` 호출로 전체 업무를 가져와 `parentMap`을 구성하고, 하위 업무는 "📁 {그룹명} ↳" 라벨을, 그룹 업무 자체는 "그룹" 배지를 항목 앞에 표시(`renderTaskGroup` 헬퍼, `dashboard.module.css`에 `taskGroupInfo`/`taskGroupBadge`/`taskParentLabel`/`taskParentArrow` 클래스 추가). 기존 별도 `workerId` 필터 호출은 제거하고 한 번의 호출 결과를 클라이언트에서 필터링하도록 단순화.
- 디버깅 체크: `npx tsc --noEmit`을 변경 전/후로 비교해 신규 타입 오류 없음을 확인. 동일한 환경 제약(Prisma 엔진/DB 미연결, ESLint 비대화형)으로 `npm run build`/`npm run lint`는 실행하지 못함 — 실제 개발 환경에서 상태 필터 단일 선택 동작, 칸반 그룹/하위 카드 구분, 대시보드 그룹 라벨 노출 확인 필요.

## 2026-06-30 (10차)

- 9차에서 적용한 그룹/하위 업무 표시 방식(칸반 `↳` 화살표, 대시보드 "📁 그룹명 ↳" 별도 라벨)이 그룹명과 업무명의 관계가 한눈에 드러나지 않는다는 피드백에 따라 `[그룹명] 업무명` 형식의 대괄호 접두사 방식으로 통일.
  - 칸반(`KanbanColumn.tsx`): 하위 업무 카드 제목 앞에 `↳` 화살표 대신 `[{부모 업무명}]` 접두사를 표시하도록 변경. 카드별 부모 업무를 조회할 수 있도록 `parentMap: Map<number, Task>` prop을 추가(`KanbanBoard.tsx`에서 전체 업무로 구성해 전달). `KanbanColumn.module.css`의 더 이상 쓰이지 않는 `childArrow` 클래스를 `parentPrefix`/`cardTitleText` 클래스로 교체.
  - 대시보드(`/dashboard`): `renderTaskGroup` 헬퍼에서 "📁 {그룹명} ↳" 라벨을 `[{그룹명}]` 형식으로 변경(`dashboard.module.css`의 `taskParentArrow` 클래스 제거, `taskParentLabel` 스타일 단순화).
- 디버깅 체크: `npx tsc --noEmit`을 변경 전/후로 비교해 신규 타입 오류 없음을 확인(특히 `KanbanColumnProps`에 추가된 필수 `parentMap` prop을 `KanbanBoard.tsx`에서 정상적으로 전달하는지 확인). 동일한 환경 제약으로 `npm run build`/`npm run lint`는 실행하지 못함 — 실제 개발 환경에서 칸반/대시보드의 `[그룹명] 업무명` 표시 확인 필요.

## 2026-06-30 (11차)

- 대시보드(`/dashboard`)는 그룹 업무 자체가 이미 목록에 독립된 행으로 노출되므로, 하위 업무 행에 `[그룹명]` 접두사를 추가로 표시하는 것이 그룹명 중복 노출이라는 피드백에 따라 제거. `renderTaskGroup` 헬퍼는 이제 `isGroup`인 행에만 "그룹" 배지를 표시하고, 하위 업무 행에는 더 이상 부모 그룹명을 표시하지 않음. 더 이상 쓰이지 않는 `parentMap` 상태/조회 로직과 `dashboard.module.css`의 `taskParentLabel` 클래스 제거.
- 칸반 보드는 컬럼이 상태별로 분리되어 있어 그룹 카드와 하위 업무 카드가 같은 화면에 같이 보이지 않을 수 있으므로, `[그룹명]` 접두사를 그대로 유지(대시보드와 다른 맥락).
- 디버깅 체크: `npx tsc --noEmit`을 변경 전/후로 비교해 신규 타입 오류 없음을 확인. 동일한 환경 제약으로 `npm run build`/`npm run lint`는 실행하지 못함 — 실제 개발 환경에서 대시보드 목록의 그룹/하위 업무 표시 확인 필요.

## 2026-06-30 (12차)

- "칸반도 대시보드와 같은 맥락으로 처리해달라"는 요청에 따라, 11차에서 대시보드에 적용한 것과 동일하게 칸반 보드의 `[그룹명]` 접두사도 제거. `KanbanColumn.tsx`에서 `parentMap` prop, 부모 업무 조회 로직, `parentPrefix` 표시를 모두 제거하고 `task.isGroup` 카드의 "그룹" 배지와 하위 업무 카드의 들여쓰기(`cardChild`)만 유지. `KanbanBoard.tsx`에서 더 이상 쓰이지 않는 `parentMap` 생성 및 전달 코드 제거, `KanbanColumn.module.css`의 `parentPrefix` 클래스 제거.
- 디버깅 체크: `npx tsc --noEmit`을 변경 전/후로 비교해 신규 타입 오류 없음을 확인. 동일한 환경 제약으로 `npm run build`/`npm run lint`는 실행하지 못함 — 실제 개발 환경에서 칸반 보드의 그룹/하위 카드 표시 확인 필요.

## 2026-06-30 (13차)

- 11~12차에서 적용한 "그룹은 목록에 자기 행으로 노출, 하위 업무에는 접두사 없음" 방식을 사용자 피드백에 따라 재변경: 그룹-하위업무 관계를 `[그룹명] 업무명` 접두사로 표현하되, 그룹 업무 자체는 목록/보드에 별도로 노출하지 않도록 변경.
  - 대시보드(`/dashboard`): "나의 업무"/"최근 활동" 목록에서 `isGroup` 업무를 제외(`!t.isGroup` 필터 추가)하고, `renderTaskGroup` 헬퍼가 다시 `parentMap`을 통해 부모 그룹명을 조회해 `[그룹명]` 접두사로 표시하도록 변경. `dashboard.module.css`의 더 이상 쓰이지 않는 `taskGroupBadge` 클래스를 `taskParentLabel`로 교체.
  - 칸반 보드(`KanbanBoard.tsx`/`KanbanColumn.tsx`): `groupedTasks` 계산 시 `isGroup` 업무를 컬럼에서 제외하고, `parentMap`을 다시 구성해 `KanbanColumn`에 전달. 하위 업무 카드에 `[그룹명]` 접두사(`parentPrefix`)를 다시 표시. 그룹 카드 자체가 더 이상 보드에 노출되지 않으므로 `cardGroup`/`groupBadge` 관련 코드와 CSS 클래스 제거.
- 디버깅 체크: `npx tsc --noEmit`을 변경 전/후로 비교해 신규 타입 오류 없음을 확인. 동일한 환경 제약으로 `npm run build`/`npm run lint`는 실행하지 못함 — 실제 개발 환경에서 대시보드/칸반에서 그룹 업무가 숨겨지고 하위 업무에 `[그룹명]` 접두사가 표시되는지 확인 필요.

## 2026-06-30 (14차)

- 대시보드(`/dashboard`) "나의 업무" 빈 상태 안내 문구의 "기획자에게 업무 배정을 요청하거나..."를 "관리자에게 업무 배정을 요청하거나..."로 변경.
- 디버깅 체크: `npx tsc --noEmit`을 변경 전/후로 비교해 신규 타입 오류 없음을 확인. 동일한 환경 제약으로 `npm run build`/`npm run lint`는 실행하지 못함.

## 2026-06-30 (15차)

- 대시보드/칸반에서 그룹 업무를 `!task.isGroup` 필터로만 숨기고 있어, `isGroup` 플래그가 설정되지 않은 레거시 그룹 업무(하위 업무는 있지만 `isGroup`이 false인 경우)가 `[그룹명]` 접두사 없이 자기 자신의 행/카드로 그대로 노출되던 버그 수정. 다른 업무의 `parentTaskId`로 참조되는(즉 하위 업무를 가진) 모든 업무 id를 모아 `isStandaloneGroup` 판정에 포함시켜, `isGroup` 플래그 여부와 무관하게 하위 업무를 가진 업무는 목록/보드에서 항상 제외하도록 변경(`src/app/dashboard/page.tsx`, `src/components/kanban/KanbanBoard.tsx`).
- 디버깅 체크: `npx tsc --noEmit`을 변경 전/후로 비교해 신규 타입 오류 없음을 확인. 동일한 환경 제약으로 `npm run build`/`npm run lint`는 실행하지 못함 — 실제 개발 환경에서 `isGroup` 미설정 레거시 그룹 업무가 더 이상 단독 노출되지 않는지 확인 필요.

## 2026-06-30 (16차)

- 업무 목록(`/tasks`) 제목 더블클릭 인라인 수정 기능 추가: 제목을 더블클릭하면 입력창으로 전환되어 수정 가능하고, Enter/포커스아웃 시 저장(`updateTask`, `PATCH /tasks/:id`), Escape 시 취소. `tasks.module.css`에 `titleText`/`titleInput` 클래스 추가.
- 그룹/하위 업무 등록 진입점 보강: 기존에는 `task.isGroup`이 true인 행에서만 "+ 하위 업무" 버튼이 보였는데, `isGroup` 플래그가 설정되지 않은 업무는 버튼이 보이지 않아 하위 업무를 추가할 방법이 없었음. 최상위(자식이 아닌) 모든 행에 "+ 하위 업무" 버튼을 노출하도록 변경하여, 어떤 업무든 하위 업무를 추가해 그룹으로 만들 수 있도록 개선.
- 역할 라벨 변경: `USER_ROLE_LABEL.PLANNER`를 "기획자"에서 "관리자"로 변경(`src/lib/constants.ts`). 이에 맞춰 대시보드의 PLANNER 역할 환영문구 및 "기획자 기능" 섹션 제목도 "관리자"/"관리자 기능"으로 변경(`src/app/dashboard/page.tsx`).
- 디버깅 체크: `npx tsc --noEmit` 결과 변경한 파일(`tasks/page.tsx`, `dashboard/page.tsx`, `constants.ts`)에서는 신규 타입 오류 없음을 확인(다른 파일들의 Prisma 생성 관련 기존 오류는 환경 제약으로 인한 기존 오류). 동일한 환경 제약으로 `npm run build`/`npm run lint`는 실행하지 못함.

## 2026-06-30 (17차)

- 업무 상세(`/tasks/[id]`) 페이지에 "기본 정보" 수정/삭제 기능 추가. ADMIN/PLANNER(='관리자' 라벨)는 "수정" 버튼으로 제목/담당자(셀렉트박스)/목표일을 인라인으로 수정할 수 있고, ADMIN만 "삭제" 버튼으로 업무를 삭제할 수 있음(삭제 시 확인창 후 `/tasks`로 이동). 담당자 셀렉트박스는 `/api/users?role=WORKER` 목록을 사용.
- 담당자 변경 시 기존에도 `WORKER_CHANGED` 이력이 남고 있었으나, 제목/목표일 변경은 이력이 남지 않던 것을 수정: `task-history.ts`에 `TITLE_CHANGED`, `TARGET_DATE_CHANGED` 액션과 라벨을 추가하고, `PATCH /api/tasks/[id]`에서 제목·목표일이 실제로 바뀐 경우 변경 전/후 값을 이력에 기록하도록 변경.
- 디버깅 체크: `npx tsc --noEmit` 결과 변경한 파일(`tasks/[id]/page.tsx`, `tasks/[id]/route.ts`, `task-history.ts`)에서는 신규 타입 오류 없음을 확인. 동일한 환경 제약으로 `npm run build`/`npm run lint`는 실행하지 못함 — 실제 개발 환경에서 제목/담당자/목표일 수정 및 삭제, 이력 기록이 정상 동작하는지 확인 필요.

## 2026-06-30 (18차)

- 업무 삭제 권한을 ADMIN 전용에서 ADMIN/PLANNER(둘 다 화면에는 '관리자'로 표시됨)로 확대: `DELETE /api/tasks/[id]`와 업무 상세(`/tasks/[id]`) 페이지의 `canDelete`를 `['ADMIN','PLANNER'].includes(role)`로 변경.
- 업무 목록(`/tasks`) 페이지에 담당자 셀렉트박스 추가: 기존에는 담당자가 텍스트로만 표시됐는데, ADMIN/PLANNER 권한 사용자에게는 상태 셀렉트와 동일한 방식으로 담당자를 셀렉트박스로 바로 변경할 수 있도록 변경(`/api/users?role=WORKER` 목록 사용, `updateTask`로 저장 — 백엔드에서 자동으로 `WORKER_CHANGED` 이력 기록).
- 업무 목록 각 행에 "삭제" 버튼 추가(ADMIN/PLANNER 전용, 확인창 포함, `useTasks`의 `deleteTask` 사용).
- 디버깅 체크: `npx tsc --noEmit` 결과 변경한 파일(`tasks/page.tsx`, `tasks/[id]/page.tsx`, `tasks/[id]/route.ts`)에서는 신규 타입 오류 없음을 확인. 동일한 환경 제약으로 `npm run build`/`npm run lint`는 실행하지 못함.

## 2026-06-30 (19차)

- 디자인 정리: 페이지마다 제각각이던 버튼/입력창/셀렉트 스타일을 통일. `globals.css`에 공통 프리미티브 클래스(`.btn` + `.btn-primary`/`.btn-secondary`/`.btn-ghost`/`.btn-success`/`.btn-danger`/`.btn-danger-solid`/`.btn-sm`, `.field-input`, `.field-select`)를 새로 정의해, Notion+Jira 스타일(플랫한 배경, 옅은 보더, 6px 라운드, 13px/11px 폰트 통일)로 버튼·인풋·셀렉트의 패딩/라운드/폰트크기/호버를 일치시킴.
- 각 페이지의 CSS 모듈에서 버튼/입력 클래스를 위 프리미티브에 `composes`로 연결(컴포넌트 JSX는 변경 없이 CSS만 교체): `tasks/tasks.module.css`(상태/담당자 셀렉트, 상세보기/하위업무/삭제/메모 버튼, 그룹토글), `tasks/[id]/detail.module.css`(수정/삭제/취소 버튼, 인풋/텍스트영역), `tasks/create/create.module.css`(등록/취소/하위업무 추가·삭제 버튼, 인풋), `info/info.module.css`, `profile/password/password.module.css`, `projects/projects.module.css`, `stats/stats.module.css`, `users/users.module.css`(기존 그라데이션 버튼도 통일 톤으로 교체), `calendar/calendar.module.css`, `components/task/TaskAdjustForm.module.css`, `components/task/TaskFilterBar.module.css`.
- 로그인 화면(`login.module.css`)은 별도 브랜딩 화면으로 판단해 이번 통일 작업에서 제외.
- 디버깅 체크: `npx tsc --noEmit` 결과 변경한 파일들에서 신규 타입 오류 없음을 확인(CSS 전용 변경이라 타입에는 영향 없음). 동일한 환경 제약으로 `npm run build`/`npm run lint`는 실행하지 못함 — 실제 개발 환경에서 버튼/인풋 시각 통일 결과를 브라우저로 확인 필요.

## 2026-06-30 (20차)

- 헤더 드랍다운 방향 수정: "업무"/"관리" 메뉴의 dropdown을 `dropdownLeft` → `dropdownRight`로 변경. 네비게이션이 헤더 우측에 있어 left 기준 드랍다운이 브라우저 우측으로 넘쳐 가로스크롤이 발생하던 문제 해결(`AppHeader.tsx`).
- 업무 목록 담당자 select 수정: `assignableWorkers` 목록에 현재 task의 worker가 없을 경우(역할 변경 등) 해당 worker를 옵션에 포함시켜 select가 빈값으로 보이는 문제 수정(`tasks/page.tsx`).
- max-width 1460px 통일: 이전에 설정된 1460px 값을 19차에서 1446px로 잘못 복구했던 부분을 전체 CSS 파일(`globals.css`, `dashboard`, `calendar`, `stats`, `projects`, `info`, `detail`, `create` 등)에서 1460px로 재설정.
- 로그인 폼 중앙 배치: 기존 좌우 분할 레이아웃(brandPanel + formPanel)에서 세로 중앙 정렬로 변경. CSS만 수정(JSX 유지): wrapper를 `flex-direction: column; align-items: center; justify-content: center`로, brandPanel을 컴팩트 수평 로고로, formPanel을 `max-width:420px` 중앙 카드로 리스타일. 기존 그라데이션 다크 톤은 그대로 유지(`login.module.css`).
- 디버깅 체크: `npx tsc --noEmit` 결과 변경한 파일(`AppHeader.tsx`, `tasks/page.tsx`)에서 신규 타입 오류 없음을 확인. 동일한 환경 제약으로 `npm run build`/`npm run lint`는 실행하지 못함.

## 2026-07-01 (21차)

- 업무 목록(`/tasks`) 테이블 비고(notes) 컬럼 가로스크롤 수정: `table-layout: fixed` 컬럼 폭이 좁은 상태에서 요약보기/상세보기/+하위업무/삭제 버튼 4개가 `.notesBtns`(flex, nowrap)에 한 줄로 강제되어 넘치면서 테이블 전체 가로스크롤을 유발하던 문제. `.notesBtns`에 `flex-wrap: wrap` 추가, `.tdNotes`는 `white-space: nowrap` → `normal`로 바꾸고 `min-width: 150px` 지정해 버튼이 셀 안에서 줄바꿈되도록 수정(`tasks.module.css`).
- 디버깅 체크: `npx tsc --noEmit` 결과 신규 타입 오류 없음(CSS 전용 변경). 동일한 환경 제약으로 `npm run build`/`npm run lint`는 실행하지 못함.

## 2026-07-01 (22차)

- 보안 강화: 로그인 세션을 24시간 → 30분으로 제한. `session.maxAge`와 `session.updateAge`를 모두 `30*60`으로 동일하게 설정해, 활동 여부와 무관하게 로그인 후 정확히 30분 뒤 세션이 절대 만료되도록 변경(기존에는 `updateAge` 기본값이 커서 활동 시 슬라이딩 갱신되는 구조였음)(`src/lib/auth.ts`).
- 세션 만료 시 조치 추가: `SessionProvider`에 `refetchInterval={60}`을 설정해 60초마다 세션 상태를 재확인하도록 하고, 로그인 상태였던 사용자의 세션이 만료(`unauthenticated`)되면 알림창으로 "30분 동안 활동이 없어 세션이 만료되었습니다"를 안내한 뒤 자동 로그아웃 처리하고 `/login`으로 이동시킴(`src/components/Providers.tsx`).
- 디버깅 체크: `npx tsc --noEmit` 결과 변경한 파일(`auth.ts`, `Providers.tsx`)에서 신규 타입 오류 없음을 확인. 동일한 환경 제약으로 `npm run build`/`npm run lint`는 실행하지 못함 — 실제 개발 환경에서 30분 경과 후 세션 만료 알림 및 자동 로그아웃 동작 확인 필요.

## 2026-07-01 (23차)

- 로그인 페이지(`src/app/login/login.module.css`) 디자인을 앱 전체 디자인 시스템(`globals.css`의 라이트 배경 `--bg-base`/인디고 accent `--accent`/플랫 버튼 스타일)에 맞춰 전면 리스타일. 기존에는 골드·퍼플 그라디언트의 다크 테마(라디얼 그라디언트 배경, 그라디언트 로고/버튼, 강한 글로우 섀도우)라서 나머지 페이지(대시보드/업무/헤더 등)의 라이트+인디고 톤과 이질감이 컸음. 로고 아이콘을 `--header-bg` 단색으로, 브랜드 타이틀 텍스트 그라디언트를 `--text-primary` 단색으로, 제출 버튼을 `.btn-primary`와 동일한 `--accent` 단색 배경으로, 인풋/에러박스를 앱의 `field-input`/`errorBox` 톤(라이트 배경, `var(--border-strong)` 보더)으로 교체. JSX(`page.tsx`) 구조는 변경하지 않고 CSS만 수정.
- 디버깅 체크: `node_modules`를 `--ignore-scripts`로 설치 후(Prisma 엔진 바이너리 다운로드는 환경 네트워크 제약으로 여전히 실패) `npx tsc --noEmit` 실행 — 로그인 페이지 관련 신규 오류 없음(남은 오류는 전부 Prisma 클라이언트 미생성으로 인한 기존 오류). `npm run dev`로 개발 서버를 직접 기동해 `/login`을 Playwright로 스크린샷 촬영, 라이트 배경+인디고 버튼으로 정상 렌더링되는 것을 시각적으로 확인함. `npm run lint`는 저장소에 ESLint 설정 파일이 없어 대화형 설정이 필요해 이번에도 실행하지 못함(기존부터 있던 제약, 이번 변경과 무관).

## 2026-07-01 (24차)

- **역할 코드 통일(PLANNER/MANAGER → LEADER)**: 코드베이스를 조사한 결과 같은 "중간 관리자" 역할을 가리키는 문자열이 `PLANNER`(업무/통계/대시보드 쪽 권한 체크)와 `MANAGER`(사용자/프로젝트/AppHeader 쪽 권한 체크)로 분열되어 있었음 — DB 시드는 `role: 'PLANNER'`로 사용자를 만드는데 `/users`·`/projects` 권한 체크는 `'MANAGER'`를 찾고 있어 실제로는 해당 역할 사용자가 프로젝트/팀원 관리 기능에 접근하지 못하는 기존 버그였음. 사용자 확인 후 두 값을 모두 `LEADER`로 통일하고 버그도 함께 해소.
  - 스키마/타입/상수: `prisma/schema.prisma`(User.role 주석), `src/types/index.ts`(`UserRole`), `src/lib/constants.ts`(`USER_ROLE`/`USER_ROLE_LABEL`, 라벨 "리더").
  - 권한 체크: `src/middleware.ts`, `src/hooks/useAuth.ts`, `src/store/authStore.ts`(`isPlanner` → `isLeader`), `src/components/AppHeader.tsx`(`isAdminOrManager` → `isAdminOrLeader`), `src/app/dashboard/page.tsx`, `src/app/users/page.tsx`(역할 셀렉트/라벨/뱃지), `src/app/projects/page.tsx`, `src/app/tasks/{page,create/page,[id]/page}.tsx`.
  - API 라우트: `src/app/api/{users,users/invite,projects,projects/[id],projects/[id]/members,tasks,tasks/[id],tasks/[id]/timelogs/[logId]/adjust,tasks/export,stats/summary,stats/workload}/route.ts`.
  - CSS: `src/components/common/Badge.module.css`, `src/app/users/users.module.css`의 `[data-role="..."]` 셀렉터.
  - `prisma/seed.ts`: 샘플 리더 계정을 `leader@example.com` / `role: 'LEADER'`로 변경(기존 `planner@example.com`).
  - **운영 DB 반영 필요**: 이 환경은 DB 연결이 없어 직접 실행 불가 — 실제 배포 DB에서 `UPDATE users SET role='LEADER' WHERE role IN ('PLANNER','MANAGER');` 실행 필요.
- **공지 기능 추가**: `Announcement` 모델 신설(`content`, `authorId`, `isActive`, `requestId?`). `POST/GET /api/announcements`(작성은 ADMIN/LEADER, 조회는 전 역할), `PATCH/DELETE /api/announcements/[id]`(작성자 본인 또는 ADMIN). 헤더 하단에 `AnnouncementBanner.tsx`를 신설해 `LayoutWrapper.tsx`에서 `AppHeader` 바로 아래 렌더링, 활성 공지를 배너로 노출하고 X 클릭 시 `localStorage`(`dismissedAnnouncementIds`)에 기록해 해당 브라우저에서 다시 보이지 않도록 처리. 관리용 `/announcements` 페이지 신설(등록/수정/게시중지/삭제, ADMIN은 전체·LEADER는 본인 작성분만), `AppHeader`의 "관리" 드롭다운에 "공지사항" 메뉴 추가.
- **신청(휴가/비품) 기능 추가**: `User.managerId`(자기참조, 담당 리더) 필드 신설 — `/users` 팀원 관리 폼에 "담당 리더" 셀렉트(ADMIN/LEADER 후보) 및 테이블 컬럼 추가, `PATCH/POST /api/users`가 `managerId`를 받아 저장. `Request` 모델 신설(`type` LEAVE/SUPPLY, `title`, `content`, `startDate`/`endDate`, `isAnnouncement`, `status` PENDING/APPROVED/REJECTED, `requesterId`, `approverId`, `rejectReason`, `decidedAt`).
  - `POST /api/requests`: 신청 시 "공지로 등록" 체크(ADMIN/LEADER만 유효 — WORKER가 API를 직접 호출해 우회 시도해도 서버에서 무시)하면 결재 없이 즉시 `APPROVED`(전결, `approverId`=본인)로 확정하고 연결된 `Announcement`를 자동 생성해 공지 배너에도 게시. 체크하지 않으면 `PENDING` 상태로 `approverId`를 신청자의 `managerId` 스냅샷으로 설정.
  - `PATCH /api/requests/[id]/decision`: 지정된 결재자(또는 `approverId`가 없을 때 ADMIN)가 승인/반려 처리, 반려 시 사유 필수.
  - `GET /api/requests?scope=mine|approvals`: 내 신청 목록 / 결재 대기·처리 내역 조회.
  - `/requests` 페이지 신설: 신청 폼(유형 토글, 기간/품목 입력, ADMIN·LEADER 전용 전결 체크박스) + 내 신청 목록 + (ADMIN/LEADER) 결재함. `AppHeader`에 "신청" 최상위 메뉴 추가.
  - `GET /api/tasks/calendar`가 해당 월과 겹치는 승인된 `LEAVE` 신청을 `leavesByDate`로 함께 반환하도록 확장하고, `/calendar` 페이지 각 날짜 셀에 🌴 휴가자 이름을 표시하도록 수정.
  - `middleware.ts`/`LayoutWrapper.tsx`에 `/announcements`, `/requests` 인증 필요 라우트로 추가.
- 디버깅 체크: `npx tsc --noEmit` 결과 이번에 변경/추가한 파일에서 신규 타입 오류 없음(남은 오류는 전부 Prisma 클라이언트 미생성으로 인한 기존 오류, `npx prisma generate`는 이 환경의 네트워크 제약으로 계속 실패). `npm run dev`로 개발 서버를 기동해 `/login`이 정상 렌더링됨을 확인했고, `middleware.ts`의 `protectedRoutes`를 임시로 비운 뒤 `/requests`·`/announcements`·`/users`·`/calendar`·`/dashboard`·`/tasks`가 모두 200과 에러 없는 HTML을 반환함을 확인한 후 원래 상태로 되돌림(DB 미연결로 실제 로그인 세션을 발급할 수 없어 택한 임시 검증 방법). `npm run lint`는 ESLint 설정 파일 부재로 이번에도 실행하지 못함(기존 제약). **실제 개발/DB 연결 환경에서 로그인 후 공지 등록·닫기, 휴가/비품 신청·전결·결재, 캘린더 휴가자 표시 전체 플로우를 반드시 재확인 필요.**

## 2026-07-01 (25차)

- **"관리" 메뉴를 "설정"으로 변경 + 구글 캘린더 연동 페이지 신설**: 사용자 확인 결과 "설정" 드롭다운도 기존과 동일하게 ADMIN/LEADER에게만 노출하기로 결정(`AppHeader.tsx`, 내부 상태 키도 `admin`→`settings`로 정리). `/settings/calendar-sync` 페이지를 신설해 기존 `GET /api/calendar/ical-url`을 재사용, 구독 URL 발급/복사 버튼 + Google Calendar 등록 단계별 안내를 제공. 계정 드롭다운(로그아웃 위)에 있던 "캘린더 구독 URL 복사"(alert 기반) 버튼은 제거하고 이 페이지로 대체.
- **프로젝트별 위키 기능 신설**: git 이력 전체를 검색했으나 "위키"/"wiki" 관련 코드·커밋이 한 번도 존재한 적이 없어(사용자가 언급한 "있었는데 사라진" 기능은 이 저장소 기준으로는 신규) 요청대로 새로 구현.
  - `WikiPage` 모델 신설(`projectId`, `title`, `content`, `authorId`). `GET/POST /api/projects/[id]/wiki`, `PATCH/DELETE /api/projects/[id]/wiki/[wikiId]` — 조회/작성/수정은 해당 프로젝트 `ProjectMember` 또는 ADMIN만(`checkAccess`), 삭제는 작성자 본인 또는 ADMIN만 추가 제한.
  - `/projects/[id]/wiki` 페이지 신설(`/info` FAQ 페이지의 아코디언 + 라이트 마크다운 에디터 패턴을 위키용으로 재구현). `/projects` 목록에서 프로젝트 선택 시 멤버 패널에 "📖 프로젝트 위키" 링크 추가.
  - **플로팅 검색**: `WikiSearchButton.tsx` 신설 — 로그인 후 모든 페이지 우하단에 고정 노출되는 원형 버튼, 클릭 시 검색 모달(`Modal` 공통 컴포넌트 재사용)에서 `GET /api/wiki/search?q=`로 실시간 검색. 검색 범위는 요청자가 소속된 프로젝트로 한정(ADMIN은 전체) — 소속되지 않은 프로젝트의 위키는 검색 결과에도 노출되지 않음. 결과 클릭 시 `/projects/[projectId]/wiki?open=[wikiId]`로 이동해 해당 문서를 자동으로 펼침. `LayoutWrapper.tsx`에 전역 삽입.
- **외부연동(Slack/잔디/Teams/텔레그램/카카오톡) 관리자 설정 신설**: 이 기능도 git 이력 검색 결과 UI가 존재한 적이 없었음("외부연동"/"텔레그램"/"팀즈" 문자열이 어떤 커밋에도 없음) — 기존에는 Slack/잔디/카카오톡 발송 로직이 `.env` 변수로만 존재했고 Teams/텔레그램은 아예 없었음. 사용자 확인 결과 ADMIN 전용 기능으로 결정.
  - `Integration` 모델 신설(`channel` unique, `webhookUrl`, `botToken`/`chatId`(텔레그램 전용), `isEnabled`).
  - `src/lib/integrations.ts` 신설: DB에 저장된 설정을 우선 사용하고 해당 채널에 DB row가 없을 때만 기존 `.env`(`SLACK_WEBHOOK_URL` 등)로 폴백하는 `getWebhookUrl`/`sendToChannel`/`broadcastNotification`/`sendTestMessage` 제공. Teams는 MessageCard 포맷, 텔레그램은 Bot API `sendMessage`로 발송.
  - `src/lib/webhook.ts`(업무 상태 변경 시 발송의 메인 경로, `task.service.ts`/`api/tasks/[id]/status`에서 호출)를 `integrations.ts` 기반으로 전면 재작성 — 기존에는 Slack/잔디/카카오톡 3개 채널만 각각 하드코딩된 함수로 존재했는데, 이제 5개 채널 모두 활성화 여부에 따라 동시 발송됨. 아무도 import하지 않던 `sendSlackNotification`/`sendJandiNotification`/`sendKakaoNotification`/`buildXxxMessage` 등 개별 함수는 제거.
  - `src/lib/services/webhook.service.ts`(별도 경로: `notify.ts`의 담당자변경/검수요청 알림, `POST /api/webhooks/slack` 내부 엔드포인트에서 사용)는 기존 로직·`Notification` 테이블 기록은 그대로 두고 Slack/잔디 URL 조회만 `integrations.ts`의 `getWebhookUrl`을 사용하도록 변경 — 두 경로 모두 새 설정 화면을 동일하게 반영하도록 일관성 확보.
  - `/settings/integrations` 페이지 신설(ADMIN 전용, 페이지/API 모두 재검증): 채널별 Webhook URL(텔레그램은 봇 토큰+Chat ID) 입력, 사용 여부 토글, 저장 전에도 값 그대로 테스트 발송 가능(`POST /api/settings/integrations/[channel]/test`). `AppHeader`의 "설정" 드롭다운에 "외부연동" 항목 추가(ADMIN에게만 노출, LEADER에게는 다른 설정 메뉴만 보임).
- 디버깅 체크: `npx tsc --noEmit`에서 신규 로직 오류 2건(`src/app/api/wiki/search/route.ts`의 널 내로잉 이슈, 암묵적 any) 발견 후 수정, 재실행 결과 신규 오류 없음(남은 오류는 전부 기존과 동일한 Prisma 클라이언트 미생성 관련). 개발 서버를 기동해 `/settings/calendar-sync`, `/settings/integrations`, `/projects/1/wiki`, `/projects`가 모두 200과 에러 없는 HTML을 반환함을 확인(이 경로들은 `middleware.ts`의 `protectedRoutes`에 포함되지 않아 별도 우회 없이 바로 확인 가능했음). `npm run lint`는 이번에도 ESLint 설정 파일 부재로 실행하지 못함(기존 제약). **실제 DB 연결 환경에서 로그인 후 위키 작성/검색/권한 차단, 캘린더 연동 URL 발급, 외부연동 채널별 실제 메시지 수신 여부를 반드시 재확인 필요.**

## 2026-07-01 (26차)

- 위키 진입 동선 개선: 직전 커밋에서 위키 접근 경로를 `/projects` 목록 → 프로젝트 선택 → 멤버 패널 링크로만 만들었더니 눈에 띄지 않고 문서 등록까지 클릭이 여러 번 필요하다는 피드백을 받아, 헤더 상단에 "위키" 메뉴(정보/신청 옆)와 `/wiki` 허브 페이지를 신설.
  - `/wiki`: 소속된 모든 프로젝트(ADMIN은 전체)의 위키 문서를 `GET /api/wiki/search?q=`(빈 쿼리로 호출 시 전체 목록 반환)로 한 번에 불러와 프로젝트별로 묶어 카드 목록으로 표시. 상단 "+ 문서 등록" 버튼 클릭 시 프로젝트 선택 드롭다운 + 제목 + 본문(라이트 마크다운 에디터, `/projects/[id]/wiki`와 동일한 컴포넌트를 이 페이지에도 로컬로 구현) 입력 폼이 바로 열리고, 제출 시 선택한 프로젝트의 `POST /api/projects/[id]/wiki`로 등록됨. 소속 프로젝트가 없으면 "관리자에게 프로젝트 배정을 요청하세요" 안내만 표시.
  - 문서 카드를 클릭하면 기존 `/projects/[id]/wiki?open=[id]` 상세 페이지로 이동(전결/삭제 등 나머지 관리 기능은 계속 그 페이지에서 담당).
  - `GET /api/wiki/search`의 결과 개수 제한을 30 → 100으로 확대(허브에서 전체 목록 용도로도 재사용하기 위함).
  - `AppHeader.tsx`에 "위키" 최상위 메뉴 추가(전 역할 노출), `LayoutWrapper.tsx`의 인증 필요 경로 목록에 `/wiki` 추가.
- 디버깅 체크: `npx tsc --noEmit` 신규 오류 없음(기존 Prisma 클라이언트 미생성 오류만 잔존). 개발 서버에서 `/wiki`가 200과 에러 없는 HTML을 반환함을 확인.

## 2026-07-01 (27차)

- **프로젝트별 업무 상태(칸반 단계) 커스터마이징**: 기존에는 ASSIGNED/PROGRESS/REVIEW/QA/DONE 5단계가 전체 프로젝트에 고정. 사용자 확인 결과 "단계 수·순서까지 자유롭게" 구성 가능하도록 결정하고 구현.
  - `ProjectStatus` 모델 신설(`projectId`+`code` unique, `label`, `color`, `order`, `isProgress`, `isDone`). `src/lib/task-status.ts`의 `getProjectStatuses(projectId)`가 DB에 커스텀 단계가 있으면 그것을, 없으면(기존 프로젝트 포함) `DEFAULT_STATUSES`(기존 5단계와 동일한 값)를 그 자리에서 합성해 반환 — 마이그레이션 없이 기존 프로젝트가 그대로 동작.
  - `GET/PUT /api/projects/[id]/statuses`(조회는 전 역할, 저장은 ADMIN/LEADER), `GET /api/projects/statuses`(접근 가능한 전체 프로젝트 상태를 일괄 조회하는 N+1 방지용 벌크 엔드포인트) 신설.
  - `/projects/[id]/statuses` 관리 페이지 신설: 단계 추가/삭제, 위/아래 순서 변경, 이름/색상(`<input type="color">`)/진행중 단계(`isProgress`)/완료 단계(`isDone`) 편집 후 일괄 저장. 저장 시 라벨에서 코드 자동 생성(중복 시 접미사), 기존 단계는 코드가 보존되어 기존 업무의 상태값이 깨지지 않음. `/projects` 멤버 패널에 "⚙️ 상태 관리" 링크 추가(ADMIN/LEADER만).
  - `POST /api/tasks`의 하드코딩된 `status: 'ASSIGNED'`(그룹/하위 업무 포함 3곳)를 프로젝트의 첫 단계 코드로 교체. `PATCH /api/tasks/[id]/status`의 고정 `validStatuses` 배열과 `status === 'PROGRESS'` 리터럴 비교(자동 시간카운터 트리거)를 프로젝트별 상태 조회 + `isProgress` 플래그 기반으로 일반화. `PATCH /api/tasks/[id]`의 상태값 검증도 동일하게 동적 검사로 교체.
  - `useProjectStatuses` 훅 신설(`GET /api/projects/statuses` 한 번 호출 후 `getStatuses(projectId)`로 조회) — `/tasks`(상태 필터 드롭다운을 실제 사용 중인 상태의 동적 합집합으로, 행별 상태 변경 셀렉트를 해당 업무의 프로젝트 상태 목록으로), `/tasks/[id]`(상태 배지 라벨/색상을 프로젝트 상태에서 조회), `/tasks/kanban`(신설된 프로젝트 선택 드롭다운으로 해당 프로젝트의 단계를 컬럼으로 구성, 미선택 시 실사용 상태의 동적 합집합, 컬럼에 없는 상태값은 "기타" 컬럼으로 격리)에 적용.
  - `KanbanColumn`은 고정 CSS `[data-status]` 색상 대신 프로젝트 상태의 `color` 값을 인라인 스타일로 적용하도록 변경.
  - `api/stats/summary`의 `done`/`completionRate`는 업무별 프로젝트의 `isDone` 플래그 기반으로 일반화. **스코프 경계**: 배정됨/진행중/검수/QA 4개 세부 통계 카드, 대시보드 업무 카드 라벨, 캘린더 업무 칩 배경색은 여전히 기본 5단계 리터럴 코드 기준이라 커스텀 상태 프로젝트에서는 정확히 반영되지 않음(깨지지는 않고 원문 코드나 중립색으로 표시) — 필요 시 후속 작업.
- **대시보드 정리**: "리더 기능" 섹션 제목 텍스트 제거, 링크를 업무배정/통계조회/캘린더/신규 신청(→`/requests`) 4개로 교체(칸반 보드 링크 제거). "나의 업무" 섹션 아래 "업무 등록" 버튼 삭제. 버튼 이모지(👥📋📊📈📅➕)를 모두 제거하고 `.actionLink`를 전역 `.btn .btn-secondary` 프리미티브 기반으로 리스타일해 다른 페이지와 톤을 맞춤(`dashboard/page.tsx`, `dashboard.module.css`, 미사용 `.mb4` 클래스 삭제).
- 디버깅 체크: `npx tsc --noEmit`에서 신규 오류 2건(`stats/summary/route.ts`의 `Set`/`Array.from` 타입 추론 이슈로 `unknown` 추론) 발견 후 `Set<number | null>` 명시로 수정, 재확인 결과 신규 오류 없음(잔존 오류는 전부 기존 Prisma 클라이언트 미생성 관련). 개발 서버 기동 후 `middleware.ts`의 `protectedRoutes`를 임시로 비워 `/dashboard`·`/tasks`·`/tasks/kanban`·`/projects/1/statuses`가 200과 에러 없는 HTML을 반환함을 확인한 뒤 원복(DB 미연결로 실제 세션 발급 불가에 따른 임시 검증). `npm run lint`는 이번에도 ESLint 설정 파일 부재로 실행하지 못함(기존 제약). **실제 DB 연결 환경에서 프로젝트 상태 단계 저장/재정렬, 커스텀 단계로 업무 생성·상태변경(자동 시간카운터 포함), 칸반 프로젝트 필터, 통계 완료율 전체 플로우를 반드시 재확인 필요.**

## 2026-07-01 (28차)

- 업무 목록(`/tasks`)에 프로젝트 전환 드롭다운 추가: 여러 프로젝트에 소속된 사용자가 다른 프로젝트의 업무로 이동할 경로가 없다는 피드백. 필터 바 맨 앞에 `GET /api/projects`(소속 프로젝트만 조회, ADMIN은 전체)로 채운 프로젝트 셀렉트를 추가해 선택 시 해당 프로젝트의 업무만 클라이언트 필터링해서 보여주도록 수정(`selectedProject` 상태, 기존 상태/담당자 필터와 동일한 방식). 소속 프로젝트가 없는 사용자에게는 드롭다운이 아예 숨겨짐(`tasks/page.tsx`).
- 디버깅 체크: `npx tsc --noEmit` 신규 오류 없음. 개발 서버에서 `middleware.ts`의 `protectedRoutes`를 임시로 비워 `/tasks`가 200과 에러 없는 HTML을 반환함을 확인 후 원복.

## 2026-07-01 (29차)

- **`/tasks`와 프로젝트 상태 관리가 연동되지 않는 버그 수정**: 원인은 `GET /api/projects/statuses`(및 방금 추가한 `/tasks`의 프로젝트 드롭다운이 쓰던 `GET /api/projects`)가 `ProjectMember` 소속 여부만으로 프로젝트를 골라왔는데, `GET /api/tasks`는 WORKER 역할일 때 프로젝트 소속과 무관하게 `workerId`로 배정된 업무를 전부 반환하기 때문 — 즉 프로젝트에 정식으로 소속(멤버 등록)되지 않은 채로 그 프로젝트의 업무만 배정받은 WORKER는 `/tasks`에 해당 업무가 보이는데도 그 프로젝트에서 설정한 커스텀 상태 단계를 받아오지 못하고 기본 5단계로만 표시되던 문제였음.
  - `GET /api/projects/statuses`(bulk): ADMIN이 아닌 경우 `ProjectMember` 소속 프로젝트에 더해, 본인이 `workerId` 또는 `plannerId`로 연결된 업무가 있는 프로젝트까지 합쳐서 상태를 조회하도록 수정.
  - `/tasks`의 프로젝트 전환 드롭다운(28차에서 추가)도 동일한 근본 원인으로 소속되지 않은 프로젝트가 누락될 수 있어, 별도 `GET /api/projects` 호출 대신 이미 로드된 `tasks` 배열에서 `task.project`를 직접 모아 구성하도록 변경(담당자 필터 목록을 만드는 기존 방식과 동일한 패턴) — 이렇게 하면 `/tasks`에 실제로 보이는 업무의 프로젝트와 드롭다운 목록이 항상 정확히 일치한다.
- 디버깅 체크: `npx tsc --noEmit` 신규 오류 없음(잔존 오류는 기존 Prisma 클라이언트 미생성 관련뿐). 개발 서버에서 `middleware.ts`의 `protectedRoutes`를 임시로 비워 `/tasks`가 200과 에러 없는 HTML을 반환함을 확인 후 원복. **DB 미연결 환경이라 실제로 프로젝트 비소속 WORKER 계정으로 로그인해 커스텀 상태가 정상 표시되는지는 재확인하지 못함 — 실제 환경에서 반드시 확인 필요.**

## 2026-07-01 (30차)

- **"tasks 프로젝트 셀렉트에 1개만 보임" + "상태가 상단/리스트와 연동 안 됨" 버그 재점검 및 수정**: 사용자가 재현한 심각한 버그 리포트를 받아 프로젝트/상태 관련 코드 전체를 다시 감사.
  - **근본 원인**: 직전(29차) 수정에서 `/tasks`의 프로젝트 드롭다운을 "이미 로드된 tasks에서 파생"하도록 바꿨는데, 이는 "현재 화면에 업무가 있는 프로젝트"만 보여줘서 정작 **소속되어 있지만 아직 보이는 업무가 없는(또는 적은) 프로젝트가 드롭다운에서 빠지는** 새로운 문제를 만들었음(사용자가 보고한 "1개만 보인다"). 근본적으로는 `GET /api/projects`가 `ProjectMember` 소속만 기준으로 프로젝트를 가져오는데, WORKER는 업무 목록 자체가 프로젝트 소속과 무관하게 배정된 업무를 전부 보여주기 때문에 "소속 기준 프로젝트 목록"과 "실제 보이는 업무의 프로젝트"가 애초에 서로 다른 두 집합이었던 것이 근본 원인.
  - **수정 1**: `GET /api/projects` 자체를 API 레벨에서 고침 — ADMIN이 아니면 `ProjectMember` 소속 프로젝트 **OR** 본인이 `workerId`/`plannerId`로 연결된 업무가 있는 프로젝트를 함께 반환하도록 `where` 조건을 `OR`로 확장(`src/app/api/projects/route.ts`). 이 API를 쓰는 모든 화면(`/tasks` 프로젝트 드롭다운, `/tasks/kanban` 프로젝트 선택, `/tasks/create` 프로젝트 선택, `/wiki` 허브)이 한 번에 일관되게 고쳐짐.
  - `/tasks`의 프로젝트 드롭다운을 다시 `GET /api/projects` 호출 방식으로 되돌림(이제 API가 고쳐졌으므로 소속+업무배정 프로젝트를 모두 정확히 받아옴).
  - `/wiki` 허브는 위키가 "소속 멤버만 작성 가능"이라는 원래 정책이 있어, 넓어진 `GET /api/projects` 응답에서 실제로 `members`에 본인이 포함된 프로젝트만(ADMIN 제외) 문서 등록 드롭다운에 남도록 클라이언트에서 추가로 필터링(안 그러면 드롭다운엔 보이는데 등록 시 403이 나는 불일치가 생김).
  - **상태 연동 수정**: `/tasks` 상단 "상태" 필터 옵션이 현재 선택된 프로젝트/담당자 필터를 무시하고 전체 업무 기준으로 구성되고 있어서, 프로젝트를 바꿔도 다른 프로젝트의 무관한 상태가 계속 섞여 나오던 문제 수정 — 프로젝트/담당자 필터가 반영된 부분집합에서만 상태 옵션을 만들도록 변경하고, 프로젝트를 바꾸면 상태 필터를 자동으로 초기화하도록 추가.
- 디버깅 체크: `npx tsc --noEmit` 신규 오류 없음. 개발 서버에서 `middleware.ts`의 `protectedRoutes`를 임시로 비워 `/tasks`·`/wiki`·`/projects`가 모두 200과 에러 없는 HTML을 반환함을 확인 후 원복. `npm run lint`는 이번에도 ESLint 설정 파일 부재로 실행하지 못함. **DB 미연결 환경이라 실제 계정으로 여러 프로젝트 소속 상태에서 드롭다운/상태 필터가 전부 정상 노출되는지는 재확인하지 못함 — 실제 환경에서 반드시 확인 필요.**

## 2026-07-01 (31차)

- **업무 등록 후 새로 등록한 프로젝트로 이동하도록 수정**: 기존에는 업무 등록 성공 시 무조건 `/tasks`(전체 프로젝트)로 이동해, 방금 등록한 업무가 속한 프로젝트로 필터링되지 않는 문제가 있었음.
  - `tasks/create/page.tsx`: 등록 성공 시 `router.push('/tasks')` 대신, 폼에서 선택한 `projectId`가 있으면 `router.push(\`/tasks?projectId=${projectId}\`)`로 이동하도록 수정(프로젝트를 선택하지 않은 경우는 기존과 동일하게 `/tasks`로 이동).
  - `tasks/page.tsx`: `useSearchParams()`로 `projectId` 쿼리 파라미터를 읽어 `selectedProject` 초기값으로 사용하도록 수정. 이 훅 사용을 위해 페이지 컴포넌트를 `<Suspense>`로 감싸는 기존 컨벤션(`tasks/create/page.tsx`와 동일 패턴)을 그대로 적용.
- **그룹 업무 행에서 상태 선택 드롭다운 노출 제거**: 그룹(하위 업무를 가진) 행은 그 자체로는 진행 상태를 직접 변경하는 개념이 없는데도 상태 변경 셀렉트박스가 노출되어 혼란을 줄 수 있었음. `renderTaskRow`의 상태 열을 `isGroupRow`일 때는 `-`만 표시하고, 일반 업무 행일 때만 기존 상태 셀렉트를 렌더링하도록 수정.
- 디버깅 체크: `npx tsc --noEmit` 신규 오류 없음(잔존 오류는 기존 Prisma 클라이언트 미생성 관련뿐). 개발 서버에서 `middleware.ts`의 `protectedRoutes`를 임시로 비워 `/tasks`·`/tasks?projectId=1`·`/tasks/create`가 모두 200과 에러 없는 HTML을 반환함을 확인 후 원복. `npm run lint`는 이번에도 ESLint 설정 파일 부재로 실행하지 못함. **DB 미연결 환경이라 실제로 업무 등록 후 리다이렉트되는 화면에 방금 등록한 프로젝트가 필터링되어 보이는지, 그룹 행에서 상태 열이 의도한 대로 숨겨지는지는 재확인하지 못함 — 실제 환경에서 반드시 확인 필요.**

## 2026-07-01 (32차)

- **업무 목록 새로고침 시 필터 유지**: `/tasks`의 프로젝트/상태/담당자 필터가 컴포넌트 state로만 관리되어, 필터를 적용한 채로 브라우저를 새로고침(F5)하면 전부 초기화되던 문제 수정.
  - `tasks/page.tsx`: `selectedProject`/`selectedStatus`/`selectedWorker` 값을 URL 쿼리 파라미터(`projectId`/`status`/`workerId`)에 실시간으로 동기화(`router.replace`, `scroll: false`)하도록 수정하고, 세 상태 모두 `useSearchParams()`로 읽은 값을 초기값으로 사용하도록 변경(기존에는 `projectId`만 URL과 연동되어 있었음). 이제 새로고침해도 주소창의 쿼리가 그대로 남아 필터가 복원되고, 필터가 적용된 URL을 그대로 북마크/공유해도 동일한 화면이 열림.
- 디버깅 체크: `npx tsc --noEmit` 신규 오류 없음(잔존 오류는 기존 Prisma 클라이언트 미생성 관련뿐). 개발 서버에서 `middleware.ts`의 `protectedRoutes`를 임시로 비워 `/tasks`, `/tasks?projectId=1`, `/tasks?status=DONE&workerId=2`가 모두 200과 에러 없는 HTML을 반환함을 확인 후 원복. `npm run lint`는 이번에도 ESLint 설정 파일 부재로 실행하지 못함. **DB 미연결 환경이라 실제 로그인 세션에서 필터 선택 → 새로고침 시 값이 그대로 유지되는지는 재확인하지 못함 — 실제 환경에서 반드시 확인 필요.**

## 2026-07-01 (33차)

- **개선 1.0 Phase 1: 프로젝트별 커스텀 필드(노션식 자유 속성) 도입** (`docs/개선1.0.md` 계획 문서 기반). 업무 목록의 8개 고정 컬럼 외에, 프로젝트마다 원하는 속성(컬럼)을 자유롭게 추가/삭제할 수 있게 함 — "노션의 자유도 + 지라의 편의성"을 목표로 하되 필드 타입은 5종(텍스트/숫자/날짜/선택/체크박스), 프로젝트당 최대 10개로 제한해 복잡도를 통제.
  - `prisma/schema.prisma`: `ProjectField`(정의: `projectId`, `name`, `type`, `options`, `order`, `@@unique([projectId, name])`), `TaskFieldValue`(값: `taskId`, `fieldId`, `value`, `@@unique([taskId, fieldId])`) 모델 추가. 기존 `ProjectStatus`와 동일한 "프로젝트 단위 정의 + 값 테이블" 패턴 재사용.
  - `src/app/api/projects/[id]/fields/route.ts`(신규): GET 조회, PUT 전체 교체(ADMIN/LEADER, 최대 10개·이름 필수 검증) — `statuses/route.ts`와 동일 구조.
  - `src/app/api/tasks/[id]/fields/route.ts`(신규): PUT으로 개별 업무의 필드 값 upsert(ADMIN/LEADER).
  - `src/app/api/tasks/route.ts`: 목록 조회 시 `fieldValues` include 추가.
  - `src/hooks/useProjectFields.ts`(신규): `useProjectStatuses.ts` 패턴을 따라 `getFields`/`saveFields`/`saveValue` 제공.
  - `src/types/index.ts`: `ProjectField`, `TaskFieldValue` 타입 추가, `Task.fieldValues?` 필드 추가.
  - `src/app/tasks/page.tsx` / `tasks.module.css`: 프로젝트를 선택했을 때만 커스텀 필드 컬럼을 동적으로 렌더링. 헤더의 "+ 속성 추가" 버튼(팝오버로 이름/타입/선택지 입력)으로 즉석 추가, 각 필드 헤더의 ✕ 버튼으로 삭제(확인창 포함). 셀은 타입별 인라인 편집(텍스트/숫자/날짜=input, 선택=select, 체크박스=checkbox)이며 값은 즉시 로컬 반영 후 `PUT /api/tasks/:id/fields`로 저장.
  - 전체 보기(프로젝트 미선택) 상태에서는 커스텀 필드 컬럼을 숨김(여러 프로젝트의 서로 다른 필드가 뒤섞이는 것을 방지).
  - Phase 2(업무 상세 페이지 반영)·Phase 3(칸반 노출)는 이번 범위에서 제외 — `docs/개선1.0.md` 참고.
- 디버깅 체크: `npx tsc --noEmit` 결과 변경/신규 파일에서 신규 타입 오류 없음(Prisma 클라이언트가 네트워크 제약으로 생성되지 않아 `prisma.*` 호출이 전반적으로 `any`로 처리되는 기존 베이스라인은 여전함 — `PrismaClient` export 오류 등). `npx prisma generate`/`migrate`는 이 환경에서 DB 및 Prisma 엔진 다운로드용 네트워크가 차단되어 있어 실행 불가(기존과 동일한 환경 제약) — **실제 배포/개발 환경에서 반드시 `npx prisma migrate dev`(또는 `db push`)로 스키마를 반영하고, 브라우저에서 프로젝트 선택 → 속성 추가/편집/삭제 → 새로고침 후 값 유지까지 end-to-end로 확인 필요.**

## 2026-07-01 (34차)

- **개선 1.0 Phase 2: 업무 상세 페이지에 커스텀 필드(속성) 반영**, Phase 3(칸반 노출)는 사용자 확인 후 보류.
  - `src/app/tasks/[id]/page.tsx`: "기본 정보" 카드 아래 "속성" 카드 추가. `useProjectFields(task.projectId)`로 해당 프로젝트의 커스텀 필드를 조회하고, 필드가 하나도 없으면 카드 자체를 렌더링하지 않음. ADMIN/LEADER는 목록 페이지와 동일한 타입별 인라인 편집(텍스트/숫자/날짜=input, 선택=select, 체크박스=checkbox)이 가능하고, `saveValue`로 `PUT /api/tasks/:id/fields`에 저장.
  - `src/app/api/tasks/[id]/route.ts`: GET 응답에 `fieldValues` include 추가(기존에는 목록 조회(`/api/tasks`)에만 포함되어 있어 상세 조회 시 값이 비어 있었음).
  - `src/app/tasks/[id]/detail.module.css`: `.fieldSelect`(선택형 필드용, 기존 `field-select` 프리미티브 재사용) 클래스 추가.
  - `docs/개선1.0.md`: Phase 1·2 완료 표기, **Phase 3(칸반 노출)는 목록/상세로 충분하다고 판단해 진행하지 않기로 결정**했음을 명시.
  - **DB 마이그레이션 자동화 확인**: 별도 코드 변경 없음 — `package.json`의 `build` 스크립트가 이미 `prisma generate && prisma db push --skip-generate && next build` 순서로 구성되어 있어, `npm run build`를 실행할 때마다(배포 시 포함) 현재 스키마가 DB에 자동 반영된다. 이번 Phase 1에서 추가한 `ProjectField`/`TaskFieldValue` 테이블도 별도 마이그레이션 명령 없이 다음 빌드에서 자동 생성됨.
- 디버깅 체크: `npx tsc --noEmit` 결과 변경 파일(`tasks/[id]/page.tsx`, `tasks/[id]/route.ts`)에서 신규 타입 오류 없음. 동일한 환경 제약(네트워크 차단)으로 `prisma generate`/`db push`/`npm run build`는 이번 세션에서 실행하지 못함 — **실제 배포 환경에서 빌드 후 브라우저로 상세 페이지의 "속성" 카드가 목록과 동일한 값을 보여주는지, 필드가 없는 업무는 카드가 안 보이는지 확인 필요.**

## 2026-07-01 (35차)

- **빌드 오류 수정**: 실제 배포(Railway) 빌드 로그에서 `./src/app/tasks/tasks.module.css` 컴파일 실패 발견 — `composition is only allowed when selector is single :local class name` 에러. 33차에서 추가한 `.addFieldPopover input, .addFieldPopover select { composes: field-input from global; ... }`가 원인. CSS Modules의 `composes`는 단일 클래스 셀렉터에만 허용되는데, 컴파운드(디센던트) 셀렉터에 적용해서 발생.
  - `tasks.module.css`: 해당 규칙을 제거하고 독립된 `.addFieldInput { composes: field-input from global; font-size: 13px; }` 클래스로 분리.
  - `tasks/page.tsx`: "+ 속성 추가" 팝오버의 input/select 3곳(이름/타입/선택지)에 `className={styles.addFieldInput}`을 직접 적용.
  - 재발 방지 차원에서 저장소 전체 `.module.css`를 훑어 `composes`가 컴파운드 셀렉터에 걸린 다른 사례가 없는지 확인 — 없음.
- 디버깅 체크: `npx tsc --noEmit` 신규 오류 없음. `npx next build`로 재현 시도 — 이 CSS 컴파일 오류는 사라지고 빌드가 그 다음 단계(webpack 모듈 트랜스파일)까지 진행됨을 확인. 다만 이 샌드박스에는 `sanitize-html` 패키지가 설치되어 있지 않아(`@types/sanitize-html`만 있고 실제 패키지 없음) 이후 단계에서 무관한 `Module not found: Can't resolve 'sanitize-html'` 오류로 빌드가 중단됨 — 이는 이번 변경과 무관한 샌드박스 자체의 의존성 설치 문제이며, 실제 배포 로그에서는 해당 단계까지 통과했었으므로 별도 조치 없이 다음 배포에서 확인 필요.

## 2026-07-01 (36차)

- **업무 목록을 프로젝트별 리스트로 재구성**: 기존에는 단일 테이블 + "프로젝트" 필터 드롭다운 구조였는데, 커스텀 필드 "+ 속성 추가" 버튼이 프로젝트를 먼저 선택해야만 나타나 사용자가 찾기 어렵다는 피드백을 받아 전면 재구성. 프로젝트 필터를 없애고, 대신 소속된(또는 배정 업무가 있는) 각 프로젝트마다 **"OOO 리스트"라는 독립된 섹션(자체 테이블)**을 세로로 나열하도록 변경. 프로젝트가 지정되지 않은 업무는 맨 아래 "미지정 업무" 섹션으로 별도 표시. 상태/담당자 필터는 페이지 전역에 그대로 유지.
  - `tasks/page.tsx`: 테이블/커스텀필드/그룹토글/제목수정 로직 전체를 `ProjectTaskSection` 하위 컴포넌트로 분리(프로젝트별로 `useProjectFields(project.id)`를 각자 독립적으로 호출해야 하므로 React Hook 규칙상 반복문 안에서 조건부 호출이 불가능 — 컴포넌트로 나눠 해결). 각 섹션은 자기 프로젝트의 커스텀 필드와 "+ 속성 추가" 버튼을 항상 바로 노출(더 이상 필터 선택 불필요).
  - 프로젝트 노출 순서: 내 프로젝트 목록 순서 우선, 소속 외 프로젝트(배정된 업무만 있는 경우)는 뒤에, 미지정 업무는 맨 마지막.
- **커스텀 필드(속성) 컬럼 드래그 순서 변경 추가**: 노션처럼 속성 컬럼 헤더를 드래그해서 순서를 바꿀 수 있도록 `draggable`/`onDragStart`/`onDragOver`/`onDrop` 핸들러 추가(`handleFieldReorder`) — 순서 배열을 재계산해 `saveFields`로 저장. 각 헤더에 드래그 힌트 아이콘(⠿) 표시.
  - `tasks.module.css`: `.fieldTh`에 `cursor: grab`, `.fieldDragHandle` 추가.
- **버그 수정: "+ 속성 추가" 팝오버가 테이블에 가려지던 문제**. `.table`에 걸려있던 `overflow: hidden`(라운드 코너용) 때문에 `position: absolute`인 팝오버가 테이블 경계에서 잘려 보이지 않던 것을 확인 — `overflow: hidden` 제거(라운드 코너보다 팝오버 노출 우선). 참고로 `.table`을 감싸는 `.tableWrapper` 클래스가 CSS에 정의되어 있지 않아 실제로는 아무 오버플로우 스타일이 적용되지 않고 있었는데, 이번에 `overflow-x: auto; overflow-y: visible;`로 정의를 추가해 가로 스크롤은 유지하면서 세로로는 팝오버가 잘리지 않도록 함.
- 디버깅 체크: `npx tsc --noEmit` 신규 오류 없음. `npx next build`로 CSS 컴파일 통과 확인(이후 `sanitize-html` 미설치로 인한 무관한 오류로 중단되는 것은 35차와 동일한 샌드박스 제약). **실제 배포 환경에서 프로젝트별 섹션이 올바르게 나뉘어 보이는지, 각 섹션의 "+ 속성 추가"가 바로 보이는지, 필드 드래그 순서변경이 저장되는지 브라우저로 확인 필요.**

## 2026-07-01 (37차)

- **"+ 속성 추가" 팝오버가 여전히 가려지던 문제 근본 수정**: 36차에서 `.table`의 `overflow: hidden`을 제거하고 `.tableWrapper`에 `overflow-x: auto; overflow-y: visible;`을 추가했는데도 여전히 가려진다는 피드백. 원인은 CSS 스펙상 `overflow-x`가 `visible`이 아닌 값(`auto`)이면 `overflow-y: visible`도 브라우저가 강제로 `auto`처럼 취급해 결국 클리핑된다는 점 — 두 축을 독립적으로 제어할 수 없는 근본적 한계였음.
  - `tasks/page.tsx`: 팝오버를 테이블 내부에 두는 대신 `react-dom`의 `createPortal`로 `document.body`에 직접 렌더링하도록 변경(노션/지라 등에서 쓰는 방식). "+ 속성 추가" 버튼의 `getBoundingClientRect()`로 화면 좌표를 계산해 `position: fixed`로 배치하므로 어떤 조상 요소의 `overflow`에도 영향받지 않음. 바깥 클릭/Escape/스크롤/리사이즈 시 자동으로 닫히도록 이벤트 리스너 추가(`toggleAddField`, 관련 `useEffect`).
  - `tasks.module.css`: `.addFieldPopover`에서 `position/top/right`(테이블 기준 상대 위치) 제거 — 이제 인라인 style로 화면 좌표를 직접 지정하므로 불필요.
  - **버튼 라벨 정리**: "+ 속성 추가" 텍스트를 없애고 아이콘 버튼(`+`)만 노출하도록 변경(`aria-label`/`title`로 접근성 유지), 사용자 피드백 반영.
- 디버깅 체크: `npx tsc --noEmit` 신규 오류 없음. `npx next build`로 CSS/webpack 컴파일 통과 확인(이후 무관한 `sanitize-html` 미설치 오류로 중단되는 것은 이전 차수와 동일한 샌드박스 제약). **실제 배포 환경에서 페이지를 가로/세로로 스크롤한 상태에서도 팝오버가 버튼 근처에 온전히 보이는지, 바깥 클릭 시 잘 닫히는지 브라우저로 확인 필요.**

## 2026-07-01 (38차)

- **"로딩 중..." 텍스트를 회전 스피너로 교체**: 공용 `Spinner` 컴포넌트(`src/components/common/Spinner.tsx` + `Spinner.module.css`) 신설 — 옅은 회색 링 위에 accent 컬러(`var(--accent)`)만 회전하는 얇은 보더 스피너(sm/md/lg 사이즈), 아래에 작은 라벨(`role="status" aria-live="polite"`로 접근성 처리). 전역 디자인 토큰(`--accent`, `--border`, `--text-muted`)만 사용해 기존 톤과 자연스럽게 어울리도록 함.
  - 앱 전체에서 `로딩 중...` 텍스트를 그대로 쓰던 19개 파일(`tasks/page.tsx`, `tasks/[id]/page.tsx`, `tasks/create/page.tsx`, `tasks/kanban/page.tsx`, `dashboard/page.tsx`, `calendar/page.tsx`, `info/page.tsx`, `profile/password/page.tsx`, `wiki/page.tsx`, `projects/page.tsx`, `projects/[id]/wiki/page.tsx`, `projects/[id]/statuses/page.tsx`, `users/page.tsx`, `stats/page.tsx`, `requests/page.tsx`, `announcements/page.tsx`, `settings/calendar-sync/page.tsx`, `settings/integrations/page.tsx`, `components/kanban/KanbanBoard.tsx`)에서 `<Spinner />`로 일괄 교체(로딩 상태를 감싸던 기존 wrapper `div`/`className`은 그대로 유지, 내부 텍스트만 컴포넌트로 치환).
- 디버깅 체크: `npx tsc --noEmit` 신규 오류 없음. `npx next build`로 CSS/webpack 컴파일 통과 확인(이후 무관한 `sanitize-html` 미설치 오류로 중단되는 것은 이전 차수와 동일한 샌드박스 제약).

## 2026-07-01 (39차)

- **디자인 고도화 + High5 전용 DESIGN.md 작성**: 사용자가 업로드한 Hackle(핵클) DESIGN.md를 참고해 디자인 시스템을 다듬고, High5만의 디자인 문서를 신규 작성.
  - `src/app/globals.css`: 모션 토큰(`--motion-fast/standard/slow`, `--ease-enter/exit/standard`)과 라운드 사다리 토큰(`--radius-xs/sm/md/lg/full`) 추가. `prefers-reduced-motion: reduce` 지원(모든 트랜지션/애니메이션을 즉시 처리로 축소). `.btn`/`.field-input`/`.field-select` 프리미티브가 이 토큰을 사용하도록 갱신하고, 버튼에 `:active`(opacity 0.85)와 `:focus-visible`(액센트 2px 아웃라인) 상태, 인풋/셀렉트에 `:disabled`(opacity 0.5) 상태를 추가해 상태 커버리지를 정리.
  - `docs/DESIGN.md`(신규): Hackle DESIGN.md와 동일한 9섹션(Visual Theme, Color, Typography, Component Stylings, Layout, Depth & Elevation, Do's/Don'ts, Responsive, Agent Prompt Guide) 포맷을 따르되, 내용은 실제로 구현되어 있는 High5 코드(`globals.css` 토큰, `Badge`/`Spinner` 컴포넌트, `tasks.module.css`의 프로젝트별 섹션 구조 등)를 그대로 문서화 — 별도 조사 없이 코드와 항상 일치하도록 작성. Hackle 원문의 마케팅 보이스/퍼소나 섹션(10~13절)은 내부 도구 성격상 가져오지 않음.
- 디버깅 체크: `npx tsc --noEmit` 결과 `globals.css` 관련 신규 오류 없음(잔존 오류는 Prisma 클라이언트 미생성 관련 기존 베이스라인). `npx next build`로 CSS/webpack 컴파일 통과 확인(이후 무관한 `sanitize-html` 미설치 오류로 중단되는 것은 이전 차수와 동일한 샌드박스 제약). **실제 배포 환경에서 버튼 hover/active/focus, 인풋 disabled 상태가 의도대로 보이는지 브라우저로 확인 필요.**

## 2026-07-01 (40차)

- **알림 범위 확장 + 실시간 토스트 팝업 추가**: 기존에는 업무 상태가 'REVIEW'로 바뀔 때만 기획자에게 인앱 알림이 갔는데, **어떤 상태로 바뀌든** 상태를 변경한 사람 본인을 제외한 등록자(planner)·담당자(worker) 모두에게 알림이 가도록 확장. 프론트엔드에는 이 알림을 실시간으로 알려주는 UI가 전혀 없었는데, 화면 우하단 토스트 팝업을 추가함(헤더 벨 아이콘은 이번 범위에서 제외 — 추후 AI 채팅 기능을 만들 때 함께 배치 예정).
  - `src/lib/notify.ts`: 기획자 전용이던 `notifyReviewRequest`를 제거하고 범용 `notifyStatusChanged(taskId, taskTitle, workerId, plannerId, newStatusLabel, changedByUserId)`로 대체 — 변경한 사람 제외, 담당자==기획자인 업무는 중복 알림 방지.
  - `src/app/api/tasks/[id]/status/route.ts`: `status === 'REVIEW'` 조건 분기를 제거하고, 상태가 실제로 바뀐 모든 경우에 `notifyStatusChanged`를 호출하도록 변경.
  - `src/hooks/useNotifications.ts`(신규): `GET /api/notifications`를 30초마다 폴링해 `unreadCount`가 이전보다 늘면 새 알림 도착으로 판단하고 콜백 실행. `markAllRead()`도 제공(향후 벨 UI에서 재사용 가능).
  - `src/components/common/NotificationToast.tsx` + 모듈 CSS(신규): 새 알림 도착 시 화면 우하단에 5초간 떠 있다 자동 소멸하는 토스트. 클릭 시 해당 업무 상세로 이동. 기존 `WikiSearchButton` 플로팅 버튼(같은 우하단, 52px)과 겹치지 않도록 `bottom: 92px`로 배치.
  - `src/components/Providers.tsx`: 로그인 상태(`status === 'authenticated'`)에서만 `NotificationToastManager`를 전역 렌더링하도록 `NotificationToastGate` 추가.
  - `src/types/index.ts`: `UserNotification`/`UserNotificationType` 타입 신규 추가(기존에 프론트 타입이 없었음).
- 디버깅 체크: `npx tsc --noEmit` 신규 오류 없음(잔존 오류는 Prisma 클라이언트 미생성 관련 기존 베이스라인). `npx next build`로 CSS/webpack 컴파일 통과 확인(이후 무관한 `sanitize-html` 미설치 오류로 중단되는 것은 이전 차수와 동일한 샌드박스 제약). **실제 배포 환경에서 업무 상태를 바꿨을 때 변경자 본인이 아닌 등록자/담당자 화면에서 우하단 토스트가 뜨는지, 5초 후 자동으로 사라지는지, 클릭 시 해당 업무로 이동하는지 확인 필요.**

## 2026-07-01 (41차)

- **"기획자(planner)" 개념 폐기 → "등록자(registrant)"로 전면 리네이밍**: `Task.plannerId`/`planner` 관계는 이름만 "기획자"였을 뿐 실제로는 그 업무를 등록한 사람(로그인한 ADMIN/LEADER)일 뿐이었다. 역할 체계는 이미 ADMIN/LEADER/WORKER로 통일되어 있어 별도 "기획자" 역할이 존재하지 않으므로, "관리자 등급이 업무를 등록하면 그 사람이 등록자가 된다"는 실제 의미에 맞게 코드/화면 전반에서 "등록자"로 통일했다. **기능 변화는 없음** — 순수 리네이밍.
  - `prisma/schema.prisma`: `Task.plannerId`→`registrantId`, 단 실제 DB 컬럼명은 `@map("plannerId")`로 그대로 유지해 무손실 리네이밍(단순 필드명 변경만 하면 `prisma db push`가 컬럼 삭제+재생성으로 오인해 기존 데이터가 날아갈 위험이 있었음). `Task.planner`→`registrant`, `User.plannedTasks`→`registeredTasks`, relation 이름 `"planner"`→`"registrant"`.
  - 백엔드: `src/app/api/tasks/route.ts`, `[id]/route.ts`, `[id]/status/route.ts`, `calendar/route.ts`, `export/route.ts`(CSV 헤더 `기획자`→`등록자`), `projects/route.ts`, `projects/statuses/route.ts`, `users/[id]/route.ts`에서 `plannerId`→`registrantId`, `planner:` include→`registrant:` 일괄 치환. `src/lib/notify.ts`, `src/lib/webhook.ts`, `src/lib/services/webhook.service.ts`, `src/lib/services/task.service.ts`(미사용 레거시 파일이지만 함께 정리)의 파라미터명도 `registrantId`/`registrantName`으로 통일.
  - 프론트: `src/app/tasks/[id]/page.tsx`의 "보고자" 라벨 → "등록자", `task.planner`→`task.registrant`. `src/app/tasks/create/page.tsx`의 등록 요청 바디 `plannerId`→`registrantId`. `src/types/index.ts`, `src/hooks/useTask.ts`, `src/store/taskStore.ts`의 타입도 함께 갱신.
  - `Template.defaultPlannerId`(사용되지 않는 레거시 모델의 필드)는 이번 범위에서 제외 — Task와 무관한 별개 모델이라 건드리지 않음.
- 디버깅 체크: `npx tsc --noEmit` 결과 신규 오류 없음(잔존 오류는 Prisma 클라이언트 미생성 관련 기존 베이스라인, 개수 동일하게 42개 유지 확인). `grep -rn "planner\|기획자\|보고자" src prisma`로 남은 참조가 `defaultPlannerId`(Template, 의도적 제외) 외에는 없음을 확인. `npx next build`는 CSS/webpack 컴파일 통과 확인(이후 무관한 `sanitize-html` 미설치 오류로 중단되는 것은 이전 차수와 동일한 샌드박스 제약). **실제 배포 환경에서 `prisma db push` 실행 시 스키마 diff를 확인해 `plannerId` 컬럼이 삭제되지 않고 `registrantId` 필드로 매핑만 바뀌는지, 업무 등록/조회/CSV 내보내기/알림이 모두 정상 동작하는지 확인 필요.**

## 2026-07-01 (42차)

- **개인 메모 스티커 패널 추가(최대 3개, 좌/우 고정)**: 화면 세로 가장자리 중앙에 "메모" 탭을 두고, 클릭하면 좌 또는 우측에서 슬라이드 인되는 패널이 열려 개인 메모 스티커를 관리할 수 있다.
  - `prisma/schema.prisma`: `StickyNote` 모델 신규(`userId`, `content`, `color?`, `order`).
  - `src/app/api/sticky-notes/route.ts`(GET 목록/POST 생성 — 개인당 최대 3개, PUT 순서 일괄 저장), `src/app/api/sticky-notes/[id]/route.ts`(PATCH 내용 수정/DELETE, 본인 소유만).
  - `src/hooks/useStickyNotes.ts`(신규), `src/components/StickyNotesPanel.tsx` + 모듈 CSS(신규): 각 스티커는 textarea(blur 시 자동 저장), 삭제 버튼, 드래그 핸들(HTML5 drag&drop으로 `/tasks` 커스텀 필드 컬럼 재정렬과 동일한 패턴 재사용)로 순서 변경. 패널의 열림 상태와 좌/우 배치는 `localStorage`에 저장(`AnnouncementBanner`의 dismiss 기록 패턴 재사용) — 서버 왕복 불필요.
  - `src/components/Providers.tsx`에 `StickyNotesGate`(로그인 상태에서만 렌더링) 추가.
- **개인 자료 보관 페이지 추가(`/my-notes`, 최대 3개, 위키 방식)**: 개인이 제목+본문 문서를 여러 개(최대 3개) 만들고 아코디언 목록에서 열람/수정/삭제할 수 있다.
  - `prisma/schema.prisma`: `UserPage` 모델 신규(`userId`, `title`, `content`).
  - `src/app/api/my-pages/route.ts`(GET/POST — 개인당 최대 3개), `src/app/api/my-pages/[id]/route.ts`(PATCH/DELETE, 본인 소유만 — `WikiPage`의 `ProjectMember` 소속 체크와 달리 `userId` 일치만 확인하면 되므로 더 단순).
  - `src/app/my-notes/page.tsx` + 모듈 CSS(신규): `projects/[id]/wiki/page.tsx`와 동일한 아코디언 목록 + 작성/수정 폼 레이아웃을 재사용, 문서 3개 도달 시 "+ 새 문서" 버튼 비활성화 + 안내 문구.
  - `src/components/AppHeader.tsx` 계정 드롭다운에 "내 자료" 링크 추가, `src/middleware.ts`의 `protectedRoutes`에 `/my-notes` 추가.
- **공용 리팩터: SimpleEditor 컴포넌트 추출**: `wiki/page.tsx`, `projects/[id]/wiki/page.tsx`, `info/page.tsx`에 각각 인라인으로 중복 정의되어 있던 경량 마크다운 에디터를 `src/components/common/SimpleEditor.tsx` + 모듈 CSS로 추출하고, `/my-notes`를 포함한 4곳 모두 이 공용 컴포넌트를 사용하도록 교체(동작 동일). 기존 3개 페이지의 CSS 모듈에서 중복 정의되어 있던 `.editorWrapper` 등 관련 스타일도 정리.
  - `src/types/index.ts`: `StickyNote`, `UserPage` 타입 추가.
- 디버깅 체크: `npx tsc --noEmit` 결과 신규 오류 없음(잔존 42개는 Prisma 클라이언트 미생성 관련 기존 베이스라인, 이전 차수와 동일). `npx next build`는 CSS/webpack 컴파일 통과 확인(이후 무관한 `sanitize-html` 미설치 오류로 중단되는 것은 이전 차수와 동일한 샌드박스 제약). **실제 배포 환경에서 메모 스티커 추가/수정/삭제/드래그 재정렬 및 좌우 배치 전환이 새로고침 후에도 유지되는지, `/my-notes`에서 문서 3개 제한이 정상 동작하고 다른 계정으로 로그인 시 본인 문서만 보이는지 브라우저로 확인 필요.**

## 2026-07-01 (43차)

- **모바일 최적화 1차 적용**: 전체 CSS 검토 결과 반응형 처리가 있는 파일이 10개뿐이고 breakpoint도 파일마다 제각각(480/640/768/900px)이었으며, 가장 자주 쓰는 화면들(`/tasks`, `/tasks/[id]`, `/calendar`, `/projects`)에는 모바일 대응이 전혀 없던 것을 확인하고 개선.
  - **신규 반응형 스타일은 640px로 통일**(기존 파일들의 480/768/900px는 그대로 둠 — `docs/DESIGN.md` §8에 기준 명시).
  - **전역 페이지 여백 축소**: `padding: 32~40px` 고정 여백을 쓰던 11개 파일(`dashboard`, `wiki`, `info`, `announcements`, `my-notes`, `projects/[id]/wiki`, `settings/integrations`, `settings/calendar-sync`, `calendar`, `tasks/[id]/detail`, `tasks`, `projects`)에 640px 이하 `padding: 20px 14px` 미디어쿼리 추가.
  - **`/tasks` 목록 테이블 → 카드형 전환**(가장 크고 가치 높은 항목): 640px 이하에서 `<table>`을 순수 CSS로 카드처럼 보이도록 전환(`display: block` + 헤더 숨김 + `data-label` 속성을 `::before`로 라벨 표시). 별도 카드 컴포넌트를 새로 만들지 않고 기존 테이블 마크업의 각 `<td>`에 `data-label`(ID/제목/담당자/등록일자/목표일/비고/작업시간/상태/커스텀 필드명)만 추가해 재사용(`src/app/tasks/page.tsx`, `tasks.module.css`).
  - **`/tasks/[id]` 상세**: 기본정보/속성 카드의 2열 그리드가 640px 이하에서 1열로 전환.
  - **`/calendar`**: 7일 그리드 구조는 유지하되 640px 이하에서 셀 패딩/최소높이/폰트를 축소(`.day`, `.dayLabel`, `.dayNumber`, `.taskItem`)해 좁은 화면에서도 한 줄에 들어가도록 함.
  - **`/projects`**: `.layoutWithPanel`(목록+멤버패널 2열)이 640px 이하에서 1열로 전환, `sticky` 멤버패널도 `static`으로.
- 디버깅 체크: `npx tsc --noEmit` 신규 오류 없음(잔존 42개는 Prisma 클라이언트 미생성 관련 기존 베이스라인, 이전 차수와 동일). `npx next build`는 CSS/webpack 컴파일 통과 확인(이후 무관한 `sanitize-html` 미설치 오류로 중단되는 것은 이전 차수와 동일한 샌드박스 제약). **실제 배포 환경에서 개발자도구 375px/390px/768px 폭으로 `/tasks`, `/tasks/[id]`, `/calendar`, `/projects`, `/dashboard`를 확인해 가로 스크롤 없이 핵심 정보가 잘리지 않는지, 카드형 업무 목록에서 담당자/상태 셀렉트와 버튼들이 정상 동작하는지 브라우저로 확인 필요.**

## 2026-07-07 (44차)

- **`/tasks` 목록 프로젝트 필터 복원 + 업무 등록 접근성 개선**: 이전 프로젝트별 섹션 리팩터링에서 상단 프로젝트 필터 드랍다운이 완전히 제거되어 특정 프로젝트만 보기 어려웠고, 새 업무 등록도 `/tasks/create`로 이동해야만 가능해 접근성이 낮았던 문제를 개선.
  - `src/app/tasks/page.tsx`: 필터 바에 "프로젝트" `<select>` 추가(`selectedProject` state, `useSearchParams()`로 `?projectId=` 쿼리와 동기화 — 기존에 `/tasks/create` 생성 완료 후 `router.push(`/tasks?projectId=...`)`가 사용하던 죽은 쿼리 파라미터를 실제로 활용). 프로젝트 선택 시 해당 프로젝트 섹션만 노출하고 "미지정 업무" 섹션은 숨김, "전체 프로젝트" 선택 시 원복.
  - 각 프로젝트 섹션 헤더에 아이콘 전용 `+` 버튼(`.addTaskBtn`, 기존 "+ 속성 추가" 버튼과 동일한 아이콘 버튼 컨벤션 재사용) 추가 — 클릭 시 `/tasks/create?projectId={project.id}`로 이동해 프로젝트가 미리 선택된 채 등록 폼이 열림. 프로젝트 미지정 섹션에는 노출하지 않음.
  - `src/app/tasks/create/page.tsx`: `searchParams.get('projectId')`를 읽어 `projectId` state 초기값으로 prefill(기존 `parentTaskIdParam` 패턴과 동일).
  - `src/app/tasks/tasks.module.css`: `.projectFilterSelect`(기존 `.statusFilterSelect`와 동일한 스타일), `.addTaskBtn`(`.addFieldBtn`과 동일한 아이콘 버튼 스타일) 추가.
- 디버깅 체크: `npx tsc --noEmit` 신규 오류 없음(잔존 42개는 Prisma 클라이언트 미생성 관련 기존 베이스라인, 이전 차수와 동일). **실제 배포 환경에서 프로젝트 필터 선택/해제, 섹션별 "+" 버튼 클릭 후 프로젝트 prefill, 생성 후 `/tasks?projectId=X`로 복귀 시 필터가 자동 적용되는지 브라우저로 확인 필요.**

## 2026-07-07 (45차)

- **`/tasks` 업무 등록을 노션 스타일 인라인 추가로 전환**: 44차에서 추가한 섹션 헤더의 "+" 버튼(페이지 이동 방식)이 사용자가 원했던 "빈 칸을 클릭해 바로 입력"하는 노션식 UX와 달라 방식을 교체.
  - `src/app/tasks/page.tsx`: `ProjectTaskSection` 테이블 맨 아래에 `+ 새 업무` 행을 추가. 클릭하면 인라인 `<input>`으로 전환되어 제목만 입력하고 Enter(또는 blur)하면 즉시 생성, Escape로 취소. 페이지 이동 없이 `useTasks` 훅의 `createTask`(응답을 로컬 `tasks` 상태 맨 앞에 추가)를 그대로 재사용해 목록에 바로 반영.
  - `POST /api/tasks`가 `workerId`/`registrantId`를 필수로 요구하므로(`src/app/api/tasks/route.ts`) 생성 시 둘 다 현재 로그인 사용자로 채우고, 담당자는 각 행에 이미 있는 인라인 담당자 셀렉트로 바로 재배정하도록 함. 프로젝트가 없는 "미지정 업무" 섹션에는 노출하지 않음.
  - 섹션 헤더의 "+" 버튼(`.addTaskBtn`, `/tasks/create?projectId=...`로 이동하던 방식)은 제거. `.projectSectionHeader`는 기존 그대로(`display: flex; align-items: center; gap: 8px`)라 별도 CSS 수정 없이 제목/건수만 남음.
  - `src/app/tasks/tasks.module.css`: `.addTaskBtn` 제거, `.addTaskCell`/`.addTaskRow`/`.addTaskInput` 추가.
- 디버깅 체크: `npx tsc --noEmit` 신규 오류 없음(잔존 42개는 기존 베이스라인과 동일). **실제 배포 환경에서 "+ 새 업무" 클릭 → 제목 입력 → Enter로 생성되는지, 생성된 업무의 담당자가 본인으로 설정되고 인라인 셀렉트로 재배정이 되는지, 빈 제목/Escape 취소가 정상 동작하는지 브라우저로 확인 필요.**

## 2026-07-07 (46차)

- **`/tasks` 인라인 업무 등록에 담당자/목표일 선택 추가**: 45차에서 만든 "+ 새 업무" 인라인 행이 제목만 입력하면 담당자/등록자가 항상 본인으로 고정 생성되던 것을, 생성 시점에 담당자와 목표일도 바로 고를 수 있도록 확장(링크는 기존처럼 등록 후 `/tasks/[id]` 상세에서 연결).
  - `src/app/tasks/page.tsx`: 인라인 추가 행을 제목 `<input>` 하나에서 제목 + 담당자 `<select>`(`assignableWorkers` 기준, 본인이 목록에 없으면 "나(본인)"으로 맨 앞에 추가 — 기존 행별 담당자 셀렉트의 폴백 패턴과 동일) + 목표일 `<input type="date">` + 추가/취소 버튼으로 구성된 한 줄짜리 `<form>`으로 확장.
  - 기존 `onBlur` 자동 제출/취소 로직은 제거 — 담당자 select를 조작하면 제목 input이 blur되어 조기 제출되는 문제가 있었기 때문에, 이제는 `Enter`(폼 submit)/취소 버튼/`Escape`로만 명시적으로 확정·취소한다.
  - `src/app/tasks/tasks.module.css`: `.addTaskForm`, `.addTaskWorkerSelect`, `.addTaskDateInput`, `.addTaskSubmitBtn`, `.addTaskCancelBtn` 추가, `.addTaskInput`은 `flex: 1`로 변경.
- 디버깅 체크: `npx tsc --noEmit` 신규 오류 없음(잔존 42개는 기존 베이스라인과 동일). **실제 배포 환경에서 담당자 select 변경 중 폼이 의도치 않게 닫히지 않는지, 목표일 지정 후 Enter로 생성 시 값이 반영되는지, ✕ 버튼/Escape 취소가 정상 동작하는지 브라우저로 확인 필요.**

## 2026-07-07 (47차)

- **프로젝트 커스텀 필드(속성)에 "링크" 타입 추가**: 노션식 자유 속성(`ProjectField`)의 타입 목록(TEXT/NUMBER/DATE/SELECT/CHECKBOX)에 `LINK`를 추가. "+ 속성 추가" 팝오버에서 "링크"를 선택할 수 있고, 값 입력은 `type="url"` input으로 받으며, 조회 시(수정 권한 없는 사용자 또는 값 표시)에는 `<a target="_blank">`로 클릭 가능한 링크로 렌더링된다.
  - `src/types/index.ts`: `FieldType`에 `'LINK'` 추가.
  - `src/app/api/projects/[id]/fields/route.ts`: `VALID_TYPES`에 `'LINK'` 추가(서버 검증 통과하도록).
  - `src/app/tasks/page.tsx`, `src/app/tasks/[id]/page.tsx`: 필드 렌더링 함수(`renderFieldCell`/`renderFieldValue`)에 `LINK` 분기 추가(뷰 전용은 앵커 태그, 편집 가능은 `url` input).
  - `src/app/tasks/tasks.module.css`: `.fieldLink`(파란색, 말줄임) 추가.
- **업무 목록에서 완료(DONE) 상태 행 스타일 강화**: 기존에는 완료 행 배경색이 `#F9FAFB`로 거의 티가 안 났음. `.rowDone` 클래스로 교체해 배경을 `var(--color-gray-300)`(`#E4E4E7`)로 더 진하게 하고, `.rowDone td { opacity: 0.6 }`로 텍스트/버튼 전체를 옅게 처리해 완료된 업무가 시각적으로 뚜렷이 구분되도록 함(`src/app/tasks/page.tsx`의 인라인 `style` 대신 `className` 사용으로 변경).
- 디버깅 체크: `npx tsc --noEmit` 신규 오류 없음(잔존 42개는 기존 베이스라인과 동일). **실제 배포 환경에서 "링크" 속성 추가 후 값 입력/저장, 새 탭에서 열림, 완료 상태 업무 행의 배경/opacity가 의도대로 보이는지 브라우저로 확인 필요.**

## 2026-07-07 (48차)

- **"+ 하위 업무" 등록 흐름 개선**: `/tasks` 목록에서 최상위 업무의 "+ 하위 업무" 버튼을 눌러 `/tasks/create?parentTaskId=...`로 넘어갈 때 발생하던 3가지 문제를 수정.
  - `src/app/tasks/create/page.tsx`: `fetchParentTask`가 부모 업무의 `projectId`도 함께 읽어와 프로젝트 select를 자동으로 부모와 동일하게 선택하도록 함(기존엔 제목만 읽어와 "상위 그룹: 📁 {제목}" 표시에만 쓰고 프로젝트는 비어 있거나 LEADER의 경우 본인 소속 첫 프로젝트로 잘못 채워졌음). LEADER 자동 프로젝트 선택 로직은 `parentTaskIdParam`이 있을 때는 건너뛰도록 조건 추가해 경합 방지. 하위 업무 등록 모드에서는 프로젝트 select를 `disabled` 처리(부모와 다른 프로젝트로 변경 자체를 막음).
  - `src/app/tasks/page.tsx`: "+ 하위 업무" 버튼을 `<Link>`에서 `<button>`(클릭 시 `router.push`)으로 교체. 클릭 시 먼저 `confirm('하위 업무를 등록하면 이 업무는 그룹 업무로 전환됩니다. 계속하시겠습니까?')`로 확인받고 취소 시 이동하지 않음. 이미 비고(`hasNotes`)가 있는 업무는 버튼을 `disabled` 처리하고 툴팁으로 이유를 안내(전역 `.btn:disabled` 스타일 재사용, 별도 CSS 추가 없음).
- 디버깅 체크: `npx tsc --noEmit` 신규 오류 없음(잔존 42개는 기존 베이스라인과 동일). **실제 배포 환경에서 특정 프로젝트 업무의 "+ 하위 업무" 클릭 시 확인 다이얼로그가 뜨고, 확인 후 이동한 등록 화면에서 프로젝트가 자동 선택+비활성화되어 있는지, 비고가 있는 업무는 버튼이 비활성화되는지 브라우저로 확인 필요.**

## 2026-07-07 (49차)

- **네이티브 alert/confirm을 전부 모달로 교체**: 브라우저 기본 `alert()`/`confirm()`은 앱의 Notion/Jira풍 디자인 시스템과 스타일이 완전히 달라 이질감이 컸음. 이미 있던 범용 `Modal` 컴포넌트(`src/components/common/Modal.tsx`)를 재사용해 Promise 기반 다이얼로그 시스템으로 교체.
  - `src/components/common/DialogProvider.tsx`(신규), `DialogProvider.module.css`(신규): `useDialog()` 훅이 `confirm(message, options?): Promise<boolean>`과 `alertDialog(message): Promise<void>`를 제공. 대기 중인 다이얼로그 하나만 상태로 유지하고 `Modal`로 렌더링(취소/확인 버튼은 전역 `.btn btn-secondary`/`.btn btn-primary` 재사용, Escape/오버레이 클릭은 취소로 처리).
  - `src/components/Providers.tsx`: `SessionProvider` 안쪽을 `DialogProvider`로 감싸 전체 앱에서 `useDialog()`를 쓸 수 있게 함. 세션 만료 안내 `alert(...)`를 `alertDialog(...).then(() => signOut(...).finally(...))` 체이닝으로 교체해 "안내 확인 → 로그아웃 → /login 이동" 순서를 그대로 유지.
  - 나머지 `confirm(...)` 호출 11곳(`src/app/projects/[id]/wiki/page.tsx`, `src/app/projects/page.tsx`, `src/app/users/page.tsx`(2곳), `src/app/tasks/[id]/page.tsx`, `src/app/tasks/page.tsx`(3곳: 속성 삭제/업무 삭제/하위업무 그룹전환), `src/app/my-notes/page.tsx`, `src/app/announcements/page.tsx`, `src/app/info/page.tsx`)를 각 컴포넌트에서 `useDialog()`로 받은 `confirm`으로 교체(`if (!confirm(...))` → `if (!(await confirm(...)))`). `tasks/page.tsx`의 "+ 하위 업무" onClick만 동기 화살표 함수였어서 `async`로 변경.
- 디버깅 체크: `npx tsc --noEmit` 신규 오류 없음(잔존 42개는 기존 베이스라인과 동일). **실제 배포 환경에서 업무/속성/위키/내 자료/공지/정보 삭제, 프로젝트 종료, 팀원 비활성화/삭제, 하위 업무 그룹전환 confirm이 전부 모달로 뜨는지, 취소/확인이 정상 동작하는지, 세션 만료 알림도 모달로 뜨고 확인 후 로그아웃되는지 브라우저로 확인 필요.**

## 2026-07-07 (50차)

- **대시보드에 "오늘의 일정" 섹션 추가**: 구글 캘린더 연동이 안 된다는 문의로 코드를 확인한 결과, 이 앱에는 애초에 OAuth 기반 양방향 구글 캘린더 연동이 구현돼 있지 않다는 것을 확인함(`src/lib/auth.ts`는 Credentials 프로바이더만 있고 `GOOGLE_CLIENT_ID`/`SECRET`, 토큰 저장 모델 모두 없음). 실제로 존재하는 건 `/settings/calendar-sync`가 발급하는 읽기 전용 iCal 구독 URL(`GET /api/calendar/ical`)뿐이며 "일정 등록/가져오기"는 원래 지원 범위가 아니었음 — 이 부분은 별도 작업으로 분리하고, 이번 차수에서는 사용자가 1순위로 요청한 "대시보드에 오늘 일정 노출"만 구현.
  - `src/app/dashboard/page.tsx`: 기존 `/tasks?limit=300` 조회에 더해 캘린더 페이지가 쓰는 `GET /api/tasks/calendar?year=&month=`(`src/app/api/tasks/calendar/route.ts`, 이미 날짜별 `tasksByDate`/`leavesByDate`를 반환)를 현재 연/월로 한 번 더 호출해 오늘 날짜 키(`todayKey`)로 내가 담당자인 업무만 추려 "오늘의 일정" 섹션으로 표시(새 API 없이 기존 엔드포인트 재사용). 오늘 승인된 휴가가 있으면 제목 옆에 "오늘 휴가" 뱃지 표시. 헤더 바로 아래, "나의 업무" 섹션보다 먼저 배치.
  - `src/app/dashboard/dashboard.module.css`: `.leaveBadge`(초록 pill) 추가, `.sectionTitle`에 `display: flex` 추가해 뱃지와 나란히 배치.
- 디버깅 체크: `npx tsc --noEmit` 신규 오류 없음(잔존 42개는 기존 베이스라인과 동일). **실제 배포 환경에서 오늘 목표일인 업무가 "오늘의 일정"에 노출되는지, 없을 때 빈 상태 문구가 보이는지, 오늘 승인된 휴가가 있을 때 뱃지가 보이는지 브라우저로 확인 필요.**
- **버그 수정: 로그아웃 클릭 시에도 "세션 만료" 안내가 잘못 뜨던 문제**: `AppHeader`의 로그아웃 버튼이 `signOut()`을 호출하면 세션 상태가 `unauthenticated`로 바뀌는데, `Providers.tsx`의 `AuthSync`가 이를 30분 미활동 세션 만료와 구분하지 못해 매번 "보안을 위해..." 모달이 잘못 떴음.
  - `src/lib/logout-flag.ts`(신규): `markManualLogout()`/`consumeManualLogout()`로 "방금 사용자가 직접 로그아웃했다"를 표시하는 모듈 스코프 플래그.
  - `src/components/AppHeader.tsx`의 `handleLogout`에서 `signOut()` 호출 직전에 `markManualLogout()` 호출.
  - `src/components/Providers.tsx`의 `AuthSync`: 세션 만료 감지 분기에서 `consumeManualLogout()`이 `true`면 안내 없이 조용히 종료(자동 만료일 때만 안내 모달 표시).
- 디버깅 체크: `npx tsc --noEmit` 신규 오류 없음(잔존 42개는 기존 베이스라인과 동일). **실제 배포 환경에서 헤더 로그아웃 클릭 시 안내 모달 없이 바로 `/login`으로 이동하는지, 반대로 30분 미활동 후 자동 로그아웃 시에는 여전히 안내 모달이 뜨는지 브라우저로 확인 필요.**

## 2026-07-07 (51차)

- **문서: AI/자동화 로드맵 현황 분석 작성**: 사용자가 제시한 4가지 향후 방향(주간보고 AI 자동생성 / 작업자별 분석 후 AI 자동배정 / 외부연동·자동화 확장 / 구글시트 연동)에 대해, 코드 구현 없이 현재 코드베이스에서 재사용 가능한 부분과 없는 인프라를 조사해 `docs/ROADMAP_AI_AUTOMATION.md`(신규)로 정리. 즉시 착수 대상이 아니라 향후 참고용 계획 문서임을 명시.
  - 핵심 진단: LLM API 연동, cron/스케줄러, Google OAuth 인프라가 모두 전무 — 이 3가지가 여러 항목이 공유하는 공통 갭. 기존 재사용 가능 자산도 함께 정리(주간보고는 `stats.service.ts`의 월별 집계, 자동배정은 `GET /api/stats/workload`, 외부연동은 `src/lib/integrations.ts`의 `dispatch()`, 구글시트는 `tasks/export`의 xlsx 생성 로직).
  - 권장 착수 순서(난이도/의존관계 기준): 외부연동 확장 → 주간보고(LLM 최초 도입) → 자동배정(LLM+워크로드 결합) → 구글시트(독립 트랙, 병렬 가능).
  - `docs/PROJECT_STRUCTURE.md` 상단 안내 문구에 이 문서 참조 추가.
- 코드 변경 없음(문서만 추가) — `tsc`/빌드 검증 해당 없음.

## 2026-07-09 (52차)

- **문서: 외부 연동/자동화 상세 설계 작성**: `docs/ROADMAP_AI_AUTOMATION.md` 3번 항목("외부 연동 및 자동화")에 대한 구체적 개발 설계를 `docs/AUTOMATION_DESIGN.md`(신규)로 분리 정리. 코드 구현 없음, 실제 착수 시 참고할 설계 문서.
  - **Phase 1(하드코딩 트리거 확장, 낮은 리스크)**: 라벨 부착 트리거(URGENT 라벨이 새로 붙을 때, `POST /api/tasks`/`PATCH /api/tasks/[id]`에서 감지) + 목표일 임박/경과 트리거(`Task.lastDueReminderAt` 신규 컬럼으로 중복 발송 방지, `POST /api/automation/due-date-check` 배치 엔드포인트를 외부 크론이 호출하는 구조 — 이 앱엔 스케줄러 인프라가 없어 Railway Cron Schedule 또는 GitHub Actions 등 배포 설정으로 트리거해야 함을 명시). 기존 `notifyStatusChange()` 패턴을 그대로 복제해 `src/lib/webhook.ts`에 `notifyLabelAttached()`/`notifyDueDate()` 추가하는 안.
  - **Phase 2(일반화된 규칙 엔진, 선택적 후속)**: `AutomationRule` Prisma 모델(트리거 타입/조건 JSON 문자열/채널/메시지 템플릿), `src/lib/automation-engine.ts`의 `evaluateRules()`, `/api/automation-rules` CRUD, `/settings/automation` 설정 UI까지 스키마·API·파일 단위로 설계.
  - 조사 중 `src/lib/services/webhook.service.ts` + `src/app/api/webhooks/slack/route.ts`가 실제 상태변경 흐름에서 호출되지 않는 레거시 중복 코드로 보인다는 점을 발견해 "정리 대상"으로 문서에 기록(이번엔 삭제하지 않음, 재확인 필요 항목으로만 남김).
  - 인바운드 웹훅은 구체 요구사항이 없어 스코프 밖으로 명시.
  - `docs/ROADMAP_AI_AUTOMATION.md`·`docs/PROJECT_STRUCTURE.md`에 상호 참조 링크 추가.
- 코드 변경 없음(문서만 추가) — `tsc`/빌드 검증 해당 없음.

## 2026-07-09 (53차)

- **업무 댓글/스레드 기능 추가**: 담당자-등록자 간 협업을 위한 스레드형 댓글 기능 구현.
  - `prisma/schema.prisma`에 `TaskComment` 모델 추가(`task_comments` 테이블, `taskId`/`authorId`/`content`/타임스탬프, Cascade 삭제). `Task`·`User` 모델에 역참조 필드 추가.
  - `GET /api/tasks/[id]/comments` — 댓글 목록(createdAt 오름차순, author 포함). `POST /api/tasks/[id]/comments` — 로그인 사용자 누구나 작성 가능. `DELETE /api/tasks/[id]/comments/[commentId]` — 본인 또는 ADMIN/LEADER만 삭제 가능.
  - 업무 상세 페이지(`/tasks/[id]`)에 "댓글" 섹션 추가: 이니셜 아바타·이름·날짜 표시, 본인 댓글에 삭제 버튼, `textarea`에서 Enter로 등록(Shift+Enter 줄바꿈), 빈 값 방지.
  - `detail.module.css`에 댓글 UI 스타일 추가.

- **전역 검색 기능 추가**: 업무 제목·메모·커스텀필드값 + 위키 페이지 통합 검색.
  - `GET /api/search?q=` — 업무(`title`/`notes` ILIKE + `TaskFieldValue.value` 매치 통합), 위키(`title`/`content` ILIKE) 검색. 각 20건 제한, 중복 제거, 스니펫 생성.
  - `GlobalSearchModal.tsx`/`GlobalSearchModal.module.css` 신규 — 오버레이 모달, 300ms 디바운스, 업무/위키 섹션 구분 표시, 클릭 시 해당 상세 페이지로 이동.
  - `AppHeader.tsx`에 🔍 버튼 추가(계정 메뉴 앞). `Ctrl+K`/`Cmd+K` 단축키로 언제든 모달 열기.
- 디버깅 체크: `npx tsc --noEmit` 결과 변경 전후 비교 — 신규 타입 오류 없음. DB 미연결로 `prisma db push`는 Railway 빌드 파이프라인에서 자동 반영됨.

## 2026-07-09 (54차)

- **댓글 @멘션 + 인앱 알림 기능 추가**:
  - 댓글 내용에서 `@[이름](userId)` 형태 멘션 파싱 — `POST /api/tasks/[id]/comments`에 `parseMentionIds()` 헬퍼 추가. 멘션된 사용자에게 `createUserNotification(uid, 'COMMENT_MENTION', ...)` 비동기 발송(실패해도 댓글 등록은 완료).
  - 댓글 입력 textarea에서 `@` 입력 감지 → 팀원 자동완성 드롭다운(최대 6명). 클릭 또는 Enter/Tab으로 `@[이름](id) ` 삽입. Escape로 닫힘.
  - 댓글 렌더링 시 멘션 강조: `@[이름](id)` → `<span class="mention">@이름</span>`, 자기 자신 멘션은 `.mentionSelf`(노란 배경)로 구분.
  - 팀원 목록은 컴포넌트 마운트 시 1회 prefetch(`GET /api/users?role=WORKER`).
- 디버깅 체크: `npx tsc --noEmit` 결과 오류 0개(Prisma client 생성 완료 상태).

## 2026-07-09 (56차)

- **Phase 2: SUPERADMIN 역할 + 조직 공개 가입**
  - `UserRole`에 `SUPERADMIN` 추가 (`src/types/index.ts`, `src/store/authStore.ts`)
  - `prisma/init.ts`: `admin@admin.co.kr`을 `SUPERADMIN`으로 upsert (update에도 role 적용)
  - `src/lib/utils.ts`: `requireSuperAdmin()` 헬퍼 추가 — 조직 격리 없이 전체 접근, SUPERADMIN 아니면 403
  - `src/middleware.ts`: `/register` 공개 경로 추가, `/superadmin` 보호 경로 추가, SUPERADMIN 토큰 보유 시 모든 보호 라우트 통과
  - `src/hooks/useAuth.ts`: `isSuperAdmin` 플래그 추가
  - `src/components/AppHeader.tsx`: SUPERADMIN에게만 "슈퍼관리자" 링크 표시
  - `POST /api/organizations` (공개, 인증 불필요): 조직명/slug/adminEmail/adminName/password → Organization + ADMIN 계정 동시 생성, slug·이메일 중복 검증
  - `GET /api/superadmin/organizations`: 전체 조직 목록 + `_count.users`
  - `PATCH /api/superadmin/organizations/[id]`: plan/isActive 수정
  - `GET /api/superadmin/organizations/[id]/users`: 특정 조직 사용자 전체
  - `/register` 페이지: 회사명/slug/관리자 이름·이메일·비밀번호 폼, 성공 시 `/login?registered=1` 리다이렉트
  - `/login` 페이지: `?registered=1` 쿼리 시 "가입 완료" 안내 문구 표시, "새 조직 등록" 링크 추가
  - `/superadmin` 페이지: 전체 조직 목록 테이블 (ID/조직명/slug/플랜/사용자수/상태/가입일)
  - `/superadmin/[id]` 페이지: 조직 사용자 목록 + plan 변경 + 비활성화/활성화 버튼
  - 디버깅 체크: `npx tsc --noEmit` 오류 0개. DB 미연결로 `npm run build` 의 `prisma db push` 단계는 Railway 파이프라인에서 자동 반영됨.

## 2026-07-09 (55차)

- **대댓글(답글) 기능 추가**:
  - `prisma/schema.prisma`의 `TaskComment` 모델에 `parentId Int?` 추가 — 자기참조 `"replies"` 관계, `onDelete: Cascade`.
  - `GET /api/tasks/[id]/comments` — 최상위 댓글만 조회 + `replies` 중첩 포함으로 변경.
  - `POST /api/tasks/[id]/comments` — `parentId` 옵션 지원, 부모 댓글 존재/taskId 일치 검증 추가.
  - 업무 상세 페이지 댓글 UI: 각 댓글에 "답글" 버튼 추가, 클릭 시 해당 댓글 아래 인라인 답글 입력창 표시. 대댓글은 들여쓰기 + 좌측 보더선으로 구분. 삭제 시 부모/대댓글 구분해서 state 업데이트.

- **@ 멘션 수정**:
  - `allUsers` 조회 시 `role=WORKER` 필터 제거 → ADMIN/LEADER 포함 전체 사용자 대상으로 변경.
  - `mentionAnchor`를 `useState` 대신 `useRef`로 관리해 stale closure 문제 해소.
  - `detectMention()` 헬퍼 분리, 댓글·답글 textarea 공용 사용.
  - 멘션 드롭다운이 댓글 입력 중일 때와 답글 입력 중일 때 각각 올바른 textarea에 삽입되도록 수정.

- **헤더 검색 버튼**: 🔍 아이콘 → "검색" 텍스트로 변경(디자인 밸런스 개선).
- 디버깅 체크: `npx tsc --noEmit` 오류 0개.

## 2026-07-10 (56차)

- **D-day 표시 + 마감 강조**:
  - `src/app/tasks/page.tsx`: `getDday()` 헬퍼 추가 — 완료된 업무는 null, 마감 당일 D-Day(주황), 1~3일 이내 D-N(주황), 4일+ D-N(파랑), 초과 D+N(빨강).
  - 마감 초과 행에 `rowOverdue` 클래스(배경 #FFF5F5) 적용.
  - 날짜 셀에 날짜 + 뱃지 함께 표시.

- **업무 일괄처리**:
  - 업무 목록에 체크박스 열 추가(개별/전체 선택).
  - 선택 시 bulkBar 표시 — 상태/담당자 일괄변경 후 적용 버튼.
  - `selectedIds`, `bulkStatus`, `bulkWorker`, `applyBulk()` state/함수 추가.

- **알림 유형 확대**:
  - `src/app/api/requests/[id]/decision/route.ts`: 결재 승인/반려 시 신청자에게 `REQUEST_APPROVED` / `REQUEST_REJECTED` 알림 발송.
  - `src/app/api/announcements/route.ts`: 조직 공지 등록 시 전체 멤버(작성자 제외)에게 `ANNOUNCEMENT` 알림 발송.

- **통계 기간 필터 + 엑셀 내보내기**:
  - `src/app/stats/page.tsx`: `selectedMonth` state에 setter 추가, 이전/다음 월 네비게이션 UI.
  - CSV → xlsx 내보내기로 교체 (`xlsx` 패키지 사용), 월간요약·작업자별 시트 2개 출력.

- **헤더 메뉴 순서 변경**:
  - `src/components/AppHeader.tsx`: 검색 → 업무 → 신청 → 정보 → 위키 → 설정 → 마이페이지 순으로 재정렬.
  - 계정 드롭다운 버튼 레이블 사용자명 → "마이페이지"로 변경.

- **모바일 반응형 보완**:
  - `src/app/stats/stats.module.css`: @media 640px — 헤더 세로 정렬, summaryGrid/statusGrid 2열.
  - `src/app/settings/audit/audit.module.css`: @media 640px — 페이지 패딩, 헤더/필터 세로 정렬.

- 디버깅 체크: `npx tsc --noEmit` 오류 0개.

## 2026-07-11 (57차)

- **조직 설정 페이지 신규 (`/settings/organization`)**:
  - `prisma/schema.prisma`: Organization에 `logoUrl String?`, `displayName String?`, `address String?`, `deadlineAlertDays Int @default(3)` 필드 추가.
  - `src/lib/auth.ts`: `authorize()` include에 `displayName`, `logoUrl` 추가. JWT 콜백에 `organizationName`, `organizationLogo` 저장. 세션 콜백에 동일 필드 노출.
  - `GET /api/settings/organization` (ADMIN/LEADER): 조직 설정 전체 조회.
  - `PATCH /api/settings/organization` (ADMIN 전용): displayName, bizNo, phone, ceoName, address, deadlineAlertDays 수정.
  - `POST /api/settings/organization/logo` (ADMIN): base64 로고 업로드 (200KB 제한, PNG/JPG/SVG/WebP/GIF).
  - `DELETE /api/settings/organization/logo` (ADMIN): 로고 삭제.
  - `src/app/settings/organization/page.tsx`: 로고 업로드/삭제 미리보기, 기본 정보(헤더표시명/사업자번호/대표자명/대표번호/주소), 마감 알림 기준일 설정.
  - `src/components/AppHeader.tsx`: 로고 있으면 `<img>` 표시, 없으면 `organizationName`(displayName 우선) 텍스트 표시. 설정 드롭다운에 ADMIN에게 "조직 설정" 링크 추가.
  - 디버깅 체크: `npx tsc --noEmit` 오류 0개, `npm run build` 성공.

## 2026-07-13 (58차)

- **로그아웃 시 조직별 로그인 페이지로 이동**:
  - `AppHeader.tsx`, `Providers.tsx`(세션만료), `useAuth.ts` 모두 `organizationSlug` 기준으로 `/{slug}/login`으로 리다이렉트(SUPERADMIN은 `/login` 유지).
  - `authStore`에 `organizationSlug` 저장 — 세션 만료로 정보가 사라진 시점에도 마지막 조직 slug를 참조 가능.

- **로그인 이후 페이지에도 조직 slug URL 프리픽스 적용**:
  - `src/middleware.ts`: `dashboard/tasks/calendar/stats/users/announcements/requests/my-notes/info/wiki/projects/profile/settings`를 슬러그 유무에 따라 redirect(없음→있음)/rewrite(있음→내부적으로 슬러그 제거)로 연결. 실제 페이지 디렉터리는 변경 없이 기존 bare 경로(`app/dashboard` 등) 그대로 사용, URL만 `/exwave/dashboard`처럼 표시됨.
  - 다른 조직 slug로 접근 시 토큰의 `organizationSlug`로 자동 교정.
  - SUPERADMIN은 기존과 동일하게 `/superadmin` 등 슬러그 없이 사용.
  - `[slug]/login` 로그인 성공 시 `/{slug}/dashboard`로 이동.
  - 디버깅 체크: `npx tsc --noEmit` 오류 0개, `npm run build` 성공.

## 2026-07-13 (59차)

- **헤더 메뉴 권한 정리**:
  - `AppHeader.tsx`: "업무 등록" 링크는 ADMIN/LEADER에게만 노출(WORKER는 `POST /api/tasks` 권한이 없어 클릭 시 항상 권한 없음 화면으로 막혀 있었음).
  - "보안 설정"(2FA/세션 관리)은 전 역할이 API 권한을 갖고 있음에도 admin/leader 전용 "설정" 드롭다운에 있어 WORKER는 메뉴로 접근할 수 없었음 → 전 역할이 보는 "마이페이지"(계정) 드롭다운으로 이동.

- **업무 등록 화면 레이아웃 개선 + 첨부파일**:
  - `prisma/schema.prisma`: `TaskAttachment` 모델 추가(`data Bytes`로 DB 저장, 파일당 5MB/업무당 20MB/최대 5개 제한).
  - `POST /api/tasks`(단일 업무·하위업무 추가 경로), `POST /api/tasks/[id]/attachments`(기존 업무에 추가), `GET/DELETE /api/tasks/[id]/attachments/[attachmentId]`(다운로드/삭제) 신규.
  - `GET /api/tasks/[id]`에 `attachments` 메타데이터(파일명/크기/업로더) 포함.
  - `/tasks/create`: 기본정보(좌)/비고(우) 2단 레이아웃 → 기본정보(상단, 4열 그리드로 넓게)/비고(하단) 상하 배치로 변경. 비고 카드 하단에 파일 선택 UI(최대 5개, 각 5MB) 추가, 선택한 파일은 업무 등록과 함께 제출.
  - `/tasks/[id]`: 상세내용 카드 하단에 첨부파일 목록(다운로드 링크)/추가/삭제 UI 추가.
  - 디버깅 체크: `npx tsc --noEmit` 오류 0개, `npm run build` 성공.

## 2026-07-13 (60차)

- **헤더 메뉴 재구성**: 업무 / 협업(신청·위키·정보·공지사항) / 관리(프로젝트·팀원관리·통계, ADMIN/LEADER) / 설정(조직설정·구글캘린더연동·외부연동·감사로그, ADMIN 위주) 4개 드롭다운으로 재편. 기존 "설정" 드롭다운 하나에 8개 항목이 섞여 있던 것을 도메인별로 분리. 공지사항이 admin/leader 전용 메뉴에 있어 WORKER는 조회 메뉴가 없던 문제를 "협업"으로 옮겨 해결(조회는 전 역할 허용이 원래 정책).

- **보안 점검 및 개선**:
  - `src/lib/rate-limit.ts` 신규: 로그인 브루트포스 방지용 인메모리 rate limiter. 이메일당 15분 내 5회 실패 시 15분 잠금.
  - `src/lib/auth.ts`: `authorize()`의 모든 실패 분기(존재하지 않는 계정/비활성/조직불일치/비밀번호오류/TOTP오류)에서 `recordFailure` 호출, 성공 시 `recordSuccess`로 카운터 리셋.
  - `src/middleware.ts`: `Content-Security-Policy`, `Permissions-Policy`, (운영환경 한정) `Strict-Transport-Security` 헤더 추가. 기존에는 `/login`, `/{slug}/login` 등 공개 경로에 보안 헤더가 아예 적용되지 않던 것도 수정.
  - `src/app/api/users/route.ts`: 사용자 생성 시 임시 비밀번호를 평문으로 서버 로그에 남기던 `console.log` 제거(응답 바디로 생성자에게만 전달되는 기존 방식은 유지).
  - 디버깅 체크: `npx tsc --noEmit` 오류 0개, `npm run build` 성공.

## 2026-07-13 (61차)

- **조직 데이터 백업(JSON 다운로드)**:
  - `GET /api/settings/organization/backup` (ADMIN 전용): 사용자(비밀번호/TOTP 시크릿 제외)·프로젝트·업무·타임로그·업무댓글·업무히스토리·정보(FAQ)·공지·신청·위키·스티키노트·개인자료·외부연동 설정을 JSON 한 파일로 묶어 다운로드. 첨부파일은 용량 문제로 실제 바이너리는 제외하고 파일명/크기 등 메타데이터만 포함. 다운로드 시 `AuditLog`에 `DATA_EXPORTED` 기록.
  - `/settings/organization` 페이지에 "데이터 백업" 섹션 추가 — 버튼 클릭 시 `highfive-backup-{slug}-{date}.json` 파일 다운로드.
  - 디버깅 체크: `npx tsc --noEmit` 오류 0개, `npm run build` 성공.

## 2026-07-13 (62차)

- **일정관리 기능 강화 (Phase 1+2-A+3-B)**:
  - **마감일/휴가 알림 스케줄러**: `src/lib/scheduler.ts` 신규 — 상시 프로세스에서 30분 주기로 실행되는 인메모리 스케줄러(`src/instrumentation.ts`에서 서버 기동 시 1회 등록). 기존에 저장만 되고 실제로 쓰이지 않던 `Organization.deadlineAlertDays`를 기준으로 마감 임박/초과 업무 담당자에게 `DEADLINE_APPROACHING` 알림 발송(같은 업무·담당자 조합은 하루 1회만, `UserNotification` 조회로 중복 방지). 승인된 휴가 시작 하루 전에는 `LEAVE_REMINDER`로 신청자에게 알림.
  - **구글 캘린더 iCal에 휴가 포함**: `GET /api/calendar/ical`이 기존엔 업무 목표일만 포함했는데, 본인의 승인된 휴가 일정도 종일 이벤트로 함께 포함하도록 확장. 캘린더 페이지엔 보이는데 구독 피드엔 빠져있던 불일치 해소. `/settings/calendar-sync` 안내 문구도 갱신.
  - **AI 주간 캘린더 요약**: `src/lib/ai.ts` 신규 — Anthropic Claude API 클라이언트 래퍼(`ANTHROPIC_API_KEY` 필요, `@anthropic-ai/sdk` 의존성 추가). `GET /api/ai/calendar-summary`가 이번 주 업무 마감/휴가 데이터를 모아 Claude(`claude-haiku-4-5-20251001`)에 전달해 3~5문장 한국어 브리핑 생성. `/calendar` 페이지에 "✨ 이번 주 AI 요약" 버튼 추가.
  - `.env.example`에 `ANTHROPIC_API_KEY` 안내 추가 — 미설정 시 AI 요약 API는 에러 응답 반환(기능 자체는 옵셔널).
  - 디버깅 체크: `npx tsc --noEmit` 오류 0개, `npm run build` 성공.

## 2026-07-13 (63차)

- **AI 캘린더 요약 버튼 → 준비중 안내로 전환**: `ANTHROPIC_API_KEY`를 당장 연결할 계획이 없어, `/calendar` 페이지의 "✨ 이번 주 AI 요약" 버튼이 `GET /api/ai/calendar-summary`를 호출하는 대신 클라이언트에서 바로 "AI 요약 기능은 준비 중입니다." 안내만 표시하도록 변경. 백엔드 API(`src/lib/ai.ts`, `/api/ai/calendar-summary`)는 그대로 남겨둬 이후 API 연결 시 프론트만 원복하면 바로 재사용 가능.
- 디버깅 체크: `npx tsc --noEmit` 오류 0개, `npm run build` 성공.

## 2026-07-13 (64차)

- **구글 캘린더 OAuth 실시간 동기화 (Phase 2-C, High5 → Google 단방향)**:
  - `prisma/schema.prisma`: `GoogleCalendarConnection`(사용자별 OAuth access/refresh 토큰, 캘린더ID), `GoogleCalendarEvent`(taskId/requestId ↔ 구글 이벤트ID 매핑, `@@unique([userId, sourceType, sourceId])`) 모델 추가.
  - `src/lib/google-calendar.ts` 신규: `googleapis` 기반 OAuth 클라이언트, 인증 URL 생성/코드 교환/토큰 자동 갱신(`tokens` 이벤트 리스너로 갱신된 access token을 DB에 재저장), 업무·휴가 이벤트 upsert/삭제 헬퍼.
  - `GET /api/auth/google/authorize`(동의화면 리다이렉트, state는 `ical-token.ts`의 서명 토큰 재사용으로 CSRF 방지) / `GET /api/auth/google/callback`(토큰 교환·저장) / `DELETE /api/auth/google/disconnect` / `GET /api/auth/google/status` 신규.
  - 업무 생성(`POST /api/tasks`)·수정(`PATCH /api/tasks/[id]`, 목표일·담당자 변경 시 이전 담당자 캘린더에서 삭제 후 신규 담당자에 생성)·삭제(`DELETE /api/tasks/[id]`), 휴가 승인(`PATCH /api/requests/[id]/decision`) 시점에 동기화 훅 연결. 모두 fire-and-forget + 내부 try/catch로 실패해도 본 흐름은 막지 않음.
  - `/settings/calendar-sync`: "실시간 연동(권장)" 섹션(Google 계정 연결/해제, 미설정 시 "준비 중" 안내) 추가, 기존 iCal 구독 URL 방식은 "대안" 섹션으로 유지. `useSearchParams` 사용으로 `Suspense` 경계 추가.
  - 구글→High5 역방향 동기화는 웹훅 채널 관리 복잡도(공개 콜백 URL, 채널 갱신) 때문에 이번 범위에서 제외 — 필요 시 후속 작업으로 남김.
  - `.env.example`에 `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` 안내 추가(Google Cloud Console에서 OAuth 클라이언트 발급, 리디렉션 URI `{NEXTAUTH_URL}/api/auth/google/callback` 등록 필요). `googleapis` 패키지 의존성 추가.
  - 디버깅 체크: `npx tsc --noEmit` 오류 0개, `npm run build` 성공.

## 2026-07-13 (65차)

- **상태변경/담당자변경 알림이 안 뜨던 버그 수정**: `src/lib/notify.ts`의 `notifyWorkerChange`/`notifyStatusChanged`가 `organizationId`를 넘기지 않아 `UserNotification.organizationId`가 항상 `null`로 저장되고 있었음. `GET /api/notifications`가 `organizationId`로 엄격히 필터링하기 때문에(멀티테넌시 전환 시 누락) 상태변경/담당자변경 알림이 토스트에도 목록에도 절대 노출되지 않는 상태였음. 두 함수에 `organizationId` 파라미터를 추가하고 `src/app/api/tasks/[id]/status/route.ts`, `src/app/api/tasks/[id]/route.ts`에서 `requireAuth()`가 반환하는 값을 전달하도록 수정.
- **알림 벨 아이콘 추가**: `src/components/NotificationBell.tsx` 신규 — 위키검색 FAB 위에 배치, 안읽음 개수 뱃지 표시(9+는 "9+"로 표기). 클릭 시 최근 알림 30건 드롭다운(열람 시 자동 전체 읽음 처리), 항목 클릭 시 `taskId`가 있으면 해당 업무 상세로 이동. `LayoutWrapper`에 로그인 상태에서만 렌더링. `src/types/index.ts`의 `UserNotificationType`에 실제 서버에서 쓰는 타입(REQUEST_APPROVED/REJECTED, ANNOUNCEMENT, DEADLINE_APPROACHING, LEAVE_REMINDER 등) 반영.
- **작업자도 비고 수정 가능**: `PATCH /api/tasks/[id]`에서 WORKER가 본인이 담당한 업무의 "비고"만 수정할 수 있도록 허용(요청 바디에 notes 외 필드가 섞이면 거부, 다른 필드는 여전히 ADMIN/LEADER 전용). `/tasks/[id]` 페이지의 상세내용 "수정" 버튼도 `canEdit`(ADMIN/LEADER) 대신 `canEditNotes`(ADMIN/LEADER 또는 담당 작업자)로 노출.
- 디버깅 체크: `npx tsc --noEmit` 오류 0개, `npm run build` 성공.

## 2026-07-13 (66차)

- **멀티테넌시 전환 시 누락된 organizationId 전수 감사**: 이전 차수에서 발견한 `notifyWorkerChange`/`notifyStatusChanged`의 `organizationId` 누락 버그와 동일한 패턴이 더 있는지 전체 `create`/`createMany` 호출부와 `requireAuth`/`requireRole` 반환값 사용처를 감사.
  - **확인된 버그**: `src/app/api/tasks/[id]/comments/route.ts`의 @멘션 댓글 알림(`COMMENT_MENTION`)이 `organizationId`를 넘기지 않아 동일하게 알림이 절대 노출되지 않던 문제 수정(`task.organizationId` 사용).
  - **방어적 수정**: `src/lib/services/task.service.ts`의 `createTask()` 헬퍼가 `organizationId` 없이 Task를 생성하던 부분 수정(현재 호출부가 없는 미사용 코드이나, 향후 재사용 시 함정이 되는 것을 방지).
  - **점검 후 이상 없음 확인**: `projects`, `users`, `tasks`(3개 생성 경로 모두), `requests`, `announcements`, `info`, `sticky-notes`, `settings/integrations`, `users/invite`, `requests/[id]/decision`, `scheduler.ts`, `instrumentation.ts`, `audit.ts` — 모두 organizationId가 정상 전달됨.
  - 디버깅 체크: `npx tsc --noEmit` 오류 0개, `npm run build` 성공.

## 2026-07-13 (67차)

- **WORKER 계정에서 @멘션 목록이 안 뜨던 버그 수정**: 업무 상세의 댓글 @멘션 자동완성이 `GET /api/users`(파라미터 없음)로 전체 사용자를 조회했는데, 이 API는 ADMIN/LEADER만 허용해 WORKER 계정은 403을 받고 `.catch(() => {})`로 조용히 실패 → `allUsers`가 항상 빈 배열로 남아 멘션 드롭다운이 절대 뜨지 않았음. `GET /api/users?minimal=true`(id/name만 반환, 전 역할 허용) 신규 추가하고 프론트에서 이걸 쓰도록 변경.
- **답글에 답글을 달 수 없던 문제 수정**: 답글(대댓글) 항목에는 "답글" 버튼이 없어 답글 스레드를 이어갈 수 없었음(백엔드는 이미 전 역할 답글 작성을 허용). 답글 항목에도 "답글" 버튼을 추가하되, 스키마상 2단계 스레드 구조를 유지하기 위해 답글의 답글도 같은 최상위 댓글의 `parentId`로 귀속(평평한 2단 구조). 답글 입력창 placeholder도 실제 답글 대상자 이름을 반영하도록 수정.
- 디버깅 체크: `npx tsc --noEmit` 오류 0개, `npm run build` 성공.

## 2026-07-13 (68차)

- **알림 토스트/벨 아이콘 상태 통합 + 위치 겹침 해소**: `NotificationToastManager`와 `NotificationBell`이 각자 독립적으로 `useNotifications()`를 호출해 30초 폴링을 두 번 돌리고 상태가 어긋날 수 있던 구조를 `src/components/NotificationsProvider.tsx`(Context)로 단일화. 인증/로그인 페이지 여부에 따라 빈 컨텍스트를 반환해 게이팅. 토스트 팝업 위치도 우하단(WikiSearchButton/NotificationBell FAB와 겹치던 자리)에서 우상단(헤더 아래)으로 이동.
- **전체 기능 정리 문서 신규**: `docs/FEATURES.md` — 계정/조직 구조, 보안, 업무관리, 캘린더/일정관리, 알림, 협업, 조직관리(ADMIN), 플랫폼관리(SUPERADMIN), UI/UX 9개 영역으로 현재 구현된 모든 기능을 사용자/역할 관점에서 정리. 스코프 제외 영역(회계/CRM/인사평가/급여/결제/네이티브 앱)도 명시.
- 디버깅 체크: `npx tsc --noEmit` 오류 0개, `npm run build` 성공.

## 2026-07-13 (69차)

- **로그아웃 시 슬러그 없는 /login으로 되돌아가던 레이스 컨디션 수정**: `src/hooks/useAuth.ts`가 미인증 상태를 감지하면 자체적으로 `router.push`하던 로직이, `AppHeader`의 `handleLogout`(올바른 `/{slug}/login`으로 이동)과 동시에 경합하고 있었음. 로그아웃 시 `Providers.tsx`의 `AuthSync`가 Zustand 스토어(`authStore`)의 `user`를 `null`로 지우는 처리가 먼저 일어나면, `useAuth()`가 참조하는 `organizationSlug`도 함께 사라져 슬러그 없는 `/login`으로 리다이렉트하게 되고, 이게 `AppHeader`의 올바른 이동을 나중에 덮어쓰는 경우가 있었음. `useAuth()`의 미인증 자동 리다이렉트를 제거하고, 책임을 `middleware.ts`(최초 접근 차단)와 `AuthSync`(세션 만료/로그아웃 감지, 수동 로그아웃 플래그 존중)로 일원화.
- 디버깅 체크: `npx tsc --noEmit` 오류 0개, `npm run build` 성공.

## 2026-07-13 (70차) — 업무 관리 협업 강화 9종

사용자 요청("업무 관리 중심으로 협업 강화 검토")에 따라 조사·제안한 9개 항목을 순차 구현.

1. **댓글 수정**: `PATCH /api/tasks/[id]/comments/[commentId]` 신규, 본인 댓글만 수정 가능. 기존 댓글/답글 삭제 버튼 노출 조건이 `session.user.id`(string)와 `author.id`(number)를 `===`로 비교해 실질적으로 항상 false였던 버그도 함께 수정(`currentUserId`로 통일).
2. **일반 댓글 알림**: 댓글/답글이 달리면 멘션 여부와 무관하게 담당자·등록자에게 `NEW_COMMENT` 알림(작성자 본인·이미 멘션받은 사람 중복 제외).
3. **댓글 전역검색 포함**: `/api/search`에 `TaskComment.content` 검색 추가, 매치 시 스니펫에 💬 접두사로 댓글 내용 표시.
4. **업무목록 검색/정렬 UI**: 필터 바에 텍스트 검색(제목/비고)과 정렬(목표일 빠른/늦은순, 제목순, 최근등록순) 드롭다운 추가.
5. **알림 개별 읽음 처리**: `PATCH /api/notifications/[id]` 신규, 벨을 열 때 무조건 전체읽음 처리하던 것을 제거하고 항목 클릭 시에만 해당 알림 읽음 처리. "모두 읽음" 버튼은 별도 노출.
6. **우선순위(priority) 필드**: `Task.priority`(LOW/NORMAL/HIGH/URGENT) 추가. 업무 등록/상세 수정 폼에 select, 목록 필터, HIGH/URGENT 업무는 제목 앞 색상 점으로 표시(목록+칸반).
7. **체크리스트**: `TaskChecklistItem` 모델 신설. ADMIN/LEADER 또는 담당자·등록자가 추가/체크토글/삭제 가능. 업무 상세에 진행률(N/M)과 함께 카드로 표시.
8. **칸반 카드 개선**: 담당자 이니셜 아바타, 라벨 색상칩, 댓글수/첨부파일수 카운트 추가(`_count`에 comments/attachments 포함).
9. **개인화 뷰 탭**: `/tasks` 목록 상단에 전체/내 담당/내가 멘션된 업무 탭. `GET /api/tasks/mentioned`가 댓글 내 멘션 패턴(`](userId)`)으로 매칭된 업무 id를 반환.

디버깅 체크: 매 항목마다 `npx tsc --noEmit` 오류 0개, `npm run build` 성공 확인 후 커밋.

## 2026-07-13 (71차)

- **회의록 기능 (Web Speech API 음성 받아쓰기 + 직접 작성)**: 인사평가는 이전 결정대로 스코프 제외, 회의록만 구현.
  - `prisma/schema.prisma`: `MeetingNote` 모델 신설(projectId, title, content, attendees, meetingDate, authorId) — `WikiPage`와 동일한 프로젝트 종속 문서 패턴.
  - `GET/POST /api/projects/[id]/meetings`, `PATCH/DELETE /api/projects/[id]/meetings/[meetingId]`: wiki 라우트와 동일한 접근 제어(프로젝트 멤버 또는 ADMIN 조회/작성, 작성자 본인·ADMIN 삭제).
  - `GET /api/meetings/search`: 소속 프로젝트(ADMIN은 전체) 회의록 통합검색.
  - `src/hooks/useDictation.ts` 신규: 브라우저 내장 Web Speech API 래퍼(ko-KR, continuous, interimResults). 오디오 파일은 저장하지 않고 텍스트만 실시간 반영 — 서버 비용/저장소 이슈 회피. Chrome/Edge만 지원, 미지원 브라우저는 버튼 비활성화 + 안내 문구.
  - `src/app/meetings/page.tsx`(허브, `/wiki` 허브와 동일 구조), `src/app/projects/[id]/meetings/page.tsx`(프로젝트별 목록/아코디언/작성/수정/삭제) 신규. 받아쓰기 토글 + SimpleEditor로 직접 수정 가능.
  - `/projects` 멤버 패널과 `AppHeader` "협업" 드롭다운에 "회의록" 링크 추가. `src/middleware.ts`의 `orgScopedRoutes`에 `meetings` 추가(`/{slug}/meetings` 지원).
  - 디버깅 체크: `npx tsc --noEmit` 오류 0개, `npm run build` 성공.

## 2026-07-14

- **디자인 통일성 + 고급스러움 개선 (1차 개발 마무리, 테스트 모드 진입 전)**: Linear/Notion 스타일의 절제된 프리미엄 방향으로 전체 페이지 디자인 정비. 6단계 순차 진행 중 1~3단계 완료.
  - 1단계(`globals.css` 토큰 확장): 콘텐츠 너비 스케일(`--width-wide` 1440px / `--width-standard` 960px / `--width-narrow` 720px / `--width-compact` 440px), 카드 radius(`--radius-card` 10px), 시맨틱 라이트 컬러(`--success/warning/danger/info-light`, `-border`), 선택적 그림자(`--shadow-card`/`--shadow-hover`), 선택적 그라데이션(`--accent-gradient`), 제목 유틸리티(`.page-title`/`.page-subtitle`) 신규 토큰 추가.
  - 2단계(일상 업무 화면): dashboard/tasks(목록·생성·상세·칸반)/calendar/stats — max-width를 `--width-wide`로, 제목 22px로 통일. dashboard KPI 카드에 `--shadow-card`(hover 시 `--shadow-hover`) 선택 적용.
  - 3단계(협업 화면): wiki/meetings는 `--width-standard`, projects/requests/announcements/info/my-notes 등은 `--width-wide`로 통일, 최상위 padding을 `var(--space-8)`로 통일(리터럴 `40px 32px` 하드코딩 제거).
  - 35개 파일에 산재하던 success/warning/danger/info 파스텔 하드코딩 hex(274건)를 신규 시맨틱 토큰으로 일괄 교체, 19개 파일의 카드류 `border-radius`를 `--radius-card`로 통일.
  - 디버깅 체크: `npx tsc --noEmit` 오류 0개, `npm run build` 성공.

## 2026-07-14 (2차)

- **디자인 통일성 + 고급스러움 개선 — 4~6단계 마무리 (전체 완료)**
  - 4단계(설정/관리자 화면): settings/organization·security·calendar-sync·integrations, profile/password는 `--width-narrow`(720px) 적용, 제목 22px 통일. settings/audit·superadmin·users는 표 위주 화면이라 `--width-wide`(1440px) 적용, superadmin 최상위 padding을 `var(--space-8)`로 통일(리터럴 `32px 24px` 제거). superadmin/[id]·superadmin/plan-config는 `superadmin.module.css`를 공유해 자동 반영.
  - 5단계(인증 화면): login/register를 `--width-compact`(440px)로 통일(`[slug]/login`은 `login.module.css` 공유). 로고 아이콘 배경에 `--accent-gradient` 선택 적용해 브랜드 영역에 생동감 부여. login의 successBox 하드코딩 hex를 `--success`/`--success-light` 토큰으로 교체.
  - 6단계(`docs/DESIGN.md` 갱신): Content Width Scale(4단계 토큰) 섹션 신규, 카드 radius를 `--radius-card`(10px) 단일 토큰으로 정정, 시맨틱 라이트 컬러 표 추가, 선택적 그림자/그라데이션 적용 대상(KPI 카드·모달·팝오버·브랜드 히어로)을 명시적으로 규정, 페이지 타이틀 22px/700 통일 규칙 명문화.
  - 디버깅 체크: 매 단계마다 `npx tsc --noEmit` 오류 0개, `npm run build` 성공 확인 후 커밋·머지·푸시.
  - 이로써 "1차 개발 마무리, 테스트 모드 진입 전" 디자인 통일성 개선 작업 전체 완료.

## 2026-07-14 (3차)

- **버그: 전역 검색 입력 텍스트 미표시** — `GlobalSearchModal.module.css`, `tasks/[id]/detail.module.css`, `tasks/tasks.module.css`, `tasks/create/create.module.css`가 `globals.css`에 정의된 적 없는 CSS 변수(`--color-text`, `--color-gray-700`)를 참조해 텍스트가 사실상 안 보이던 문제 수정. 실제 정의된 토큰(`--text-primary`/`--text-secondary`)으로 교체. 전체 코드베이스의 `var(--x)` 참조 vs `globals.css` 정의 diff로 동일 유형 버그를 전수 스캔해 확인.
- **기능: 업무 상세 "활동 히스토리" 접기/펼치기** — 기본 접힌 상태로 변경, 제목 클릭 시 펼침. 이후 사용자 피드백으로 화살표를 카드 우측 끝으로 재배치하고 색상/크기를 키워 가시성 개선(`--text-muted` 12px → `--text-secondary` 14px).
- **보안 점검 전체 감사 및 수정**: Explore 에이전트 3개를 병렬로 띄워 (1)인증/세션/미들웨어, (2)API 인가/멀티테넌시 격리, (3)XSS/입력검증/시크릿 노출을 감사.
  - **Critical IDOR 수정** (조직 간 데이터 격리 붕괴 — `findUnique({id})` → `findFirst({id, organizationId})` 패턴으로 교체):
    - `api/projects/[id]` GET/PATCH/DELETE — 다른 조직 프로젝트를 ID만 알면 조회/수정/삭제 가능했던 문제
    - `api/tasks/[id]` DELETE — org 필터 없이 역할 체크만으로 다른 조직 업무 삭제 가능했던 문제
    - `api/requests/[id]/decision` — 다른 조직의 미배정 신청을 ADMIN이 승인/거절 가능했던 문제
    - `api/tasks/[id]/comments/[commentId]` PATCH/DELETE — task 관계의 조직 검증 누락
    - `api/projects/[id]/wiki/[wikiId]` PATCH/DELETE — projectId가 호출자 조직 소속인지 미검증
  - **High 이슈 수정**:
    - `src/lib/ical-token.ts` — `NEXTAUTH_SECRET` 미설정 시 하드코딩 fallback 시크릿(`'tms-ical-secret'`)으로 조용히 넘어가던 것을 제거, 지연 평가(lazy getSecret())로 명시적 에러를 던지도록 변경(빌드 타임 영향 없음)
    - `api/webhooks/github` — `GITHUB_WEBHOOK_SECRET` 미설정 시 서명검증을 통째로 스킵하던 것을 제거, 시크릿 미설정 또는 서명불일치 시 무조건 401 거부
    - `api/webhooks/slack` — 인증 없이 누구나 호출 가능하던 것에 `requireAuth()` 추가
  - **보류 항목** (설계 논의 필요, 이번 라운드 미포함): JWT 세션이 요청마다 DB 재검증 없이 30분간 신뢰되는 문제(계정 비활성화/역할 변경이 즉시 반영 안 됨), 로그인 시 사용자 존재 여부에 따른 응답시간 차이(타이밍 사이드채널), 첨부파일 업로드 MIME 타입/확장자 미검증(현재는 크기만 검증, `attachment` disposition으로 즉각적 위험은 낮음), bcrypt cost factor 불일치(`src/lib/utils.ts`=10 vs `organizations/route.ts`=12).
  - **확인됨(문제 없음)**: task.notes는 `sanitize-html`로 서버측 새니타이즈 후 저장(XSS 안전), 댓글/멘션 렌더링은 React 자동 이스케이프만 사용, search 계열 API는 모두 organizationId로 정상 스코핑, superadmin 라우트는 일관되게 `requireSuperAdmin()` 사용, `$executeRawUnsafe`는 파라미터 바인딩이라 SQL 인젝션 아님, `.env.example`엔 실제 시크릿 없음, 로그인 브루트포스 방지용 rate-limit 적용됨(인메모리라 다중 인스턴스 배포 시 비영속적이라는 한계는 있음).
  - 디버깅 체크: `npx tsc --noEmit` 오류 0개, `npm run build` 성공.
- **UI**: 업무 상세 "활동 히스토리" 토글 화살표 크기를 14px → 38px로 재확대(사용자 피드백).

## 2026-07-14 (4차)

- **보류했던 Medium 보안 이슈 4건 전부 수정**:
  - `src/lib/utils.ts`의 `requireAuth`/`requireRole`/`requireSuperAdmin`에 `isSessionAccountActive()` 재검증 추가 — 매 API 요청마다 계정/조직 `isActive` 여부를 가볍게 재조회. 기존엔 JWT 세션이 최대 30분간 재검증 없이 신뢰되어, 세션 발급 이후 계정이 비활성화되거나 조직이 비활성화돼도 만료 전까지 그대로 접근 가능했던 문제를 해소.
  - `src/lib/auth.ts`의 `authorize()`를 재구성해 계정 존재 여부와 무관하게 항상 `bcrypt.compare`를 실행하도록 변경(계정 없을 때는 모듈 로드 시 1회 계산한 더미 해시와 비교) — 응답 시간으로 계정 존재 여부를 유추할 수 있던 타이밍 사이드채널 제거.
  - `src/app/api/tasks/[id]/attachments/route.ts`에 서버측 MIME/확장자 허용목록(`ALLOWED_ATTACHMENT_TYPES`) 추가 — 이미지/문서/압축 등 정해진 타입 외(html, svg, 실행파일 등)는 거부, 파일명에서 경로 구분자를 제거해 정규화.
  - bcrypt cost factor 통일: `src/lib/utils.ts`의 `hashPassword()`가 `BCRYPT_COST=12` 상수를 쓰도록 하고, `change-password`/`organizations`(회원가입)/`superadmin/organizations/[id]/users`의 개별 `bcryptjs.hash(x, 10|12)` 호출을 전부 `hashPassword()` 재사용으로 교체.
  - 디버깅 체크: `npx tsc --noEmit` 오류 0개, `npm run build` 성공.

## 2026-07-14 (5차)

- **기능: GitHub PR 등록/머지 시 담당 리더(등록자)에게 인앱 알림** — 기존엔 PR이 머지돼도 업무 상태만 자동 완료 처리되고 아무 알림이 없었음(사용자 지적: "이 기능이 의미없잖아, 알림 가야하잖아"). `api/webhooks/github/route.ts`에 `pull_request` 액션 분기 추가: `opened` 시 등록자에게 "PR 등록" 알림(`GITHUB_PR_OPENED`), `closed`+`merged` 시 등록자+담당자에게 "머지 완료" 알림(`GITHUB_PR_MERGED`) 발송(`src/lib/notify.ts`의 `createUserNotification` 재사용). `src/types/index.ts`의 `UserNotificationType`에 두 타입 추가. `docs/PROJECT_STRUCTURE.md`에 웹훅 등록이 코드 배포와 별개로 저장소 측 설정(Payload URL + Secret)이 필요하다는 점도 명시.
- 디버깅 체크: `npx tsc --noEmit` 오류 0개, `npm run build` 성공.

## 2026-07-15

- **AI 자동화 기능 확장 (전체 9단계 완료)**: 담당자별 업무 부하 분석, 날씨 인사말, 회의록 자동요약/업무변환 등 폭넓은 AI 제안 중 사용자가 "순차적으로 구현, 이후 API 값만 넣으면 동작할 정도로" 요청 — 조직별 ADMIN이 API 키를 등록하고 기능별로 켜고 끌 수 있는 인프라를 먼저 구축한 뒤 9개 기능을 순차 적용.
  1. **인프라**: `AiSettings` 모델 신규(조직당 1행). `src/lib/crypto.ts`(AES-256-GCM, `NEXTAUTH_SECRET`에서 파생한 키 재사용, 추가 환경변수 불필요)로 API 키를 암호화 저장. `src/lib/ai.ts`의 `callClaude()`에 조직별 키 오버라이드 파라미터 추가(없으면 기존 env 폴백). `GET/PUT /api/settings/ai`(ADMIN), `GET /api/settings/ai/status`(인증 사용자 전체, 기능 on/off만 반환) 신규. `/settings/ai` 페이지(ADMIN 전용) — Anthropic/날씨 API 키 입력 + 8개 기능 토글, 키 없이 기능을 켜려는 시도는 서버에서 거부.
  2. **회의록 AI 자동요약**: `MeetingNote.aiSummary`(Text) 필드 추가. `POST /api/projects/[id]/meetings/[meetingId]/summarize` — 본문에서 결정사항/액션아이템을 JSON으로 구조화해 요약·캐시. 회의록 아코디언에 "AI 요약 생성" 버튼과 결과 표시.
  3. **회의록 → 업무 자동 변환**: ADMIN/LEADER가 액션아이템을 체크박스+담당자 선택으로 골라 기존 `POST /api/tasks`를 통해 일괄 업무 생성.
  4. **담당자별 업무 부하 AI 인사이트**: 기존 `GET /api/stats/workload` 집계 로직을 `src/lib/workload.ts`의 `computeWorkloadStats()`로 추출·재사용, `POST /api/ai/workload-insight`가 재계산 없이 그대로 프롬프트에 전달. `/stats` 페이지에 "AI 부하 분석" 버튼(ADMIN/LEADER).
  5. **AI 업무 생성 보조**: `POST /api/ai/task-draft` — 제목만으로 상세내용 초안 + 라벨 추천. `/tasks/create`의 "비고" 카드에 "AI로 작성" 버튼.
  6. **AI 업무 요약**: `POST /api/ai/task-summary` — 업무 비고+최근 히스토리 10건+댓글 20건 기반 현황 요약. `/tasks/[id]` "기본 정보" 카드에 "AI 요약" 버튼.
  7. **AI 자연어 검색**: 기존 `GET /api/search` 로직을 `src/lib/search.ts`의 `runSearch()`로 추출·재사용, `POST /api/ai/search`가 자연어 질의에서 키워드만 추출해 그대로 재사용. `GlobalSearchModal`에 "✨ AI" 토글 + Enter 검색.
  8. **AI 주간 보고서**: `POST /api/ai/weekly-report` — 이번 주 완료/진행 업무 + `computeWorkloadStats()` 팀별 공수 기반 보고서. `/stats` 헤더에 "AI 주간 보고서" 버튼(ADMIN/LEADER).
  9. **날씨 기반 인사말**: `src/lib/weather.ts`(OpenWeatherMap) + `GET /api/ai/weather-greeting`(같은 조직·날짜 인메모리 캐시). 대시보드 인사말 아래 한 줄 표시, 키/도시 미설정 시 자동 숨김.
  - 각 단계 완료마다 `npx tsc --noEmit` 오류 0개, `npm run build` 성공 확인 후 커밋·머지·푸시.
  - 참고: 이 환경은 `DATABASE_URL`이 없어 `npx prisma db push`를 직접 실행하지 못했으나, `package.json`의 `start` 스크립트(`prisma db push --skip-generate --accept-data-loss && next start`)가 Railway 배포(`railway.json`의 `deploy.startCommand`) 때마다 자동 실행되므로 `AiSettings`/`MeetingNote.aiSummary` 스키마 변경은 별도 조치 없이 다음 배포에 자동 반영됨.

## 2026-07-15 (2차)

- **협업 강화 우선순위 C 전체 완료**: 이전 세션에서 제안한 "업무 관리 중심 협업 강화" 3개 우선순위 중 A·B는 이미 구현되어 있음을 확인, 사용자 요청대로 C 3개만 진행.
  1. **알림 구독/음소거 설정**: `NotificationMute` 모델(userId+scope['TASK'|'PROJECT']+targetId, unique) 신규. `src/lib/notify.ts`의 `createUserNotification()`(모든 인앱 알림 생성의 단일 지점)에 뮤트 체크를 넣어 개별 호출부(댓글/상태변경/담당자변경/신청결재/GitHub웹훅 등)를 건드리지 않고 한 곳에서 차단. `GET/POST/DELETE /api/notifications/mute` 신규. 업무 상세 제목 옆(`tasks/[id]/page.tsx`)과 프로젝트 멤버 패널(`projects/page.tsx`)에 🔔/🔕 토글 버튼 추가. 외부 채널(Slack/잔디) 알림은 이번 범위 제외, 인앱 알림만 대상.
  2. **업무 의존관계(선후행)**: `TaskDependency` 모델(taskId=차단되는 업무, blockingTaskId=선행 업무, unique) 신규. `src/lib/task-dependency.ts`에 BFS 순환검사(`wouldCreateCycle`)와 프로젝트별 커스텀 상태(`isProgress`/`isDone`) 기준 차단 판정(`assertNotBlocked`) 구현 — `'DONE'` 문자열 하드코딩 없이 `src/lib/task-status.ts`의 `getProjectStatuses()` 재사용. `GET/POST/DELETE /api/tasks/[id]/dependencies` 신규. 상태변경 경로 2곳(`tasks/[id]/status/route.ts`, `tasks/[id]/route.ts` PATCH) 모두에 차단 체크 삽입(이 김에 `status/route.ts`의 `findUnique`→`findFirst` organizationId 필터 누락도 같이 수정). `GET /api/tasks` 목록에 `hasIncompleteBlockers` 플래그 추가(관련 프로젝트들의 완료 코드셋을 배치 조회해 N+1 방지), 업무 상세에 "선행 업무" 카드, 업무 목록/칸반 카드에 🔒 배지, 칸반 드래그 시 클라이언트 1차 차단(서버 이중 검증) 추가.
  3. **GitHub 양방향 동기화 확장**: 전체 댓글 동기화는 범위가 커서 제외, 두 가지로 좁힘 — (1) 완료 처리 시 GitHub PR/이슈에 완료 코멘트 자동 발송(Outbound), (2) 웹훅이 `pull_request`뿐 아니라 `issues`(opened/closed/reopened) 이벤트도 처리(Inbound 확장). `AiSettings.githubTokenEnc` 필드 추가(기존 Anthropic/날씨 키와 동일 암호화 패턴), `/settings/ai`에 "GitHub 연동" 카드, `src/lib/github.ts` 신규(`postGithubComment`, URL 파싱 후 GitHub REST API 호출).
  - 각 기능 완료마다 `npx tsc --noEmit` 오류 0개, `npm run build` 성공 확인 후 커밋·머지·푸시.
- **랜딩 페이지 신규**: 기존엔 `/`(도메인 루트)에 접속하면 즉시 SUPERADMIN 전용 `/login`으로 클라이언트 리다이렉트되어 일반 방문자용 소개 페이지가 없었음. `src/app/page.tsx`를 이 세션에서 구현한 기능들(업무관리/칸반/의존관계, 프로젝트 위키+회의록 AI요약, 캘린더+AI주간보고서, AI자동화 8종, 알림뮤트+멀티테넌시 보안, GitHub 양방향연동) 기반 랜딩 페이지로 교체. 히어로의 "무료로 시작하기"는 `/register`로, 조직 슬러그 입력 폼은 `/{slug}/login`으로 바로 이동. `src/app/landing.module.css` 신규(기존 디자인 토큰 재사용). 미들웨어가 `/`를 이미 공개 경로로 통과시키고 있어 라우팅 로직 변경은 불필요했음. `npx tsc --noEmit` 오류 0개, `npm run build` 성공(빌드 결과에 `/` 정적 페이지로 확인).
  - 후속 수정: 관리자는 `/login` URL을 직접 입력하면 되므로, 랜딩 페이지 네비/푸터의 "슈퍼관리자" 링크를 제거.
- **모바일 반응형 개선**: 랜딩 페이지(768px 이하 여백/폰트 대폭 축소, 히어로 버튼 세로스택, 데모모달 480px 대응), 업무 상세(제목/카드 헤더 버튼 줄바꿈, 선행업무 폼 세로스택), 회의록(액션아이템 행 세로스택). 업무 목록 테이블 컬럼 너비 고정(담당자/등록일자/목표일/상태 110px, ID 56px, 작업시간 90px, 비고 160px, 제목만 가변)과 필터바/뷰탭/일괄작업바 모바일 대응(세로 스택, 가로 스크롤) 추가.
- **마케팅 착수 전 준비 (2~4번)**:
  1. 데모 신청 접수 시 관리자 알림 — `src/lib/platform-notify.ts`(SLACK_WEBHOOK_URL로 직접 발송) + 신청자 확인 이메일 + `PLATFORM_ADMIN_EMAIL` 설정 시 관리자 알림 이메일.
  2. SEO/소셜 공유 메타데이터 — `src/app/icon.tsx`/`opengraph-image.tsx`(next/og로 동적 생성, 별도 이미지 자산 불필요), `robots.ts`/`sitemap.ts` 신규, `layout.tsx`에 metadataBase/openGraph/twitter 카드 추가.
  3. 이메일 인프라 — `src/lib/email.ts`(nodemailer, SMTP_HOST 미설정 시 콘솔 로그로 대체), `email-templates.ts`(데모신청 확인/관리자알림, 조직가입 환영 메일). 조직 생성(`/register`) 시 환영 이메일 + Slack 알림 발송하도록 연결.
  4. 에러 트래킹(Sentry) — `sentry.server.config.ts` + `src/lib/sentry-client.ts`(Providers.tsx에서 import), SENTRY_DSN 미설정 시 비활성화, next.config 변경 없음(빌드 리스크 회피).
  5. 분석 도구 — `NEXT_PUBLIC_GA_MEASUREMENT_ID` 설정 시에만 layout.tsx에 Google Analytics 스크립트 삽입.
  - 모든 신규 기능은 관련 env var 미설정 시 조용히 비활성화되어 기존 배포에 영향 없음 — 실제 활성화하려면 배포 환경에 각 서비스 키 설정 필요. `nodemailer`, `@sentry/nextjs` 패키지 추가. `npx tsc --noEmit` 오류 0개, `npm run build` 성공(icon/opengraph-image/robots.txt/sitemap.xml 라우트 정상 생성 확인).
- **사용 메뉴얼 페이지 신규**: 현재 구현된 기능을 카테고리별로 설명하는 정적 콘텐츠 페이지(`/manual`) 추가 — 업무관리(칸반/의존관계/체크리스트), 프로젝트 협업(위키/회의록+AI요약/업무변환), 일정&리포트(캘린더/통계/AI부하분석/AI주간보고서), AI 자동화(설정방법 포함), 알림&개인화(뮤트/외부연동), 권한&보안, GitHub 연동 7개 섹션. 아코디언 접기/펼치기 + 상단 태그 앵커 이동. `AppHeader` "협업" 드롭다운에 링크 추가, `middleware.ts`의 `orgScopedRoutes`에 `manual` 추가.
- **무료 데모 신청 → 슈퍼관리자 열람**: `DemoRequest` 모델 신규(name/company/email/phone?/message?/status). `POST /api/demo-requests`(공개, IP당 1시간 5건 인메모리 스팸 방지)로 랜딩 페이지에서 신청 접수. `GET/PATCH/DELETE /api/superadmin/demo-requests[/id]`(SUPERADMIN 전용)로 목록 조회·상태변경(대기중/연락완료/종료)·삭제. `/superadmin/demo-requests` 페이지 신규(기존 `superadmin.module.css` 재사용), `AppHeader`의 시스템관리자 드롭다운에 "데모 신청" 링크 추가. 랜딩 페이지 네비/히어로/하단 CTA에 "무료 데모 신청" 버튼 + 모달 폼(이름/회사명/이메일 필수, 연락처/메시지 선택) 추가. `npx tsc --noEmit` 오류 0개, `npm run build` 성공.

## 2026-07-18

- **모바일 최적화 2차**: 랜딩 페이지(`landing.module.css`) 네비/히어로/CTA/모달 반응형 대폭 보강(버튼 세로 스택, 텍스트 크기 축소, 400px 이하에서 로고 텍스트 숨김). 업무 상세(`tasks/[id]/detail.module.css`)·회의록(`meetings.module.css`)의 버튼/액션 행이 좁은 화면에서 겹치던 문제를 `flex-wrap`으로 수정.
- **업무 목록 테이블 컬럼 너비 버그 수정**: `tasks/page.tsx`의 `<th>`가 참조하던 `thAssignee`/`thStatus`/`thId`/`thCreatedAt`/`thTarget`/`thHours` CSS 클래스가 `tasks.module.css`에 아예 정의돼 있지 않아(존재하는 건 `thCheck` 뿐) `table-layout: fixed` 상태에서 컬럼 너비가 제각각으로 나뉘던 것이 근본 원인이었음. 담당자/상태/등록일/목표일 계열은 110px 고정, 아이디 56px, 공수 90px, 비고 160px, 제목만 `width: auto`(가변)로 전체 컬럼 너비 규칙 신규 추가. 필터 영역(`filterBar`)도 모바일에서 세로 스택 + 각 입력 100% 너비로, 뷰 탭(`viewTabs`)은 가로 스크롤 가능하도록 반응형 추가.
- **마케팅 준비 항목(2~4) 구현**:
  1. 데모 신청 접수 시 플랫폼 관리자 Slack 알림(`src/lib/platform-notify.ts`, `SLACK_WEBHOOK_URL` 미설정 시 무동작) + 신청자 확인 메일/관리자 알림 메일(`nodemailer` 기반 `src/lib/email.ts`, `SMTP_HOST` 미설정 시 콘솔 로그만 남기는 안전한 폴백) 발송. 조직 가입(`POST /api/organizations`) 완료 시에도 환영 메일 + Slack 알림 발송.
  2. SEO 기본기 — `src/app/icon.tsx`/`opengraph-image.tsx`(`next/og` `ImageResponse`로 동적 생성, 별도 이미지 파일 불필요), `robots.ts`, `sitemap.ts` 신규. `layout.tsx`에 `metadataBase`/`openGraph`/`twitter` 메타데이터 보강.
  3. 에러 트래킹(Sentry) — `sentry.server.config.ts` + `src/lib/sentry-client.ts`(Providers.tsx에서 import), SENTRY_DSN 미설정 시 비활성화.
  4. 분석 도구 — `NEXT_PUBLIC_GA_MEASUREMENT_ID` 설정 시에만 layout.tsx에 Google Analytics 스크립트 삽입.
  - 모든 신규 기능은 관련 env var 미설정 시 조용히 비활성화되어 기존 배포에 영향 없음. `nodemailer`, `@sentry/nextjs` 패키지 추가.
- **이용약관/개인정보처리방침 페이지 + 가입 동의 체크박스**: `/legal/terms`, `/legal/privacy` 공개 정적 페이지 신규(`legal.module.css` 공용, 인증 불필요 — `middleware.ts`의 `orgScopedRoutes`에 포함되지 않아 자동으로 공개). `/register` 폼 하단에 "이용약관 및 개인정보처리방침에 동의합니다" 필수 체크박스 추가, 미동의 시 제출 버튼 비활성화 + 클라이언트측 에러 메시지. `POST /api/organizations`에도 `termsAccepted` 미전송 시 400으로 거부하는 서버측 검증 추가(클라이언트 우회 방지). 랜딩 페이지 푸터에 두 링크 추가. `npx tsc --noEmit` 오류 0개, `npm run build` 성공(`/legal/terms`, `/legal/privacy` 정적 라우트 정상 생성 확인).
