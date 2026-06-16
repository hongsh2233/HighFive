# 맞춤형 업무 관리 시스템 (TMS) — 개발 기술 문서

> **버전** v2.0 (Next.js 기반 풀스택) | **기술 스택** Next.js 14 · Prisma · PostgreSQL · Material-UI · CSS Modules  
> **대상** 풀스택 개발자, 기획자

---

## 목차

1. [프로젝트 개요](#1-프로젝트-개요)
2. [데이터베이스 설계](#2-데이터베이스-설계-postgresql)
3. [API 명세](#3-api-명세-nestjs-rest-api)
4. [프론트엔드 컴포넌트 구조](#4-프론트엔드-컴포넌트-구조-vuejs-3)
5. [디자인 가이드](#5-디자인-가이드)
6. [백엔드 모듈 구조](#6-백엔드-모듈-구조-nestjs)
7. [에러 코드 정의](#7-에러-코드-정의)
8. [환경변수 설정](#8-환경변수-설정-env)
9. [개발 로드맵](#9-단계별-개발-로드맵)
10. [비기능 요구사항](#10-비기능-요구사항)

---

## 1. 프로젝트 개요

### 1.1 목적 및 배경

기존 Jira, Notion 등 대형 협업 툴의 과도한 복잡성을 해소하고, AI 기반 웹 개발 비즈니스에 최적화된 **경량 업무 관리 플랫폼**을 구축합니다.

| 비교 대상 | 기존 문제 | TMS 해결 방향 |
|---|---|---|
| Jira | 불필요한 워크플로우 매핑, 설정 피로 | 단일 클릭 상태 전환, Zero-Config |
| Notion | UI 관리 리소스 소모, 자유도 과다 | 고정 그리드·칸반·캘린더 뷰 |

### 1.2 핵심 지향점

- **설정 최소화(Zero-Configuration)** — 별도 세팅 없이 즉시 사용 가능
- **실시간 타임 트래킹** — 원클릭 시작/종료로 정확한 공수 측정
- **외부 연동** — Slack, Figma, GitHub 등과 즉시 연결
- **AI 지원** — 반복 업무 자동화 및 지능형 알림

### 1.3 사용자 역할 (Role)

| 역할 | 코드 | 주요 권한 |
|---|---|---|
| 관리자 | `ADMIN` | 전체 모니터링, 사용자 초대/승인, 데이터 익스포트 |
| 기획자 | `PLANNER` | 업무 생성/배정, 검수 승인, 배포 일정 제어 |
| 작업자 | `WORKER` | 배정 업무 확인, 타이머 작동, 상태 변경 |

---

## 2. 데이터베이스 설계 (PostgreSQL)

### 2.1 ERD 관계 구조

```
Users (1) ──< Tasks (1) ──< TimeLogs
              Tasks (1) ──< Notifications
              Templates (1) ──< Tasks
```

### 2.2 Users 테이블

| 필드명 | 타입 | 제약조건 | 설명 |
|---|---|---|---|
| `user_id` | SERIAL | PRIMARY KEY | 고유 사용자 ID (자동증가) |
| `email` | VARCHAR(100) | UNIQUE, NOT NULL | 로그인 이메일 (인덱스 적용) |
| `name` | VARCHAR(50) | NOT NULL | 사용자 표시명 |
| `role` | ENUM | NOT NULL, DEFAULT 'WORKER' | 'ADMIN', 'PLANNER', 'WORKER' |
| `password_hash` | VARCHAR(255) | NOT NULL | bcrypt 해시 저장 |
| `is_active` | BOOLEAN | DEFAULT true | 계정 활성/비활성 상태 |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | 가입 일시 (시간대 포함) |
| `last_login_at` | TIMESTAMPTZ | NULLABLE | 마지막 로그인 일시 |

```sql
-- 인덱스
CREATE UNIQUE INDEX idx_users_email ON users(email);
```

### 2.3 Tasks 테이블

| 필드명 | 타입 | 제약조건 | 설명 |
|---|---|---|---|
| `task_id` | SERIAL | PRIMARY KEY | 고유 업무 ID |
| `rms_no` | VARCHAR(50) | NULLABLE | 자동 파싱된 RMS 번호 |
| `title` | VARCHAR(255) | NOT NULL | 업무 제목 |
| `planner_id` | INT | FK → users | 담당 기획자 ID |
| `worker_id` | INT | FK → users | 담당 작업자 ID |
| `status` | ENUM | NOT NULL, DEFAULT 'ASSIGNED' | ASSIGNED / PROGRESS / REVIEW / QA / DONE |
| `target_date` | DATE | NULLABLE | 목표 완료/배포일 |
| `is_freeze` | BOOLEAN | DEFAULT false | 배포 프리징 충돌 여부 플래그 |
| `template_id` | INT | FK → templates, NULLABLE | 생성에 사용된 템플릿 ID |
| `notes` | TEXT | NULLABLE | 비고 및 특이사항 |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | 생성 일시 |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | 최종 수정 일시 (트리거 자동 갱신) |

```sql
-- 복합 인덱스
CREATE INDEX idx_tasks_worker_status ON tasks(worker_id, status);
CREATE INDEX idx_tasks_target_date   ON tasks(target_date);
CREATE INDEX idx_tasks_rms_no        ON tasks(rms_no) WHERE rms_no IS NOT NULL;
```

### 2.4 TimeLogs 테이블

| 필드명 | 타입 | 제약조건 | 설명 |
|---|---|---|---|
| `log_id` | SERIAL | PRIMARY KEY | 로그 고유 ID |
| `task_id` | INT | FK → tasks, NOT NULL | 연관 업무 ID |
| `worker_id` | INT | FK → users, NOT NULL | 작업자 ID (명시적 저장) |
| `start_time` | TIMESTAMPTZ | NOT NULL | 업무 시작 타임스탬프 |
| `end_time` | TIMESTAMPTZ | NULLABLE | 업무 종료 타임스탬프 (진행 중이면 NULL) |
| `duration_hours` | FLOAT | NULLABLE, 계산값 | (end − start) 자동 계산 (Hour 단위) |
| `adjusted_hours` | FLOAT | DEFAULT 0.0 | 수동 보정 시간 (+/−) |
| `final_hours` | FLOAT | 계산 컬럼 | duration_hours + adjusted_hours |

### 2.5 추가 테이블 (신규 제안)

#### Templates (업무 템플릿)

| 필드명 | 타입 | 설명 |
|---|---|---|
| `template_id` | SERIAL PK | 템플릿 고유 ID |
| `name` | VARCHAR(100) NOT NULL | 템플릿 이름 (예: 정기 배너 교체) |
| `default_title` | VARCHAR(255) NOT NULL | 기본 업무 제목 형식 |
| `default_planner_id` | INT FK NULLABLE | 기본 담당 기획자 |
| `guide_text` | TEXT NULLABLE | 기본 가이드/노트 내용 |

#### Notifications (알림 로그)

| 필드명 | 타입 | 설명 |
|---|---|---|
| `noti_id` | SERIAL PK | 알림 고유 ID |
| `task_id` | INT FK | 연관 업무 ID |
| `channel` | VARCHAR(20) NOT NULL | 'SLACK', 'JANDI', 'EMAIL' |
| `message` | TEXT NOT NULL | 발송된 알림 메시지 |
| `sent_at` | TIMESTAMPTZ DEFAULT NOW() | 발송 시각 |
| `is_success` | BOOLEAN DEFAULT false | 발송 성공 여부 |

---

## 3. API 명세 (NestJS REST API)

> **Base URL** `/api/v1`  
> **인증** 모든 API는 `Authorization: Bearer <JWT>` 헤더 필요 (로그인 제외)  
> **공통 응답 형식**:
> ```json
> {
>   "success": true,
>   "data": { ... },
>   "message": "OK",
>   "timestamp": "2025-06-01T09:00:00Z"
> }
> ```

### 3.1 인증 API `/auth`

| 메서드 | 엔드포인트 | 요청 Body | 응답 Data | 설명 |
|---|---|---|---|---|
| `POST` | `/auth/login` | `{ email, password }` | `{ access_token, refresh_token, user }` | 로그인 (JWT 발급) |
| `POST` | `/auth/refresh` | `{ refresh_token }` | `{ access_token }` | 액세스 토큰 갱신 |
| `POST` | `/auth/logout` | — (JWT 헤더) | `{ message }` | 로그아웃 (토큰 무효화) |

### 3.2 사용자 API `/users`

| 메서드 | 엔드포인트 | 요청 | 응답 | 설명 / 권한 |
|---|---|---|---|---|
| `GET` | `/users` | `?role=WORKER` | `User[]` | 전체 사용자 목록 **[ADMIN]** |
| `POST` | `/users/invite` | `{ email, role }` | `{ user_id }` | 신규 사용자 초대 **[ADMIN]** |
| `GET` | `/users/me` | — | `User + tasks` | 내 정보 + 진행 업무 **[ALL]** |
| `PATCH` | `/users/:id` | `{ name, role }` | `User` | 사용자 정보 수정 **[ADMIN]** |
| `PATCH` | `/users/:id/deactivate` | — | `User` | 계정 비활성화 **[ADMIN]** |

### 3.3 업무(Task) API `/tasks`

| 메서드 | 엔드포인트 | 요청 | 응답 | 설명 / 권한 |
|---|---|---|---|---|
| `GET` | `/tasks` | `?status=&worker_id=&page=&limit=` | `{ data: Task[], total, page }` | 업무 목록 (페이지네이션) **[ALL]** |
| `POST` | `/tasks` | `{ title, worker_id, target_date, ... }` | `Task` | 업무 생성 **[PLANNER, ADMIN]** |
| `GET` | `/tasks/:id` | — | `Task + logs` | 업무 상세 조회 **[ALL]** |
| `PATCH` | `/tasks/:id` | `{ title, notes, target_date, ... }` | `Task` | 업무 정보 수정 **[PLANNER+]** |
| `PATCH` | `/tasks/:id/status` | `{ status }` | `Task` | 상태만 변경 → Webhook 트리거 **[ALL]** |
| `DELETE` | `/tasks/:id` | — | `{ message }` | 업무 삭제 **[ADMIN]** |
| `GET` | `/tasks/calendar` | `?year=&month=` | `Task[]` (날짜 그룹) | 캘린더 뷰용 데이터 **[ALL]** |
| `GET` | `/tasks/export` | `?format=csv\|xlsx&from=&to=` | File (binary) | CSV / Excel 다운로드 **[ADMIN, PLANNER]** |

#### Task 생성 요청 예시

```json
POST /api/v1/tasks
{
  "title": "[DCBGIT-39085] 구글 원 2TB 상품 정보 수정",
  "worker_id": 5,
  "planner_id": 2,
  "target_date": "2025-06-20",
  "notes": "PC/MO 모두 반영 필요"
}
```

#### Task 생성 응답 예시

```json
{
  "success": true,
  "data": {
    "task_id": 42,
    "rms_no": "DCBGIT-39085",
    "title": "구글 원 2TB 상품 정보 수정",
    "status": "ASSIGNED",
    "worker_id": 5,
    "planner_id": 2,
    "target_date": "2025-06-20",
    "is_freeze": false,
    "created_at": "2025-06-01T09:00:00Z"
  },
  "message": "업무가 생성되었습니다.",
  "timestamp": "2025-06-01T09:00:00Z"
}
```

### 3.4 타임 트래킹 API `/tasks/:id/timelogs`

| 메서드 | 엔드포인트 | 요청 | 응답 | 설명 |
|---|---|---|---|---|
| `POST` | `/tasks/:id/timelogs/start` | — | `TimeLog` | 타이머 시작 (start_time = NOW()) |
| `PATCH` | `/tasks/:id/timelogs/:lid/stop` | — | `TimeLog` | 타이머 종료 (end_time = NOW()) |
| `PATCH` | `/tasks/:id/timelogs/:lid/adjust` | `{ adjusted_hours }` | `TimeLog` | 수동 공수 보정 (+/−) |
| `GET` | `/tasks/:id/timelogs` | — | `TimeLog[]` | 해당 업무 전체 로그 조회 |

### 3.5 통계 API `/stats`

| 메서드 | 엔드포인트 | 요청 | 응답 | 설명 |
|---|---|---|---|---|
| `GET` | `/stats/workload` | `?from=&to=` | `WorkerStat[]` | 작업자별 부하량 통계 |
| `GET` | `/stats/summary` | `?month=` | `SummaryData` | 월간 업무 요약 대시보드 |

---

## 4. 프론트엔드 및 API 구조 (Next.js 14)

### 4.1 디렉터리 구조

```
tms/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── layout.tsx                # 루트 레이아웃 (MUI 테마 포함)
│   │   ├── page.tsx                  # 홈 페이지
│   │   ├── login/
│   │   │   └── page.tsx              # 로그인 페이지
│   │   ├── dashboard/
│   │   │   └── page.tsx              # 대시보드 (내 업무 카드)
│   │   ├── tasks/
│   │   │   ├── page.tsx              # 업무 목록 (그리드 + 필터)
│   │   │   ├── [id]/
│   │   │   │   └── page.tsx          # 업무 상세 조회
│   │   │   └── kanban/
│   │   │       └── page.tsx          # 칸반 보드 뷰
│   │   ├── calendar/
│   │   │   └── page.tsx              # 배포 캘린더 뷰
│   │   ├── stats/
│   │   │   └── page.tsx              # 통계 리포트
│   │   ├── api/                      # API Routes (백엔드 엔드포인트)
│   │   │   ├── auth/
│   │   │   │   ├── [...nextauth]/route.ts   # NextAuth.js 통합
│   │   │   │   ├── login/route.ts           # POST /api/auth/login
│   │   │   │   └── logout/route.ts          # POST /api/auth/logout
│   │   │   ├── users/
│   │   │   │   ├── route.ts          # GET /api/users (전체 목록)
│   │   │   │   ├── [id]/route.ts     # GET/PATCH /api/users/:id
│   │   │   │   ├── invite/route.ts   # POST /api/users/invite
│   │   │   │   └── me/route.ts       # GET /api/users/me (내 정보)
│   │   │   ├── tasks/
│   │   │   │   ├── route.ts          # GET/POST /api/tasks
│   │   │   │   ├── [id]/
│   │   │   │   │   ├── route.ts      # GET/PATCH /api/tasks/:id
│   │   │   │   │   ├── status/route.ts # PATCH /api/tasks/:id/status
│   │   │   │   │   └── timelogs/
│   │   │   │   │       ├── route.ts  # GET /api/tasks/:id/timelogs
│   │   │   │   │       ├── start/route.ts
│   │   │   │   │       ├── stop/route.ts
│   │   │   │   │       └── adjust/route.ts
│   │   │   │   ├── calendar/route.ts # GET /api/tasks/calendar
│   │   │   │   └── export/route.ts   # GET /api/tasks/export
│   │   │   ├── stats/
│   │   │   │   ├── workload/route.ts # GET /api/stats/workload
│   │   │   │   └── summary/route.ts  # GET /api/stats/summary
│   │   │   └── webhooks/
│   │   │       └── slack/route.ts    # POST /api/webhooks/slack
│   │   ├── globals.css               # 전역 스타일 (CSS Variables)
│   │   └── _components/              # 레이아웃 구성 컴포넌트
│   │       ├── AppHeader.tsx
│   │       └── AppSidebar.tsx
│   │
│   ├── components/                   # 재사용 가능한 React 컴포넌트
│   │   ├── common/
│   │   │   ├── Button.tsx            # 공통 버튼 (variant: primary/ghost/danger)
│   │   │   ├── Modal.tsx             # 모달 래퍼
│   │   │   ├── Badge.tsx             # 상태/역할 뱃지
│   │   │   └── Table.tsx             # 데이터 테이블
│   │   │
│   │   ├── task/
│   │   │   ├── TaskCard.tsx          # 칸반 카드
│   │   │   ├── TaskForm.tsx          # 생성/수정 폼
│   │   │   ├── TaskStatusBadge.tsx   # 상태 뱃지
│   │   │   ├── TaskTimerButton.tsx   # 원클릭 타이머 버튼
│   │   │   ├── TaskAdjustForm.tsx    # 공수 보정 폼
│   │   │   └── TaskFilterBar.tsx     # 필터 바
│   │   │
│   │   ├── kanban/
│   │   │   ├── KanbanBoard.tsx       # 5열 칸반 보드
│   │   │   └── KanbanColumn.tsx      # 개별 칸반 열
│   │   │
│   │   └── chart/
│   │       ├── WorkloadChart.tsx     # 작업자별 부하량 차트
│   │       └── TimeLogChart.tsx      # 일별 공수 차트
│   │
│   ├── lib/                          # 유틸리티 및 설정
│   │   ├── db.ts                     # Prisma 인스턴스
│   │   ├── api-client.ts             # Axios 인스턴스 + 인터셉터
│   │   ├── auth.ts                   # NextAuth.js 설정
│   │   ├── utils.ts                  # 헬퍼 함수
│   │   └── constants.ts              # 상수 정의
│   │
│   ├── hooks/                        # React Custom Hooks
│   │   ├── useAuth.ts                # 인증 상태 + 로그인/로그아웃
│   │   ├── useTask.ts                # 업무 CRUD 로직
│   │   ├── useTimer.ts               # 타이머 상태 관리
│   │   └── useFreeze.ts              # 배포 프리징 감지
│   │
│   ├── store/                        # 전역 상태 (선택사항: Zustand/Context)
│   │   ├── authStore.ts
│   │   └── taskStore.ts
│   │
│   └── types/
│       ├── index.ts                  # 전체 타입 정의
│       ├── api.ts                    # API 응답 타입
│       ├── task.ts                   # Task 관련 타입
│       └── user.ts                   # User 관련 타입
│
├── prisma/
│   ├── schema.prisma                 # Prisma ORM 스키마
│   └── migrations/                   # DB 마이그레이션 히스토리
│
├── .env.example                      # 환경변수 템플릿
├── .env.local                        # 개발 환경변수 (Git 제외)
├── .gitignore                        # Git 제외 파일
├── package.json                      # 프로젝트 의존성
├── next.config.ts                    # Next.js 설정
├── tsconfig.json                     # TypeScript 설정
├── README.md
└── doc/
    └── guide.md                      # 본 문서
```

### 4.2 핵심 컴포넌트 명세

#### `TaskTimerButton.vue` — 원클릭 타이머

```vue
<!-- Props -->
taskId: Number          // 대상 업무 ID
currentLogId: Number | null  // 진행 중인 로그 ID (없으면 null)

<!-- Emits -->
timer-started(logId: number)
timer-stopped(timeLog: TimeLog)

<!-- 동작 -->
// 시작: POST /tasks/:id/timelogs/start → logId 저장
// 종료: PATCH /tasks/:id/timelogs/:lid/stop → TimeLog 반환
// 중복 시작 방지: isRunning 상태로 버튼 잠금
// 경과 시간: setInterval 1초마다 elapsedSeconds++
```

#### `KanbanBoard.vue` — 드래그 앤 드롭 칸반

```vue
<!-- 사용 라이브러리 -->
npm install vue-draggable-next

<!-- Props -->
tasks: Task[]

<!-- 동작 -->
// 5열 고정: ASSIGNED → PROGRESS → REVIEW → QA → DONE
// 드래그 종료 시 자동으로 PATCH /tasks/:id/status 호출
// REVIEW 변경 시 서버에서 Slack Webhook 자동 발동
```

#### `useTimer.ts` — 타이머 Composable

```typescript
// 사용법
const { isRunning, elapsedSeconds, formattedTime, start, stop } = useTimer(taskId)

// 내부 동작
// - setInterval 1초마다 elapsedSeconds 증가
// - 페이지 이탈(beforeUnload) 시 경고 다이얼로그
// - localStorage에 { taskId, logId, startTime } 임시 저장
//   → 새로고침 후에도 타이머 복원 가능
```

### 4.3 라우터 구조 및 권한 가드

```typescript
// router/index.ts
const routes = [
  { path: '/login',      component: LoginPage,      meta: { public: true } },
  { path: '/dashboard',  component: DashboardPage,  meta: { roles: ['ADMIN','PLANNER','WORKER'] } },
  { path: '/tasks',      component: TaskListPage,   meta: { roles: ['ADMIN','PLANNER','WORKER'] } },
  { path: '/tasks/:id',  component: TaskDetailPage, meta: { roles: ['ADMIN','PLANNER','WORKER'] } },
  { path: '/kanban',     component: KanbanPage,     meta: { roles: ['ADMIN','PLANNER','WORKER'] } },
  { path: '/calendar',   component: CalendarPage,   meta: { roles: ['ADMIN','PLANNER','WORKER'] } },
  { path: '/stats',      component: StatsPage,      meta: { roles: ['ADMIN','PLANNER'] } },
]

// 네비게이션 가드
router.beforeEach((to, from, next) => {
  const auth = useAuthStore()
  if (to.meta.public) return next()
  if (!auth.isLoggedIn) return next('/login')
  if (!to.meta.roles.includes(auth.user.role)) return next('/dashboard')
  next()
})
```

---

## 5. 디자인 가이드

### 5.1 디자인 철학

TMS는 **"복잡한 정보를 조용하게 정리하는 도구"** 입니다.
화려함보다 **정보 밀도와 가독성**, **빠른 상태 파악**을 최우선으로 합니다.
모든 컬러와 타이포그래피 선택은 _작업자가 하루 8시간 이상 바라봐도 눈이 편안한 것_ 을 기준으로 합니다.

---

### 5.2 컬러 팔레트

```
[ 주요 색상 ]
--color-primary:      #1A56DB   진한 파란색 — 주요 버튼, 활성 링크, 헤딩 강조
--color-primary-dark: #1E3A8A   더 진한 파란색 — hover 상태, 사이드바 배경
--color-primary-light:#EFF6FF   연한 파란 배경 — 카드 배경, 선택된 행

[ 시스템 색상 ]
--color-success:      #059669   초록 — DONE 상태 뱃지
--color-warning:      #D97706   주황 — REVIEW / 프리징 경고
--color-danger:       #DC2626   빨강 — 삭제, 오류, 긴급 표시
--color-info:         #0891B2   청록 — QA 상태 뱃지

[ 중립 색상 ]
--color-gray-900:     #111827   본문 텍스트
--color-gray-600:     #4B5563   보조 텍스트, 레이블
--color-gray-300:     #D1D5DB   테두리, 구분선
--color-gray-100:     #F3F4F6   테이블 짝수 행, 비활성 배경
--color-white:        #FFFFFF   카드, 모달 배경

[ 배경 ]
--color-bg-base:      #F8FAFC   전체 페이지 배경 (순백보다 약간 차갑게)
--color-bg-sidebar:   #1E3A8A   사이드바 (진한 파랑)
```

#### 상태별 뱃지 컬러 매핑

| 상태 | 배경색 | 텍스트색 | 의미 |
|---|---|---|---|
| `ASSIGNED` | `#DBEAFE` | `#1E40AF` | 배정됨 (파랑) |
| `PROGRESS` | `#FEF3C7` | `#92400E` | 진행중 (노랑) |
| `REVIEW` | `#EDE9FE` | `#5B21B6` | 내부검수 (보라) |
| `QA` | `#CFFAFE` | `#155E75` | QA (청록) |
| `DONE` | `#D1FAE5` | `#065F46` | 완료 (초록) |

---

### 5.3 타이포그래피

```css
/* 폰트 패밀리 */
--font-display: 'Pretendard', 'Noto Sans KR', sans-serif;  /* 헤딩, UI 레이블 */
--font-body:    'Pretendard', 'Noto Sans KR', sans-serif;  /* 본문 */
--font-mono:    'JetBrains Mono', 'Fira Code', monospace;  /* 코드, RMS 번호 */

/* 타입 스케일 */
--text-xs:   11px / 1.4   /* 타임스탬프, 메타 정보 */
--text-sm:   13px / 1.5   /* 테이블 셀, 뱃지 */
--text-base: 14px / 1.6   /* 기본 본문 */
--text-md:   16px / 1.5   /* 카드 제목 */
--text-lg:   18px / 1.4   /* 섹션 소제목 */
--text-xl:   22px / 1.3   /* 페이지 헤딩 */
--text-2xl:  28px / 1.2   /* 대시보드 수치 */
```

> **핵심 원칙**: TMS는 한글이 주요 언어입니다. `Pretendard`는 한글·영문 모두 자간이 균일하여 표, 칸반, 목록에서 가독성이 뛰어납니다.

---

### 5.4 스페이싱 시스템 (4px 기준)

```css
--space-1:  4px    /* 뱃지 내부 패딩 */
--space-2:  8px    /* 버튼 세로 패딩, 인라인 요소 간격 */
--space-3:  12px   /* 테이블 셀 패딩 */
--space-4:  16px   /* 카드 내부 패딩, 기본 갭 */
--space-6:  24px   /* 섹션 내 요소 간격 */
--space-8:  32px   /* 카드 간 갭, 섹션 상단 마진 */
--space-12: 48px   /* 페이지 헤딩 아래 여백 */
--space-16: 64px   /* 페이지 최상단 여백 */
```

---

### 5.5 컴포넌트 디자인 규칙

#### 버튼

```css
/* Primary — 주요 액션 (업무 생성, 저장) */
.btn-primary {
  background: #1A56DB;
  color: #fff;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
}
.btn-primary:hover { background: #1E3A8A; }

/* Ghost — 보조 액션 (취소, 필터 초기화) */
.btn-ghost {
  background: transparent;
  border: 1px solid #D1D5DB;
  color: #4B5563;
}

/* Danger — 삭제 */
.btn-danger {
  background: #DC2626;
  color: #fff;
}

/* 버튼 크기 */
/* sm: padding 4px 10px, font 12px */
/* md: padding 8px 16px, font 14px (기본) */
/* lg: padding 10px 20px, font 15px */
```

#### 타이머 버튼 (시그니처 컴포넌트)

```
[ ▶ 업무 시작 ]   →   배경 #1A56DB, 흰 텍스트, 맥동 애니메이션(pulse) 없음
[ ■ 00:32:14  ] →   배경 #DC2626, 흰 텍스트, 경과시간 표시, 1초마다 업데이트
```

- 타이머 실행 중에는 빨간 버튼으로 전환, 경과 시간을 `HH:MM:SS` 형식으로 표시
- 버튼 폭은 최소 `140px` 고정 (숫자 변화로 레이아웃 흔들림 방지)

#### 카드 (TaskCard)

```css
.task-card {
  background: #fff;
  border: 1px solid #E5E7EB;
  border-radius: 8px;
  padding: 12px 14px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
  transition: box-shadow 0.15s ease;
}
.task-card:hover {
  box-shadow: 0 4px 12px rgba(0,0,0,0.10);
  border-color: #93C5FD;
}
/* 드래그 중 */
.task-card.dragging {
  opacity: 0.5;
  box-shadow: 0 8px 24px rgba(26,86,219,0.20);
  transform: rotate(1.5deg);
}
```

#### 칸반 컬럼

```css
.kanban-column {
  background: #F3F4F6;
  border-radius: 10px;
  min-width: 240px;
  max-width: 280px;
  padding: 12px;
}
.kanban-column-header {
  font-size: 13px;
  font-weight: 700;
  color: #374151;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
}
/* 드롭 가능 영역 강조 */
.kanban-column.drag-over {
  background: #EFF6FF;
  outline: 2px dashed #93C5FD;
}
```

#### 테이블 (TaskListPage 그리드)

```css
.tms-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.tms-table th {
  background: #1E3A8A;
  color: #fff;
  padding: 10px 12px;
  text-align: left;
  font-weight: 600;
  font-size: 12px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.tms-table td {
  padding: 9px 12px;
  border-bottom: 1px solid #F3F4F6;
  color: #111827;
}
.tms-table tr:nth-child(even) td { background: #F8FAFC; }
.tms-table tr:hover td { background: #EFF6FF; }
```

#### 모달

```css
.modal-overlay {
  background: rgba(17, 24, 39, 0.5);
  backdrop-filter: blur(2px);
}
.modal-content {
  background: #fff;
  border-radius: 12px;
  padding: 28px 32px;
  max-width: 560px;
  width: 100%;
  box-shadow: 0 20px 60px rgba(0,0,0,0.15);
}
```

---

### 5.6 아이콘 사용 가이드

```
라이브러리: lucide-vue-next (Vue 3 공식 지원)
npm install lucide-vue-next

크기 기준:
- 테이블/목록 내 인라인 아이콘: size="14"
- 버튼 내 아이콘:               size="16"
- 사이드바 메뉴 아이콘:          size="20"
- 빈 상태(Empty State) 아이콘:  size="48", color="#D1D5DB"
```

| 기능 | 아이콘 |
|---|---|
| 업무 생성 | `<Plus />` |
| 타이머 시작 | `<Play />` |
| 타이머 종료 | `<Square />` |
| 상태 변경 | `<ArrowRight />` |
| 삭제 | `<Trash2 />` |
| 편집 | `<Pencil />` |
| 캘린더 | `<Calendar />` |
| 칸반 | `<LayoutDashboard />` |
| 통계 | `<BarChart2 />` |
| Webhook 알림 | `<Bell />` |
| 프리징 경고 | `<AlertTriangle />` (color: #D97706) |

---

### 5.7 레이아웃 구조

```
┌──────────────────────────────────────────────────────┐
│  AppHeader (height: 56px, bg: #fff, border-bottom)   │
├──────────┬───────────────────────────────────────────┤
│          │                                           │
│ Sidebar  │         Main Content Area                 │
│ 220px    │         padding: 24px 32px                │
│ bg:      │         max-width: 1440px                 │
│ #1E3A8A  │                                           │
│          │                                           │
└──────────┴───────────────────────────────────────────┘

사이드바 메뉴 항목:
- 대시보드 (Dashboard)
- 업무 목록 (Task List)       ← 기본 그리드
- 칸반 보드 (Kanban)
- 배포 캘린더 (Calendar)
- 통계 / 리포트 (Stats)       ← ADMIN, PLANNER 전용

반응형 기준점:
- Desktop:  ≥ 1280px → 사이드바 고정 표시
- Tablet:   768~1279px → 사이드바 접힘 (아이콘만)
- Mobile:   < 768px → 사이드바 오버레이 드로어
```

---

### 5.8 빈 상태 (Empty State) 디자인

```
업무가 없을 때:

        [ 📋 아이콘 48px, #D1D5DB ]

        배정된 업무가 없습니다.
        [font-size: 16px, color: #6B7280, font-weight: 600]

        기획자에게 업무 배정을 요청하거나
        새 업무를 직접 생성해보세요.
        [font-size: 13px, color: #9CA3AF]

              [ + 업무 만들기 ]
              [btn-primary, size: md]
```

---

### 5.9 알림 / 토스트 디자인

```css
/* 성공 */
.toast-success {
  background: #ECFDF5;
  border-left: 4px solid #059669;
  color: #065F46;
}
/* 경고 (프리징 충돌 등) */
.toast-warning {
  background: #FFFBEB;
  border-left: 4px solid #D97706;
  color: #78350F;
}
/* 오류 */
.toast-error {
  background: #FEF2F2;
  border-left: 4px solid #DC2626;
  color: #7F1D1D;
}

/* 공통 */
.toast {
  border-radius: 8px;
  padding: 12px 16px;
  font-size: 14px;
  min-width: 280px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.10);
  position: fixed;
  bottom: 24px;
  right: 24px;
}
```

---

## 6. 백엔드 API 구현 (Next.js API Routes + Prisma)

### 6.1 API 구조

Next.js API Routes는 `/src/app/api` 디렉터리 구조로 자동 라우팅됩니다:
- `GET /api/tasks` → `src/app/api/tasks/route.ts` 의 `GET 함수`
- `POST /api/tasks` → `src/app/api/tasks/route.ts` 의 `POST 함수`
- `GET /api/tasks/[id]` → `src/app/api/tasks/[id]/route.ts`

### 6.2 백엔드 서비스 계층 (lib/services/)

```
src/lib/services/           # 비즈니스 로직
├── auth.service.ts         # 인증 로직 (JWT 생성/검증)
├── user.service.ts         # 사용자 CRUD
├── task.service.ts         # 업무 CRUD + 비즈니스 로직
├── timelog.service.ts      # 타이머 로직
├── stats.service.ts        # 통계 계산
└── webhook.service.ts      # Slack/Jandi 알림 발송
```

### 6.3 핵심 비즈니스 로직

#### RMS 번호 자동 파싱

```typescript
// lib/services/task.service.ts
export function parseRmsNo(title: string): { cleanTitle: string; rmsNo: string | null } {
  const rmsPattern = /\[([A-Z]+-\d+)\]/;
  const match = title.match(rmsPattern);
  if (match) {
    return {
      cleanTitle: title.replace(match[0], '').trim(),
      rmsNo: match[1],
    };
  }
  return { cleanTitle: title, rmsNo: null };
}
```

#### 상태 변경 시 Webhook 트리거

```typescript
// app/api/tasks/[id]/status/route.ts
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const task = await this.tasksRepo.findOneOrFail(taskId);
  task.status = status;
  await this.tasksRepo.save(task);

  // 검수 요청 시 기획자에게 알림
  if (status === 'REVIEW') {
    await this.webhookQueue.add('sendReviewAlert', {
      taskId: task.task_id,
      taskTitle: task.title,
      workerName: (await this.usersService.findOne(userId)).name,
      plannerId: task.planner_id,
    });
  }
  return task;
}
```

#### 배포 프리징 감지 로직

```typescript
// tasks.service.ts
async setTargetDate(taskId: number, targetDate: Date) {
  const freeze = await this.freezeRepo.findOverlap(targetDate);
  const task = await this.tasksRepo.findOneOrFail(taskId);
  task.target_date = targetDate;
  task.is_freeze = !!freeze;   // 충돌 시 true → 프론트에서 경고 UI 표시
  return this.tasksRepo.save(task);
}
```

#### Webhook 알림 메시지 포맷

```typescript
// slack.service.ts
buildReviewMessage(workerName: string, taskTitle: string, taskUrl: string): string {
  return `📢 [검수요청] ${workerName}님이 '${taskTitle}' 건의 검수를 요청했습니다.\n👉 ${taskUrl}`;
}
```

---

## 7. 에러 코드 정의

| 에러 코드 | HTTP | 메시지 | 발생 상황 |
|---|---|---|---|
| `AUTH_401` | 401 | 인증 토큰이 없거나 만료되었습니다. | JWT 없음 또는 만료 |
| `AUTH_403` | 403 | 해당 기능에 대한 권한이 없습니다. | 역할 권한 부족 |
| `USER_404` | 404 | 해당 사용자를 찾을 수 없습니다. | 존재하지 않는 user_id |
| `TASK_404` | 404 | 해당 업무를 찾을 수 없습니다. | 존재하지 않는 task_id |
| `TASK_409` | 409 | 배포 프리징 기간과 날짜가 충돌합니다. | target_date가 freeze 기간 내 |
| `TIMER_409` | 409 | 이미 실행 중인 타이머가 있습니다. | 동시에 2개 타이머 시작 시도 |
| `VALID_400` | 400 | 요청 데이터가 올바르지 않습니다. | DTO 유효성 검증 실패 |
| `WEBHOOK_500` | 500 | 알림 발송에 실패했습니다. (업무는 정상 처리) | Slack Webhook 오류 |

---

## 8. 환경변수 설정 (.env.local)

Next.js 풀스택 애플리케이션이므로 단일 `.env.local` 파일 사용:

```env
# 데이터베이스
DATABASE_URL=postgresql://user:password@localhost:5432/tms_db

# NextAuth (로그인 인증)
NEXTAUTH_SECRET=your_super_secret_key_here_min_32_characters
NEXTAUTH_URL=http://localhost:3000

# API 설정
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000/api

# JWT 토큰
JWT_EXPIRES_IN=3600
JWT_REFRESH_EXPIRES_IN=604800

# Slack Webhook (알림)
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/xxx/yyy/zzz

# 잔디(JANDI) Webhook (선택사항)
JANDI_WEBHOOK_URL=https://wh.jandi.com/connect-api/webhook/xxx

# Redis (선택사항 - Bull 큐 대체용)
REDIS_URL=redis://localhost:6379

# 개발 환경
NODE_ENV=development
```

**주의**: `.env.local` 파일은 `.gitignore`에 추가되어 Git에 커밋되지 않습니다.
개발 환경 설정은 `.env.example`을 참고하여 복사한 후 개인 값을 입력하세요.

---

## 9. 단계별 개발 로드맵

| 단계 | 기간 | 주요 작업 | 완료 기준 |
|---|---|---|---|
| **Phase 1** MVP | 2~3주 | 사용자 인증/권한, 업무 CRUD, 그리드 목록, 기본 상태 변경 | 로그인 후 업무 생성·조회 가능 |
| **Phase 2** 자동화 | 2~3주 | 원클릭 타이머, 공수 보정 UI, RMS 자동 파싱, 칸반 D&D | 타이머 작동 및 칸반 D&D 정상 동작 |
| **Phase 3** 고도화 | 2~3주 | Slack/잔디 Webhook, 배포 프리징, 템플릿, 통계+CSV 다운로드 | 알림 발송 및 리포트 다운로드 성공 |

### Phase 1 체크리스트 (MVP - Next.js 기본 구조)

- [x] Next.js 14 프로젝트 초기 세팅 (TypeScript, CSS Modules, MUI)
- [x] Prisma 스키마 정의 및 PostgreSQL 연결 설정
- [ ] Prisma 마이그레이션 생성 및 테이블 생성
- [ ] NextAuth.js 인증 구현 (로그인/로그아웃)
- [ ] `/api/auth` 라우트 구현
- [ ] `/api/users` CRUD API 구현
- [ ] `/api/tasks` CRUD API 구현
- [ ] 로그인 페이지 (`/login`) 구현
- [ ] 대시보드 페이지 (`/dashboard`)
- [ ] 업무 목록 페이지 (`/tasks`) - 그리드 + 필터 + 페이지네이션
- [ ] 권한 기반 라우트 가드 (useAuth Hook)

### Phase 2 체크리스트 (자동화 기능)

- [ ] TimeLogs 테이블 마이그레이션
- [ ] `/api/tasks/[id]/timelogs` API (start/stop/adjust)
- [ ] `TaskTimerButton` 컴포넌트 + `useTimer` Hook
- [ ] RMS 번호 자동 파싱 서비스 (task.service.ts)
- [ ] 칸반 보드 페이지 (`/tasks/kanban`)
- [ ] `KanbanBoard` 컴포넌트 (드래그 앤 드롭)
- [ ] 업무 상세 페이지 (`/tasks/[id]`)

### Phase 3 체크리스트 (고도화 기능)

- [ ] Notifications 테이블 마이그레이션
- [ ] Webhook 서비스 (Slack/Jandi 알림 발송)
- [ ] `/api/webhooks/slack` 엔드포인트
- [ ] 배포 캘린더 페이지 (`/calendar`)
- [ ] `CalendarPage` 컴포넌트
- [ ] Templates 테이블 및 템플릿 선택 UI
- [ ] 통계 페이지 (`/stats`)
- [ ] `StatsPage` — 차트 렌더링 + CSV/Excel 내보내기

---

## 10. 비기능 요구사항

### 10.1 성능

- API 응답 시간: 일반 CRUD **200ms 이하**, 통계 쿼리 **1초 이하**
- 동시 접속: 최소 **50명** 동시 접속 처리
- 타이머 정확도: 클라이언트 표시는 1초 단위, 서버 저장은 **밀리초 단위**

### 10.2 보안

- 비밀번호: `bcryptjs` (salt rounds=12) 해싱 저장
- JWT/Session: NextAuth.js 기본 토큰 (Access Token **1시간**, Refresh Token **7일**)
- API Rate Limiting: IP당 분당 **100 요청** 제한 (middleware 구현)
- SQL Injection 방지: Prisma Parameterized Query 자동 처리
- CORS: 같은 도메인(Next.js 서버)이므로 보안 강화

### 10.3 확장성

- Docker Compose로 개발/프로덕션 환경 표준화
- Webhook 발송은 비동기 처리 (Promise.all() 또는 Upstash 활용)
- Prisma 인덱스 설계로 **1만 건 이상** 데이터에서도 안정적 조회
- Vercel에 배포시 자동 스케일링

---

*— 문서 끝 — TMS 개발팀*