# High5 프로젝트 구조 문서

> **최종 업데이트** 2026-07-01
> **스택** Next.js 15 · Prisma 5 · PostgreSQL · NextAuth.js 4 · Zustand · MUI
>
> 이 문서는 코드 변경 시 항상 최신 상태로 유지된다. 작업 절차는 `.claude/skills/dev-workflow/SKILL.md`, 작업 이력은 `docs/HISTORY.md` 참고.

---

## 1. 사용자 역할 및 라우트 가드 (`src/middleware.ts`)

| 역할 | 코드 | 접근 가능 페이지 |
|---|---|---|
| 관리자 | `ADMIN` | 전체 |
| 리더 | `LEADER` | `/users` 제외 전체 (구 PLANNER/MANAGER — 2026-07-01 통일) |
| 작업자 | `WORKER` | `/stats`, `/users` 제외 |

```
/login          → 누구나 접근 가능
/dashboard      → 인증 필요 (전 역할)
/tasks/**       → 인증 필요 (전 역할)
/calendar       → 인증 필요 (전 역할)
/projects       → 인증 필요 (전 역할)
/info           → 인증 필요 (전 역할)
/profile/**     → 인증 필요 (전 역할)
/announcements  → 인증 필요 (전 역할 조회 가능, 작성/수정/삭제는 ADMIN/LEADER)
/requests       → 인증 필요 (전 역할)
/wiki           → 인증 필요 (전 역할, 소속 프로젝트 문서 모아보기 + 등록 허브)
/projects/[id]/wiki → 인증 필요 (해당 프로젝트 소속 멤버 또는 ADMIN만 조회 가능, middleware 레벨이 아닌 API `checkAccess`로 검증)
/projects/[id]/statuses → 인증 필요, 페이지 자체는 ADMIN/LEADER 전용(프로젝트별 업무 상태 단계 관리)
/settings/calendar-sync  → 인증 필요 (전 역할, 헤더 "설정" 메뉴는 ADMIN/LEADER에게만 노출되지만 URL 직접 접근은 인증만 요구)
/settings/integrations   → 인증 필요 + 페이지/‌API 모두 ADMIN 전용
/stats          → ADMIN, LEADER만
/users          → ADMIN만
```

> `/projects`, `/announcements`, `/settings/**`, `/info`는 `middleware.ts`의 `protectedRoutes`가 아니라 각 페이지의 `useAuth()` 훅 + API의 `requireAuth`/`requireRole`로 보호된다(다른 인증 필요 페이지와 동일한 기존 패턴).

---

## 2. 데이터베이스 스키마 (`prisma/schema.prisma`)

```
User (1) ──< Task [planner / worker] (1) ──< TimeLog
User (1) ──< InfoItem
User (1) ──< TaskHistory
User (1) ──< UserNotification
User (M) ──< ProjectMember >── (M) Project (1) ──< Task
User (1) ──< User [managerId 자기참조, 결재 라인]
User (1) ──< Announcement
User (1) ──< Request [requester / approver] (1) ──< Announcement (전결 시 자동 생성, 1:1)
```

### User
| 필드 | 타입 | 비고 |
|---|---|---|
| id | Int PK | 자동 증가 |
| email | String UNIQUE | 로그인 이메일 |
| name | String | 표시명 |
| role | String | ADMIN / LEADER / WORKER (기본 WORKER, 2026-07-01 이전 PLANNER·MANAGER 혼용을 LEADER로 통일) |
| passwordHash | String | bcryptjs |
| isActive | Boolean | 계정 활성 여부 |
| leaveDate | DateTime? | 퇴사일 |
| affiliation | String? | 정규 / 프리 |
| managerId | Int? | 결재 라인상의 담당 리더(User 자기참조). `/requests` 신청 시 결재자로 사용 |
| createdAt / lastLoginAt | DateTime | |

### Task
| 필드 | 타입 | 비고 |
|---|---|---|
| id | Int PK | |
| rmsNo | String? | 제목에서 자동 파싱 ex) `DCBGIT-39085` |
| title | String | RMS 번호 제거 후 저장 |
| plannerId / workerId | Int FK | 담당 기획자 / 작업자 |
| status | String | 프로젝트별 `ProjectStatus.code` 참조(FK 아님, 문자열 값만 저장). 프로젝트에 커스텀 단계가 없으면 기본값 ASSIGNED/PROGRESS/REVIEW/QA/DONE 사용 |
| targetDate | DateTime? | 목표 완료일 |
| isFreeze | Boolean | 배포 프리징 충돌 여부 |
| templateId | Int? | 템플릿 참조 |
| notes | String? | 비고 (그룹 업무는 null) |
| externalLink | String? | 연결된 GitHub PR 등 외부 링크 |
| projectId | Int? | 소속 프로젝트 |
| labels | String? | 콤마 구분 라벨 코드 (`URGENT`/`WEEKEND`/`EMERGENCY`) |
| isGroup | Boolean | 그룹 업무 여부 (하위 업무를 나중에 추가할 수 있는 부모 업무, 기본 false) |
| timeCounterEnabled | Boolean | 상태 변경에 따른 자동 시간 카운트 사용 여부 (기본 true) |
| parentTaskId | Int? | 그룹 업무의 하위 업무인 경우 부모 Task id (자기참조 관계 `subTasks`) |

