# TMS 프로젝트 구조 문서

> **기준일**: 2026-06-19 | **스택**: Next.js 15 · Prisma · PostgreSQL · MUI · NextAuth.js

---

## 1. 현재 구현 상태

### 완료된 항목

| 영역 | 파일/기능 | 상태 |
|---|---|---|
| DB 스키마 | `prisma/schema.prisma` — User, Task, TimeLog, Template, Notification | ✅ |
| 인증 | NextAuth.js (JWT, CredentialsProvider, bcryptjs) | ✅ |
| API — 인증 | `GET/POST /api/auth/[...nextauth]`, `POST /api/auth/change-password` | ✅ |
| API — 사용자 | `GET/POST /api/users`, `GET /api/users/me` | ✅ |
| API — 업무 | `GET/POST /api/tasks`, `GET/PATCH/DELETE /api/tasks/[id]` | ✅ |
| API — 상태 | `PATCH /api/tasks/[id]/status` | ✅ |
| API — 타임로그 | `GET/POST /api/tasks/[id]/timelogs`, start/stop/adjust | ✅ |
| API — 캘린더 | `GET /api/tasks/calendar` | ✅ |
| API — 통계 | `GET /api/stats/summary`, `GET /api/stats/workload` | ✅ |
| 페이지 | login, dashboard, tasks(목록/상세/생성/칸반), calendar, stats, users, profile/password | ✅ |
| 컴포넌트 | AppHeader, LayoutWrapper, Providers, KanbanBoard, KanbanColumn, TaskTimerButton | ✅ |
| Hooks | useAuth, useTask, useTimer | ✅ |
| 유틸리티 | lib/db, lib/auth, lib/utils (RMS파싱, requireAuth, 응답 헬퍼), lib/api-client, lib/webhook | ✅ |
| 타입 | `src/types/index.ts` — User, Task, TimeLog, Template, Notification 등 | ✅ |

### 미구현/누락 항목

| 영역 | 파일 | 우선순위 |
|---|---|---|
| 상수 정의 | `src/lib/constants.ts` | Phase 1 |
| 서비스 계층 | `src/lib/services/task.service.ts` | Phase 2 |
| 서비스 계층 | `src/lib/services/user.service.ts` | Phase 2 |
| 서비스 계층 | `src/lib/services/stats.service.ts` | Phase 2 |
| 서비스 계층 | `src/lib/services/webhook.service.ts` | Phase 3 |
| 전역 상태 | `src/store/authStore.ts` | Phase 2 |
| 전역 상태 | `src/store/taskStore.ts` | Phase 2 |
| Hook | `src/hooks/useFreeze.ts` | Phase 3 |
| 공통 컴포넌트 | `src/components/common/Button.tsx` | Phase 1 |
| 공통 컴포넌트 | `src/components/common/Modal.tsx` | Phase 1 |
| 공통 컴포넌트 | `src/components/common/Badge.tsx` | Phase 1 |
| 공통 컴포넌트 | `src/components/common/Table.tsx` | Phase 1 |
| 업무 컴포넌트 | `src/components/task/TaskCard.tsx` | Phase 2 |
| 업무 컴포넌트 | `src/components/task/TaskForm.tsx` | Phase 1 |
| 업무 컴포넌트 | `src/components/task/TaskStatusBadge.tsx` | Phase 1 |
| 업무 컴포넌트 | `src/components/task/TaskAdjustForm.tsx` | Phase 2 |
| 업무 컴포넌트 | `src/components/task/TaskFilterBar.tsx` | Phase 1 |
| 차트 컴포넌트 | `src/components/chart/WorkloadChart.tsx` | Phase 3 |
| 차트 컴포넌트 | `src/components/chart/TimeLogChart.tsx` | Phase 3 |
| API | `POST /api/users/invite` | Phase 1 |
| API | `GET /api/tasks/export` (CSV/Excel) | Phase 3 |
| API | `POST /api/webhooks/slack` | Phase 3 |
| 타입 분리 | `src/types/api.ts`, `src/types/task.ts`, `src/types/user.ts` | Phase 2 |

---

## 2. 디렉터리 구조 (현재)

