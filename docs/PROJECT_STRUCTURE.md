# High5 프로젝트 구조 문서

> **최종 업데이트** 2026-06-30
> **스택** Next.js 15 · Prisma 5 · PostgreSQL · NextAuth.js 4 · Zustand · MUI
>
> 이 문서는 코드 변경 시 항상 최신 상태로 유지된다. 작업 절차는 `.claude/skills/dev-workflow/SKILL.md`, 작업 이력은 `docs/HISTORY.md` 참고.

---

## 1. 사용자 역할 및 라우트 가드 (`src/middleware.ts`)

| 역할 | 코드 | 접근 가능 페이지 |
|---|---|---|
| 관리자 | `ADMIN` | 전체 |
| 기획자 | `PLANNER` | `/users` 제외 전체 |
| 작업자 | `WORKER` | `/stats`, `/users` 제외 |

```
/login          → 누구나 접근 가능
/dashboard      → 인증 필요 (전 역할)
/tasks/**       → 인증 필요 (전 역할)
/calendar       → 인증 필요 (전 역할)
/projects       → 인증 필요 (전 역할)
/info           → 인증 필요 (전 역할)
/profile/**     → 인증 필요 (전 역할)
/stats          → ADMIN, PLANNER만
/users          → ADMIN만
```

---

## 2. 데이터베이스 스키마 (`prisma/schema.prisma`)

```
User (1) ──< Task [planner / worker] (1) ──< TimeLog
User (1) ──< InfoItem
User (1) ──< TaskHistory
User (1) ──< UserNotification
User (M) ──< ProjectMember >── (M) Project (1) ──< Task
```

### User
| 필드 | 타입 | 비고 |
|---|---|---|
| id | Int PK | 자동 증가 |
| email | String UNIQUE | 로그인 이메일 |
| name | String | 표시명 |
| role | String | ADMIN / PLANNER / WORKER (기본 WORKER) |
| passwordHash | String | bcryptjs |
| isActive | Boolean | 계정 활성 여부 |
| leaveDate | DateTime? | 퇴사일 |
| affiliation | String? | 정규 / 프리 |
| createdAt / lastLoginAt | DateTime | |

### Task
| 필드 | 타입 | 비고 |
|---|---|---|
| id | Int PK | |
| rmsNo | String? | 제목에서 자동 파싱 ex) `DCBGIT-39085` |
| title | String | RMS 번호 제거 후 저장 |
| plannerId / workerId | Int FK | 담당 기획자 / 작업자 |
| status | String | ASSIGNED / PROGRESS / REVIEW / QA / DONE |
| targetDate | DateTime? | 목표 완료일 |
| isFreeze | Boolean | 배포 프리징 충돌 여부 |
| templateId | Int? | 템플릿 참조 |
| notes | String? | 비고 (그룹 업무는 null) |
| externalLink | String? | 연결된 GitHub PR 등 외부 링크 |
| projectId | Int? | 소속 프로젝트 |
| labels | String? | 콤마 구분 라벨 코드 (`URGENT`/`WEEKEND`/`EMERGENCY`) |
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
│   │   ├── projects/page.tsx
│   │   ├── stats/page.tsx
│   │   ├── users/page.tsx             # ADMIN 전용, "팀원관리" — 팀원 생성 시 임시 비밀번호를 모달로 안내, 소속 프로젝트는 체크박스로 선택
│   │   ├── profile/password/page.tsx
│   │   │
│   │   ├── tasks/
│   │   │   ├── page.tsx               # 목록 (필터 + 페이지네이션)
│   │   │   ├── create/page.tsx
│   │   │   ├── kanban/page.tsx
│   │   │   └── [id]/page.tsx          # 상세 + 타임로그 + 히스토리
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
│   │       │           ├── start/route.ts
│   │       │           └── [logId]/
│   │       │               ├── stop/route.ts
│   │       │               └── adjust/route.ts
│   │       ├── projects/
│   │       │   ├── route.ts
│   │       │   └── [id]/
│   │       │       ├── route.ts
│   │       │       └── members/route.ts
│   │       ├── info/
│   │       │   ├── route.ts
│   │       │   └── [id]/route.ts
│   │       ├── notifications/
│   │       │   ├── route.ts
│   │       │   └── read-all/route.ts
│   │       ├── stats/
│   │       │   ├── summary/route.ts
│   │       │   └── workload/route.ts
│   │       ├── calendar/
│   │       │   ├── ical/route.ts               # 구독용 iCal 피드
│   │       │   └── ical-url/route.ts           # 구독 URL 발급
│   │       └── webhooks/
│   │           ├── slack/route.ts              # Slack/잔디 알림 발송
│   │           └── github/route.ts             # GitHub PR merge 연동
│   │
│   ├── components/
│   │   ├── AppHeader.tsx              # 상단 GNB (메뉴, 프로필, 모바일 햄버거 토글) — 알림 벨 제거됨
│   │   ├── LayoutWrapper.tsx
│   │   ├── Providers.tsx              # SessionProvider + AuthSync
│   │   ├── common/
│   │   │   ├── Badge.tsx
│   │   │   └── Modal.tsx
│   │   ├── kanban/
│   │   │   ├── KanbanBoard.tsx
│   │   │   └── KanbanColumn.tsx
│   │   ├── task/
│   │   │   ├── TaskTimerButton.tsx
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
│   │   ├── useTimer.ts                # 타이머 시작/종료/경과시간
│   │   └── useFreeze.ts               # 배포 프리징 감지
│   │
│   ├── store/                         # Zustand 전역 상태
│   │   ├── authStore.ts               # 인증 상태 (persist, hasRole, isAdmin)
│   │   └── taskStore.ts               # 업무 목록 + 필터 + 낙관적 업데이트
│   │
│   ├── lib/
│   │   ├── db.ts                      # Prisma 클라이언트 싱글톤
│   │   ├── db-init.ts
│   │   ├── auth.ts                    # NextAuth 옵션 (CredentialsProvider)
│   │   ├── api-client.ts              # Axios 인스턴스 + 인터셉터
│   │   ├── webhook.ts                 # Slack·잔디·카카오 알림 발송
│   │   ├── notify.ts                  # 인앱 알림(UserNotification) 생성
│   │   ├── task-history.ts            # TaskHistory 기록 헬퍼
│   │   ├── ical-token.ts              # iCal 구독 토큰 서명/검증
│   │   ├── sanitize.ts                # HTML sanitize (react-quill 콘텐츠)
│   │   ├── constants.ts               # 상태/역할 상수, 컬러 매핑
│   │   ├── utils.ts                   # requireAuth, successResponse, parseRmsNo 등
│   │   └── services/
│   │       ├── task.service.ts        # 업무 생성, 상태 변경
│   │       ├── user.service.ts        # 사용자 초대·수정·비활성화
│   │       ├── stats.service.ts       # 월간 요약, 작업자 부하량 집계
│   │       └── webhook.service.ts     # notifyStatusChange (DB 기록 포함)
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