### TimeLog
| 필드 | 타입 | 비고 |
|---|---|---|
| id | Int PK | |
| taskId / workerId | Int FK | |
| startTime | DateTime | 타이머 시작 |
| endTime | DateTime? | 타이머 종료 (진행 중이면 null) |
| durationHours | Float? | (endTime - startTime) 자동 계산 |
| adjustedHours | Float | 수동 보정값 (기본 0) |
| finalHours | Float? | durationHours + adjustedHours |

### Project / ProjectMember
| 필드 | 타입 | 비고 |
|---|---|---|
| Project.status | String | ACTIVE / CLOSED |
| Project.projectManagerName / projectLeadName | String? | 표시용 텍스트 필드 |
| ProjectMember | 복합키 (projectId, userId) | 프로젝트-사용자 매핑 |

### ProjectStatus
프로젝트별 업무 상태(칸반 단계) 정의. `projectId`, `code`(Task.status에 저장되는 값, `@@unique([projectId, code])`), `label`, `color`(hex, nullable), `order`, `isProgress`(자동 시간카운터 시작 트리거), `isDone`(완료 집계). 프로젝트에 이 테이블 row가 하나도 없으면 `src/lib/task-status.ts`의 `DEFAULT_STATUSES`(ASSIGNED/PROGRESS/REVIEW/QA/DONE)를 그 자리에서 합성해 반환한다 — 마이그레이션 없이도 기존 프로젝트가 그대로 동작하는 이유.

### Template
업무 생성 시 사용하는 기본 제목/가이드 텍스트 템플릿. `name`, `defaultTitle`, `defaultPlannerId`, `guideText`.

### Notification
외부 webhook(Slack/Jandi) 발송 기록. `channel`(SLACK/JANDI/EMAIL), `message`, `isSuccess`.

### UserNotification
인앱 알림 벨에 표시되는 알림. `type`(WORKER_ASSIGNED / REVIEW_REQUESTED / WORKER_CHANGED), `isRead`.

### TaskHistory
업무 활동 로그. `action`(CREATED / STATUS_CHANGED / WORKER_CHANGED / TIMER_START / TIMER_STOP / NOTE_UPDATED / TRANSFERRED), `detail`.

### InfoItem
`/info` 페이지에 노출되는 FAQ형 콘텐츠. `question`, `answer`, `order`, `isActive`.

### Announcement
헤더 하단 배너로 노출되는 공지. `content`, `authorId`(ADMIN/LEADER), `isActive`, `requestId?`(신청서에서 '공지로 등록'으로 자동 생성된 경우 연결, 1:1 unique). 프론트에서는 X로 닫으면 `localStorage`에 dismiss 기록(서버 상태는 유지, 새로고침해도 다시 안 보임).

### Request
휴가/비품 신청. `type`(LEAVE/SUPPLY), `title`, `content`(SUPPLY 품목/사유), `startDate`/`endDate`(LEAVE 전용), `isAnnouncement`(체크 시 전결), `status`(PENDING/APPROVED/REJECTED), `requesterId`, `approverId`(신청 시점 `requester.managerId` 스냅샷), `rejectReason`, `decidedAt`.

### WikiPage
프로젝트별 위키 문서. `projectId`, `title`, `content`(마크다운 라이트: `**굵게**`/`*기울임*`/`- 목록`), `authorId`. 조회/작성/수정은 해당 프로젝트 `ProjectMember` 또는 ADMIN만 가능(`checkAccess` — `/api/projects/[id]/wiki` 참고), 삭제는 작성자 본인 또는 ADMIN만 가능.

### Integration
채널별 외부연동(알림 발송) 설정. `channel`(SLACK/JANDI/TEAMS/TELEGRAM/KAKAO, unique), `webhookUrl`, `botToken`/`chatId`(TELEGRAM 전용), `isEnabled`. `src/lib/integrations.ts`가 DB에 저장된 값을 우선 사용하고, 해당 채널에 DB row가 아예 없을 때만 `.env`(`SLACK_WEBHOOK_URL` 등)로 폴백한다. `Notification` 모델(발송 로그)과는 별개로, 이 모델은 "어디로 보낼지"에 대한 설정만 저장한다.

---

## 3. 디렉터리 구조