```
tms/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   │   ├── [...nextauth]/route.ts     # NextAuth 통합
│   │   │   │   └── change-password/route.ts   # 비밀번호 변경
│   │   │   ├── users/
│   │   │   │   ├── route.ts                   # GET 목록 / POST 생성
│   │   │   │   └── me/route.ts                # GET 내 정보
│   │   │   ├── tasks/
│   │   │   │   ├── route.ts                   # GET 목록 / POST 생성
│   │   │   │   ├── calendar/route.ts          # GET 캘린더 데이터
│   │   │   │   └── [id]/
│   │   │   │       ├── route.ts               # GET/PATCH/DELETE
│   │   │   │       ├── status/route.ts        # PATCH 상태 변경
│   │   │   │       └── timelogs/
│   │   │   │           ├── route.ts           # GET 로그 목록
│   │   │   │           ├── start/route.ts     # POST 타이머 시작
│   │   │   │           └── [logId]/
│   │   │   │               ├── stop/route.ts  # PATCH 타이머 종료
│   │   │   │               └── adjust/route.ts # PATCH 공수 보정
│   │   │   └── stats/
│   │   │       ├── summary/route.ts           # GET 월간 요약
│   │   │       └── workload/route.ts          # GET 작업자별 부하
│   │   ├── calendar/page.tsx
│   │   ├── dashboard/page.tsx
│   │   ├── login/page.tsx
│   │   ├── profile/password/page.tsx
│   │   ├── stats/page.tsx
│   │   ├── tasks/
│   │   │   ├── page.tsx                       # 업무 목록
│   │   │   ├── create/page.tsx                # 업무 생성
│   │   │   ├── [id]/page.tsx                  # 업무 상세
│   │   │   └── kanban/page.tsx                # 칸반 보드
│   │   ├── users/page.tsx
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   │
│   ├── components/
│   │   ├── AppHeader.tsx
│   │   ├── LayoutWrapper.tsx
│   │   ├── Providers.tsx
│   │   ├── common/                            # ⚠️ 디렉터리 생성됨, 파일 미구현
│   │   ├── chart/                             # ⚠️ 디렉터리 생성됨, 파일 미구현
│   │   ├── kanban/
│   │   │   ├── KanbanBoard.tsx
│   │   │   └── KanbanColumn.tsx
│   │   └── task/
│   │       └── TaskTimerButton.tsx            # ⚠️ 나머지 미구현
│   │
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useTask.ts
│   │   └── useTimer.ts                        # ⚠️ useFreeze.ts 미구현
│   │
│   ├── lib/
│   │   ├── api-client.ts
│   │   ├── auth.ts
│   │   ├── db.ts
│   │   ├── utils.ts
│   │   ├── webhook.ts
│   │   └── services/                          # ⚠️ 디렉터리 생성됨, 파일 미구현
│   │
│   ├── store/                                 # ⚠️ 디렉터리 생성됨, 파일 미구현
│   │
│   └── types/
│       ├── index.ts
│       └── next-auth.d.ts
│
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
│
├── docs/
│   └── PROJECT_STRUCTURE.md                   # 본 문서
├── doc/
│   └── guide.md                               # 기획/설계 원본 문서
├── .env.example
├── next.config.ts
├── package.json
└── tsconfig.json
```

---

## 3. 데이터 모델

```
User (1) ──< Task (planner / worker) (1) ──< TimeLog
                Task (1) ──< Notification
                Template (1) ──< Task
```

### 상태 전이 (TaskStatus)

```
ASSIGNED → PROGRESS → REVIEW → QA → DONE
              ↑__________↓ (반려 재작업)
```

REVIEW 전환 시 Webhook(Slack/잔디) 자동 발송 예정.

---

## 4. 인증 흐름

- NextAuth.js CredentialsProvider (이메일 + bcryptjs 해시)
- JWT 세션 전략 (24시간)
- `session.user.id`, `session.user.role` 커스텀 필드
- 미들웨어(`src/middleware.ts`)에서 비인증 요청 `/login` 리다이렉트

---

## 5. 환경변수 (.env.local)

| 키 | 용도 |
|---|---|
| `DATABASE_URL` | PostgreSQL 연결 URL |
| `NEXTAUTH_SECRET` | JWT 서명 시크릿 (32자+) |
| `NEXTAUTH_URL` | 서비스 베이스 URL |
| `NEXT_PUBLIC_API_BASE_URL` | 클라이언트 API base URL |
| `SLACK_WEBHOOK_URL` | Slack 알림 Webhook |
| `JANDI_WEBHOOK_URL` | 잔디 알림 Webhook (선택) |

---

## 6. 개발 로드맵 대비 현재 진행률

| Phase | 목표 | 진행률 |
|---|---|---|
| Phase 1 — MVP | 인증, CRUD, 그리드, 상태 변경 | ~70% (공통 컴포넌트 미완) |
| Phase 2 — 자동화 | 타이머, 칸반 D&D, RMS 파싱 | ~60% (서비스 계층, 일부 컴포넌트 미완) |
| Phase 3 — 고도화 | Webhook, 캘린더, 통계, CSV | ~30% (Webhook 미완, 차트 미완) |
