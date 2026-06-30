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