```
high5/
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts                        # 초기 데이터 (admin 계정 포함)
│   └── init.ts                        # postbuild 초기화 스크립트
│
├── docs/
│   └── PROJECT_STRUCTURE.md           # 본 문서
│
├── src/
│   ├── middleware.ts                  # 라우트 보호 (역할별 접근 제어)
│   │
│   ├── app/
│   │   ├── layout.tsx / page.tsx / globals.css
│   │   ├── login/page.tsx
│   │   ├── dashboard/page.tsx
│   │   ├── info/page.tsx              # FAQ
│   │   ├── calendar/page.tsx
│   │   ├── stats/page.tsx
│   │   ├── users/page.tsx             # ADMIN 전용, "팀원관리" — 팀원 생성 시 임시 비밀번호를 모달로 안내, 소속 프로젝트는 체크박스로 선택, 담당 리더(managerId) 지정
│   │   ├── announcements/page.tsx     # ADMIN/LEADER 전용, 공지 등록/수정/게시중지/삭제 관리
│   │   ├── requests/page.tsx          # 전 역할, 휴가/비품 신청 + 내 신청 목록 + (ADMIN/LEADER) 결재함
│   │   ├── wiki/page.tsx              # 헤더 "위키" 메뉴 진입점(허브) — 소속 프로젝트 문서를 프로젝트별로 모아보기 + 프로젝트 선택 후 바로 문서 등록
│   │   ├── settings/
│   │   │   ├── calendar-sync/page.tsx     # 구글 캘린더 연동 안내 + 구독 URL 발급/복사 (전 역할, 헤더 메뉴는 ADMIN/LEADER 전용)
│   │   │   └── integrations/page.tsx      # ADMIN 전용, Slack/잔디/Teams/텔레그램/카카오톡 채널별 설정+테스트 발송
│   │   ├── profile/password/page.tsx
│   │   │
│   │   ├── tasks/
│   │   │   ├── page.tsx               # 목록 (필터 + 페이지네이션)
│   │   │   ├── create/page.tsx
│   │   │   ├── kanban/page.tsx
│   │   │   └── [id]/page.tsx          # 상세 + 타임로그 + 히스토리
│   │   │
│   │   ├── projects/
│   │   │   ├── page.tsx               # 프로젝트 목록/생성/멤버 관리, 선택 시 멤버 패널에 "위키"/"상태 관리"(ADMIN·LEADER) 링크 노출
│   │   │   └── [id]/
│   │   │       ├── wiki/page.tsx      # 프로젝트 위키 목록/작성/수정/삭제 (소속 멤버 또는 ADMIN만 접근, ?open=id로 특정 문서 자동 펼침)
│   │   │       └── statuses/page.tsx  # 프로젝트 업무 상태(칸반 단계) 관리 — 단계 추가/삭제/순서·색상·진행중·완료 플래그 편집 (ADMIN/LEADER 전용)
│   │   │
│   │   └── api/
│   │       ├── auth/
│   │       │   ├── [...nextauth]/route.ts
│   │       │   └── change-password/route.ts
│   │       ├── users/
│   │       │   ├── route.ts                   # GET 목록 / POST 생성
│   │       │   ├── [id]/route.ts               # PATCH / DELETE
│   │       │   ├── me/route.ts
│   │       │   └── invite/route.ts             # ADMIN 전용 초대
│   │       ├── tasks/
│   │       │   ├── route.ts                    # GET 목록 / POST 생성
│   │       │   ├── calendar/route.ts
│   │       │   ├── export/route.ts             # CSV/xlsx
│   │       │   └── [id]/
│   │       │       ├── route.ts                # GET / PATCH / DELETE
│   │       │       ├── status/route.ts         # PATCH 상태 변경 + 알림
│   │       │       ├── history/route.ts        # GET 업무 히스토리
│   │       │       └── timelogs/
│   │       │           ├── route.ts
│   │       │           └── [logId]/
│   │       │               └── adjust/route.ts
│   │       ├── projects/
│   │       │   ├── route.ts
│   │       │   ├── statuses/route.ts            # GET 접근 가능한 전체 프로젝트의 상태 단계 일괄 조회 (N+1 방지)
│   │       │   └── [id]/
│   │       │       ├── route.ts
│   │       │       ├── members/route.ts
│   │       │       ├── statuses/route.ts        # GET 단계 조회(기본값 폴백) / PUT 전체 저장 (ADMIN·LEADER)
│   │       │       └── wiki/
│   │       │           ├── route.ts            # GET 목록 / POST 작성 (소속 멤버 또는 ADMIN)
│   │       │           └── [wikiId]/route.ts   # PATCH 수정 / DELETE(작성자 본인·ADMIN)
│   │       ├── wiki/
│   │       │   └── search/route.ts             # GET?q= 소속 프로젝트(ADMIN은 전체) 위키 통합 검색, 플로팅 버튼에서 사용
│   │       ├── info/
│   │       │   ├── route.ts
│   │       │   └── [id]/route.ts
│   │       ├── announcements/
│   │       │   ├── route.ts                    # GET(활성/?all=true 관리용) / POST(ADMIN·LEADER)
│   │       │   └── [id]/route.ts               # PATCH / DELETE (작성자 본인 또는 ADMIN)
│   │       ├── requests/
│   │       │   ├── route.ts                    # GET(?scope=mine|approvals) / POST(휴가·비품 신청)
│   │       │   └── [id]/decision/route.ts      # PATCH 승인/반려
│   │       ├── notifications/
│   │       │   ├── route.ts
│   │       │   └── read-all/route.ts
│   │       ├── stats/
│   │       │   ├── summary/route.ts
│   │       │   └── workload/route.ts
│   │       ├── calendar/
│   │       │   ├── ical/route.ts               # 구독용 iCal 피드
│   │       │   └── ical-url/route.ts           # 구독 URL 발급
│   │       ├── settings/
│   │       │   └── integrations/
│   │       │       ├── route.ts                # GET 채널별 설정 목록 (ADMIN)
│   │       │       └── [channel]/
│   │       │           ├── route.ts            # PUT 채널 설정 저장 (ADMIN)
│   │       │           └── test/route.ts       # POST 테스트 메시지 발송 (ADMIN)
│   │       └── webhooks/
│   │           ├── slack/route.ts              # Slack/잔디 알림 발송
│   │           └── github/route.ts             # GitHub PR merge 연동
│   │
│   ├── components/
│   │   ├── AppHeader.tsx              # 상단 GNB (메뉴, 프로필, 모바일 햄버거 토글) — 알림 벨 제거됨. "신청"/"위키" 링크, "설정" 드롭다운(구 "관리")에 프로젝트/공지사항/팀원관리/통계/구글캘린더연동/외부연동(ADMIN)
│   │   ├── AnnouncementBanner.tsx     # 헤더 하단 공지 배너 — 활성 공지 조회, X로 닫으면 localStorage에 dismiss 기록
│   │   ├── WikiSearchButton.tsx       # 우하단 플로팅 버튼 — 클릭 시 위키 검색 모달, 결과 클릭 시 해당 프로젝트 위키로 이동
│   │   ├── LayoutWrapper.tsx
│   │   ├── Providers.tsx              # SessionProvider + AuthSync
│   │   ├── common/
│   │   │   ├── Badge.tsx
│   │   │   └── Modal.tsx
│   │   ├── kanban/
│   │   │   ├── KanbanBoard.tsx
│   │   │   └── KanbanColumn.tsx
│   │   ├── task/
│   │   │   ├── TaskStatusBadge.tsx
│   │   │   ├── TaskFilterBar.tsx
│   │   │   └── TaskAdjustForm.tsx
│   │   └── chart/
│   │       ├── TimeLogChart.tsx
│   │       └── WorkloadChart.tsx
│   │
│   ├── hooks/
│   │   ├── useAuth.ts                 # NextAuth 세션 + 역할 가드
│   │   ├── useTask.ts                 # 업무 CRUD
│   │   ├── useFreeze.ts               # 배포 프리징 감지
│   │   └── useProjectStatuses.ts      # GET /api/projects/statuses 일괄 조회 + projectId별 조회 헬퍼(getStatuses), tasks/kanban 등에서 공용
│   │
│   ├── store/                         # Zustand 전역 상태
│   │   ├── authStore.ts               # 인증 상태 (persist, hasRole, isAdmin, isLeader)
│   │   └── taskStore.ts               # 업무 목록 + 필터 + 낙관적 업데이트
│   │
│   ├── lib/
│   │   ├── db.ts                      # Prisma 클라이언트 싱글톤
│   │   ├── db-init.ts
│   │   ├── auth.ts                    # NextAuth 옵션 (CredentialsProvider)
│   │   ├── api-client.ts              # Axios 인스턴스 + 인터셉터
│   │   ├── integrations.ts            # 외부연동(Slack/잔디/Teams/텔레그램/카카오톡) DB우선·.env폴백 발송 로직, 테스트 발송
│   │   ├── webhook.ts                 # 업무 상태 변경 시 notifyStatusChange → integrations.ts로 전 채널 동시 발송
│   │   ├── notify.ts                  # 인앱 알림(UserNotification) 생성
│   │   ├── task-status.ts             # DEFAULT_STATUSES + getProjectStatuses/resolveStatus/isValidStatus — 프로젝트별 상태 조회의 단일 소스(서버 전용)
│   │   ├── task-history.ts            # TaskHistory 기록 헬퍼
│   │   ├── ical-token.ts              # iCal 구독 토큰 서명/검증
│   │   ├── sanitize.ts                # HTML sanitize (react-quill 콘텐츠)
│   │   ├── constants.ts               # 상태/역할 상수, 컬러 매핑
│   │   ├── utils.ts                   # requireAuth, successResponse, parseRmsNo 등
│   │   └── services/
│   │       ├── task.service.ts        # 업무 생성, 상태 변경
│   │       ├── user.service.ts        # 사용자 초대·수정·비활성화
│   │       ├── stats.service.ts       # 월간 요약, 작업자 부하량 집계
│   │       └── webhook.service.ts     # notifyWorkerChange/notifyReviewRequest용 notifyStatusChange (Slack/잔디, DB 기록 포함, integrations.ts의 getWebhookUrl 사용)
│   │
│   └── types/
│       ├── index.ts                   # 전체 타입 (User, Task, TimeLog 등)
│       └── next-auth.d.ts             # NextAuth 세션 타입 확장
```