### 그룹 업무 / 하위 업무 (`/tasks/create`)
- 등록 폼에서 "그룹 업무로 등록" 체크 시 비고(Quill 에디터) 입력란이 사라지고 하위 업무(제목/담당자/목표일) 행을 여러 개 추가할 수 있다.
- `POST /api/tasks`에 `subTasks: [{ title, workerId, targetDate }]` 배열을 함께 보내면 부모 Task 생성 후 각 항목을 `parentTaskId`로 연결된 자식 Task로 생성한다. 라벨은 부모/자식 모두 동일하게 적용된다.

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

### 타이머 흐름 (`src/hooks/useTimer.ts`)
```
POST /tasks/[id]/timelogs/start          → startTime = NOW(), endTime = null
PATCH /tasks/[id]/timelogs/[logId]/stop  → endTime = NOW(), durationHours 자동 계산
PATCH /tasks/[id]/timelogs/[logId]/adjust → adjustedHours 보정, finalHours 갱신
```
- 진행 중 페이지 이탈 시 `beforeUnload` 경고, 새로고침 시 활성 타이머 자동 복원

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
| POST | `/api/tasks` | PLANNER+ | 업무 생성 |
| GET | `/api/tasks/calendar` | ALL | 월별 캘린더 데이터 |
| GET | `/api/tasks/export` | PLANNER+ | CSV/xlsx 다운로드 |
| GET/PATCH/DELETE | `/api/tasks/[id]` | ALL/PLANNER+/ADMIN | 업무 상세/수정/삭제 |
| PATCH | `/api/tasks/[id]/status` | ALL | 상태 변경 + 알림 트리거 |
| GET | `/api/tasks/[id]/history` | ALL | 업무 히스토리 |
| GET/POST | `/api/tasks/[id]/timelogs`, `/start` | ALL | 타임로그 조회/타이머 시작 |
| PATCH | `/api/tasks/[id]/timelogs/[logId]/stop` | ALL | 타이머 종료 |
| PATCH | `/api/tasks/[id]/timelogs/[logId]/adjust` | ALL | 공수 보정 |
| GET/POST | `/api/projects` | ALL/PLANNER+ | 프로젝트 목록/생성 |
| GET/PATCH/DELETE | `/api/projects/[id]` | ALL/PLANNER+/ADMIN | 프로젝트 상세/수정/삭제 |
| POST/DELETE | `/api/projects/[id]/members` | PLANNER+ | 프로젝트 멤버 관리 |
| GET/POST | `/api/info` | ALL/ADMIN | FAQ 목록/생성 |
| PATCH/DELETE | `/api/info/[id]` | ADMIN | FAQ 수정/삭제 |
| GET | `/api/notifications` | ALL | 인앱 알림 목록 |
| PATCH | `/api/notifications/read-all` | ALL | 알림 전체 읽음 처리 |
| GET | `/api/stats/summary` | PLANNER+ | 월간 요약 통계 |
| GET | `/api/stats/workload` | PLANNER+ | 작업자별 부하량 |
| GET | `/api/calendar/ical-url` | ALL | iCal 구독 URL 발급 |
| GET | `/api/calendar/ical` | 토큰 인증 | iCal 피드 |
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