---

## 4. 핵심 비즈니스 로직

### RMS 번호 자동 파싱 (`src/lib/utils.ts`)
```
입력: "[DCBGIT-39085] 구글 원 2TB 상품 정보 수정"
출력: { rmsNo: "DCBGIT-39085", cleanTitle: "구글 원 2TB 상품 정보 수정" }
패턴: /\[([A-Z]+-\d+)\]/
```

### 그룹 업무 / 하위 업무
- **등록 (`/tasks/create`)**: "그룹 업무로 등록" 체크 시 비고(Quill 에디터) 입력란이 사라지고 하위 업무(제목/담당자/목표일) 행을 여러 개 추가할 수 있다. 하위 업무를 0건만 등록해도(체크만 하고 비워둠) 그룹으로 생성된다(`Task.isGroup = true`).
  - `POST /api/tasks`에 `subTasks: [{ title, workerId, targetDate }]` 배열을 함께 보내면 부모 Task 생성 후 각 항목을 `parentTaskId`로 연결된 자식 Task로 생성한다. 라벨은 부모/자식 모두 동일하게 적용된다.
- **이후 하위 업무 추가**: `/tasks/create?parentTaskId={groupId}` 형태로 접속하면 등록 폼이 "하위 업무 등록" 모드로 전환된다. 그룹/비고 UI 대신 상단에 "상위 그룹: {부모 업무명}" 고정 표시가 나타나고, 단일 업무 등록 시 `POST /api/tasks`에 `parentTaskId`만 함께 전달해 해당 그룹의 자식 Task 1건으로 생성한다.
  - `POST /api/tasks`는 요청 바디에 `parentTaskId`가 있으면 위 단일 자식 생성 경로로, 없으면 기존 그룹+`subTasks` 일괄 생성 경로로 분기한다.
- **목록 (`/tasks`)**: 부모가 없는(최상위) 업무만 1차 행으로 표시되고, `isGroup === true`이거나 하위 업무가 있는 행은 구글시트처럼 ▶/▼ 토글로 하위 업무를 펼치고 접을 수 있다. `isGroup === true`인 행에는 "+ 하위 업무" 버튼이 노출되며 `/tasks/create?parentTaskId=...`로 이동한다.

### 업무 라벨 (`긴급`/`주말대응`/`비상`)
- `src/lib/constants.ts`의 `TASK_LABEL_LIST`/`TASK_LABEL_TEXT`/`TASK_LABEL_COLOR`로 정의.
- 등록 폼에서 체크박스로 다중 선택, `Task.labels`에 콤마 구분 문자열로 저장.

### 업무 상태 전이 및 알림 트리거
```
ASSIGNED → PROGRESS → REVIEW → QA → DONE
```
- `PATCH /api/tasks/[id]/status` 호출 시 상태 저장 후 `notifyStatusChange()` 비동기 실행 → Slack/잔디/카카오 webhook + `TaskHistory` 기록
- 담당자 변경/검수 요청 시 `src/lib/notify.ts`가 `UserNotification`(인앱 알림 벨)도 함께 생성

### GitHub PR 연동 (`src/app/api/webhooks/github/route.ts`)
- `Task.externalLink`에 등록된 PR URL이 머지되면 GitHub webhook(`pull_request` 이벤트, `x-hub-signature-256` 서명 검증)이 해당 업무를 갱신하고 히스토리에 기록

### 자동 시간 카운트 흐름 (`PATCH /api/tasks/[id]/status`)
업무의 `timeCounterEnabled`가 true인 경우, 상태 변경 시 자동으로 타임로그가 시작/종료된다 (수동 시작/종료 버튼 없음). 리터럴 `'PROGRESS'` 문자열이 아니라 해당 업무가 속한 프로젝트의 `ProjectStatus.isProgress` 플래그로 판단한다(커스텀 상태 대응).
```
status → isProgress=true 단계 (이전 상태가 isProgress=false였던 경우) → TimeLog 생성 (startTime = NOW())
status → isProgress=false 단계 (이전 상태가 isProgress=true였던 경우) → 활성 TimeLog 종료 (endTime = NOW(), durationHours 자동 계산)
PATCH /tasks/[id]/timelogs/[logId]/adjust → adjustedHours 보정, finalHours 갱신
```
- 업무 등록 시 "시간카운터 사용" 체크박스(기본 true)로 업무별 자동 카운트 여부 결정
- `timeCounterEnabled`가 false인 업무는 상태가 바뀌어도 타임로그가 생성/종료되지 않음

### 프로젝트별 업무 상태 (`/projects/[id]/statuses`, `src/lib/task-status.ts`)
- 기존에는 ASSIGNED/PROGRESS/REVIEW/QA/DONE 5단계가 전체 프로젝트에 고정되어 있었으나, 프로젝트마다 단계 수·이름·순서·색상을 자유롭게 구성할 수 있도록 `ProjectStatus` 모델을 도입했다.
- **폴백 원칙**: 프로젝트에 `ProjectStatus` row가 하나도 없으면(기존 프로젝트 포함) `getProjectStatuses()`가 그 자리에서 기본 5단계를 합성해 반환 — 별도 데이터 마이그레이션 없이 기존 프로젝트가 그대로 동작한다. `/projects/[id]/statuses`에서 저장하는 순간부터 그 프로젝트는 커스텀 목록을 갖는다.
- 업무 생성 시 초기 상태는 하드코딩된 `'ASSIGNED'`가 아니라 프로젝트 상태 목록의 첫 번째 단계(`order` 오름차순)로 설정된다.
- `PATCH /api/tasks/[id]/status`, `PATCH /api/tasks/[id]`의 상태값 검증은 고정 배열이 아니라 업무가 속한 프로젝트의 현재 상태 목록을 조회해 동적으로 검사한다.
- **칸반 보드**(`/tasks/kanban`)에 프로젝트 선택 드롭다운이 추가됨: 프로젝트를 선택하면 그 프로젝트의 단계가 컬럼이 되고, "전체 프로젝트"를 보면 실제 사용 중인 상태 코드를 모아 컬럼을 동적으로 구성한다. 단계가 삭제되는 등 컬럼 목록에 없는 상태값을 가진 업무는 "기타" 컬럼에 모인다.
- **업무 목록**(`/tasks`)의 상태 필터/행별 상태 변경 셀렉트도 각 업무가 속한 프로젝트의 상태 목록을 사용(`useProjectStatuses` 훅으로 `GET /api/projects/statuses` 일괄 조회 후 클라이언트에서 매핑). 필터 바 맨 앞에 "프로젝트" 드롭다운(`GET /api/projects`로 소속 프로젝트만 조회, ADMIN은 전체)이 있어 여러 프로젝트에 소속된 사용자도 다른 프로젝트의 업무로 바로 전환해 볼 수 있다(소속 프로젝트가 없으면 드롭다운 자체가 숨겨짐).
- **스코프 경계(의도적으로 남겨둔 부분)**: `/stats` 요약의 배정됨/진행중/검수/QA 4개 세부 카드는 여전히 리터럴 코드(`'ASSIGNED'` 등) 기준으로 집계 — 커스텀 상태를 쓰는 프로젝트의 업무는 이 4개 카드에는 잡히지 않는다(단, `total`/`done`/`completionRate`는 `isDone` 플래그 기반으로 일반화되어 정확함). 대시보드의 업무 카드 상태 라벨, 캘린더의 업무 칩 배경색도 기본 5단계 기준 매핑을 유지하며 커스텀 코드는 원문 그대로 표시되거나 중립색으로 대체된다(깨지지는 않음). 필요 시 후속 작업으로 확장 가능.

### 인증 흐름
```
로그인 → NextAuth CredentialsProvider → bcryptjs 검증
       → JWT 생성 (id, email, name, role)
       → Providers.tsx의 AuthSync가 Zustand authStore에 세션 동기화
       → middleware.ts에서 JWT 검증 후 역할별 라우트 접근 제어
```

### 캘린더 구독 (iCal)
- `GET /api/calendar/ical-url` → 사용자별 서명 토큰이 포함된 구독 URL 발급
- `GET /api/calendar/ical?token=...` → 토큰 검증 후 본인 업무의 `targetDate` 기준 `.ics` 피드 생성

### 공지 (`/announcements`, `AnnouncementBanner.tsx`)
- ADMIN/LEADER가 `POST /api/announcements`로 공지를 등록하면 헤더 하단 배너(`AnnouncementBanner`, `LayoutWrapper`에 삽입)에 전 역할에게 노출된다.
- X 클릭 시 서버 상태는 유지한 채 브라우저 `localStorage`(`dismissedAnnouncementIds`)에 기록하여 해당 브라우저에서만 다시 보이지 않는다.
- `/announcements` 관리 페이지: ADMIN은 전체 공지를, LEADER는 본인이 작성한 공지만 조회/수정/게시중지/삭제할 수 있다.

### 신청 & 결재 (`/requests`)
- 전 역할이 휴가(`LEAVE`)/비품(`SUPPLY`) 신청을 등록할 수 있다 (`POST /api/requests`).
  - `LEAVE`는 `startDate`/`endDate` 필수, `SUPPLY`는 `content`(품목/사유) 필수.
- **전결**: ADMIN/LEADER만 신청 폼에서 "공지로 등록" 체크박스를 사용할 수 있다. 체크 시 결재 절차 없이 `status='APPROVED'`로 즉시 확정(`approverId`=본인)되고, 동시에 `Announcement`가 자동 생성되어 공지 배너에도 게시된다. WORKER가 API를 직접 호출해 `isAnnouncement:true`를 보내도 서버에서 무시하고 일반 결재 절차로 처리한다.
- **일반 결재**: 체크하지 않으면 `status='PENDING'`, `approverId`는 신청자의 `User.managerId` 스냅샷으로 설정된다. 담당 리더가 지정되지 않은 경우(`managerId` null) ADMIN이 결재함에서 대신 처리할 수 있다.
- 결재자는 `/requests` 페이지의 "결재 대기" 섹션에서 `PATCH /api/requests/[id]/decision`으로 승인/반려한다. 반려 시 사유 입력 필수.
- **캘린더 반영**: `GET /api/tasks/calendar`가 해당 월과 겹치는 `status='APPROVED'`인 `LEAVE` 신청을 조회해 `leavesByDate`로 함께 반환하고, `/calendar` 페이지가 각 날짜 셀에 휴가자 이름을 표시한다(전결/일반 결재 승인 여부와 무관하게 APPROVED이면 모두 표시).

### 프로젝트 위키 (`/wiki`, `/projects/[id]/wiki`, `WikiSearchButton.tsx`)
- 헤더 상단 "위키" 메뉴 → `/wiki` 허브 페이지: 소속된 모든 프로젝트(ADMIN은 전체)의 위키 문서를 `GET /api/wiki/search?q=`(빈 쿼리 = 전체 목록, 최대 100건)로 한 번에 불러와 프로젝트별로 묶어 보여주고, 상단 "+ 문서 등록" 버튼으로 프로젝트를 선택해 바로 문서를 작성할 수 있다. 소속 프로젝트가 없으면 문서 등록 자체가 불가능하다는 안내를 표시한다.
- 프로젝트 목록(`/projects`)에서 프로젝트를 선택하면 멤버 패널에도 "📖 프로젝트 위키" 링크가 노출된다(특정 프로젝트로 바로 진입하는 보조 경로).
- `GET/POST /api/projects/[id]/wiki`, `PATCH/DELETE /api/projects/[id]/wiki/[wikiId]` 모두 해당 프로젝트 `ProjectMember` 또는 ADMIN만 호출 가능(`checkAccess`) — 소속되지 않은 사용자는 조회 자체가 403으로 차단된다. 삭제만 작성자 본인 또는 ADMIN으로 추가 제한.
- 문서 내용은 `**굵게**`/`*기울임*`/`- 목록`을 지원하는 라이트 마크다운(`/info` FAQ 에디터와 동일한 렌더링 로직을 위키 페이지/허브에 맞춰 재구현).
- **플로팅 검색**: 로그인 후 모든 페이지 우하단에 `WikiSearchButton`이 떠 있고, 클릭하면 검색 모달이 열린다. `GET /api/wiki/search?q=`가 요청자가 속한 프로젝트(ADMIN은 전체)의 위키만 제목/내용 부분일치로 검색해 반환하며, 결과를 클릭하면 `/projects/[projectId]/wiki?open=[wikiId]`로 이동해 해당 문서를 자동으로 펼쳐 보여준다.

### 외부연동 (`/settings/integrations`, `src/lib/integrations.ts`)
- ADMIN이 채널(Slack/잔디/Microsoft Teams/텔레그램/카카오톡)별로 Webhook URL(또는 텔레그램은 봇 토큰+Chat ID)을 저장하고 사용 여부를 토글할 수 있다. 저장 전 "테스트 발송" 버튼으로 실제 값을 즉시 검증 가능(`POST /api/settings/integrations/[channel]/test`).
- `getWebhookUrl`/`sendToChannel`/`broadcastNotification`은 **DB(`Integration` 테이블)에 저장된 값을 우선** 사용하고, 해당 채널에 DB row가 아예 없을 때만 `.env`(`SLACK_WEBHOOK_URL` 등 기존 변수)로 폴백한다 — 즉 UI에서 한 번이라도 저장하면 그 값이 `.env`보다 우선한다.
- 업무 상태가 변경되면(`PATCH /api/tasks/[id]/status`) `src/lib/webhook.ts`의 `notifyStatusChange`가 활성화된 5개 채널 전체에 동시 발송한다(기존에는 Slack/잔디/카카오톡 3개만 개별 함수로 하드코딩되어 있었음).
- 헤더 "설정" 드롭다운의 "외부연동" 메뉴 항목은 ADMIN에게만 노출(LEADER도 다른 설정 메뉴는 보이지만 이 항목은 보이지 않음), 페이지/API 모두 ADMIN 권한을 재검증한다.

---

## 5. API 전체 목록

| 메서드 | 엔드포인트 | 권한 | 설명 |
|---|---|---|---|
| POST | `/api/auth/[...nextauth]` | 공개 | 로그인/로그아웃 |
| POST | `/api/auth/change-password` | ALL | 비밀번호 변경 |
| GET | `/api/users` | ADMIN (단, `?role=WORKER` 조회는 인증된 전 역할 허용 — 업무 담당자 배정 드롭다운용) | 사용자 목록 |
| POST | `/api/users` | ADMIN | 사용자 생성 |
| PATCH/DELETE | `/api/users/[id]` | ADMIN | 사용자 수정/비활성화 |
| GET | `/api/users/me` | ALL | 내 정보 |
| POST | `/api/users/invite` | ADMIN | 사용자 초대 |
| GET | `/api/tasks` | ALL | 업무 목록 (필터+페이지네이션) |
| POST | `/api/tasks` | LEADER+ | 업무 생성 |
| GET | `/api/tasks/calendar` | ALL | 월별 캘린더 데이터 |
| GET | `/api/tasks/export` | LEADER+ | CSV/xlsx 다운로드 |
| GET/PATCH/DELETE | `/api/tasks/[id]` | ALL/LEADER+/ADMIN | 업무 상세/수정/삭제 |
| PATCH | `/api/tasks/[id]/status` | ALL | 상태 변경 + 알림 트리거 |
| GET | `/api/tasks/[id]/history` | ALL | 업무 히스토리 |
| GET | `/api/tasks/[id]/timelogs` | ALL | 타임로그 조회 (자동 시작/종료는 status route에서 처리) |
| PATCH | `/api/tasks/[id]/timelogs/[logId]/adjust` | ALL | 공수 보정 |
| GET/POST | `/api/projects` | ALL/LEADER+ | 프로젝트 목록/생성 |
| GET/PATCH/DELETE | `/api/projects/[id]` | ALL/LEADER+/ADMIN | 프로젝트 상세/수정/삭제 |
| POST/DELETE | `/api/projects/[id]/members` | LEADER+ | 프로젝트 멤버 관리 |
| GET | `/api/projects/statuses` | ALL | 접근 가능한 전체 프로젝트의 상태 단계 일괄 조회 |
| GET/PUT | `/api/projects/[id]/statuses` | ALL(GET) / LEADER+(PUT) | 프로젝트 상태 단계 조회(기본값 폴백)/전체 저장 |
| GET/POST | `/api/projects/[id]/wiki` | 소속 멤버 또는 ADMIN | 프로젝트 위키 목록/작성 |
| PATCH/DELETE | `/api/projects/[id]/wiki/[wikiId]` | 소속 멤버 또는 ADMIN (삭제는 작성자·ADMIN만) | 위키 문서 수정/삭제 |
| GET | `/api/wiki/search` | ALL (소속 프로젝트 범위, ADMIN은 전체) | 위키 통합 검색 (`?q=`) |
| GET/POST | `/api/info` | ALL/ADMIN | FAQ 목록/생성 |
| PATCH/DELETE | `/api/info/[id]` | ADMIN | FAQ 수정/삭제 |
| GET | `/api/announcements` | ALL (`?all=true`는 ADMIN/LEADER 전용, 비활성 포함) | 공지 목록 |
| POST | `/api/announcements` | LEADER+ | 공지 등록 |
| PATCH/DELETE | `/api/announcements/[id]` | 작성자 본인 또는 ADMIN | 공지 수정/삭제 |
| GET | `/api/requests` | ALL (`?scope=mine`\|`approvals`) | 신청 목록 (내 신청 / 결재 대기) |
| POST | `/api/requests` | ALL | 휴가/비품 신청 (`isAnnouncement`는 LEADER+ 만 유효) |
| PATCH | `/api/requests/[id]/decision` | 지정된 결재자 또는 (결재자 미지정 시) ADMIN | 승인/반려 |
| GET | `/api/notifications` | ALL | 인앱 알림 목록 |
| PATCH | `/api/notifications/read-all` | ALL | 알림 전체 읽음 처리 |
| GET | `/api/stats/summary` | LEADER+ | 월간 요약 통계 |
| GET | `/api/stats/workload` | LEADER+ | 작업자별 부하량 |
| GET | `/api/calendar/ical-url` | ALL | iCal 구독 URL 발급 |
| GET | `/api/calendar/ical` | 토큰 인증 | iCal 피드 |
| GET | `/api/settings/integrations` | ADMIN | 외부연동 채널별 설정 목록 |
| PUT | `/api/settings/integrations/[channel]` | ADMIN | 채널 설정 저장 |
| POST | `/api/settings/integrations/[channel]/test` | ADMIN | 테스트 메시지 발송 |
| POST | `/api/webhooks/slack` | 내부 | Slack/잔디 알림 발송 |
| POST | `/api/webhooks/github` | 서명 검증 | GitHub PR merge 연동 |

---

## 6. 환경변수 (`.env.local`)

| 키 | 필수 | 설명 |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL 연결 URL |
| `NEXTAUTH_SECRET` | ✅ | JWT 서명 시크릿 (32자 이상) |
| `NEXTAUTH_URL` | ✅ | 서비스 베이스 URL |
| `NEXT_PUBLIC_API_BASE_URL` | ✅ | 클라이언트 API base URL |
| `SLACK_WEBHOOK_URL` | ⬜ | Slack 알림 Webhook URL |
| `JANDI_WEBHOOK_URL` | ⬜ | 잔디 알림 Webhook URL |
| `KAKAO_WEBHOOK_URL` / `KAKAO_ACCESS_TOKEN` | ⬜ | 카카오톡 알림 |
| `GITHUB_WEBHOOK_SECRET` | ⬜ | GitHub webhook 서명 검증 시크릿 |

---

## 7. 개발 스크립트

```bash
npm run dev          # 개발 서버 실행 (localhost:3000)
npm run build        # prisma generate + db push + next build
npm start             # 프로덕션 서버 실행 (PORT 환경변수 사용)
npm run db:push      # Prisma 스키마 → DB 반영
npm run db:migrate   # 마이그레이션 dev 모드
npm run db:seed      # 초기 데이터 삽입 (admin 계정 생성)
npm run db:studio    # Prisma Studio 실행
npm run lint          # ESLint 실행
```

---

## 7-1. 배포 (Railway)

- `railway.json`에 빌드/스타트 커맨드와 헬스체크(`GET /api/health`) 설정이 정의되어 있다.
- `npm run build` 자체가 `prisma generate && prisma db push --skip-generate && next build`이므로, Railway에 push할 때마다 빌드 단계에서 `prisma/schema.prisma`가 자동으로 DB에 반영된다(별도 마이그레이션 명령 불필요).
- Railway 프로젝트에 Postgres 플러그인을 추가하면 `DATABASE_URL`이 서비스에 자동 주입된다. `NEXTAUTH_SECRET`/`NEXTAUTH_URL`/`NEXT_PUBLIC_API_BASE_URL`은 직접 설정해야 한다.
- `postbuild`(`prisma/init.ts`)가 배포마다 `admin@admin.co.kr` 관리자 계정을 upsert한다. 자세한 절차는 `README.md`의 "Railway 배포" 절 참고.

---

## 8. 디자인 시스템

### 컬러 팔레트 (`src/app/globals.css`)

| 변수 | 값 | 용도 |
|---|---|---|
| `--color-primary` | `#5E6AD2` | 주요 버튼, 헤더 배경 |
| `--color-primary-dark` | `#4B55BF` | hover 상태 |
| `--color-primary-light` | `#EEF0FF` | 카드 배경, 선택 행 |
| `--color-success` | `#059669` | DONE 상태 |
| `--color-warning` | `#D97706` | REVIEW, 프리징 경고 |
| `--color-danger` | `#DC2626` | 삭제, 오류 |

### 상태별 뱃지 컬러 (`src/lib/constants.ts`)

| 상태 | 텍스트 | 보더 |
|---|---|---|
| ASSIGNED | `#1D4ED8` | `#93C5FD` |
| PROGRESS | `#92400E` | `#FCD34D` |
| REVIEW | `#5B21B6` | `#C4B5FD` |
| QA | `#155E75` | `#67E8F9` |
| DONE | `#065F46` | `#6EE7B7` |
