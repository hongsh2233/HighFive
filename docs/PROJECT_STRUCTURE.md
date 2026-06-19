# TMS 프로젝트 구조 문서

> **버전** v2.0 | **최종 업데이트** 2026-06-19  
> **스택** Next.js 15 · Prisma · PostgreSQL · NextAuth.js · Zustand · MUI

---

## 1. 프로젝트 개요

AI 웹 개발 비즈니스에 최적화된 **경량 업무 관리 플랫폼**. Jira·Notion의 설정 복잡성 없이 즉시 사용 가능한 Zero-Configuration 방식으로 설계.

### 핵심 기능

| 기능 | 설명 |
|---|---|
| 업무 CRUD | 생성·배정·수정·삭제. 제목에서 RMS 번호 자동 파싱 |
| 타임 트래킹 | 원클릭 타이머 시작/종료, 수동 공수 보정(±h) |
| 칸반 보드 | 5단계 드래그&드롭, 상태 전환 시 서버 즉시 반영 |
| 배포 캘린더 | 목표일 기준 월별 업무 시각화 |
| 통계 리포트 | 작업자별 부하량, 월간 완료율 |
| Webhook 알림 | 상태 변경 시 Slack·잔디·카카오 자동 발송 |
| CSV/Excel 내보내기 | 업무 목록 파일 다운로드 |

---

## 2. 사용자 역할 및 권한

| 역할 | 코드 | 접근 가능 페이지 | 주요 권한 |
|---|---|---|---|
| 관리자 | `ADMIN` | 전체 | 사용자 초대·관리, 전체 업무 열람/수정/삭제, 통계, 내보내기 |
| 기획자 | `PLANNER` | /users 제외 전체 | 업무 생성·배정, 검수 승인, 통계 열람 |
| 작업자 | `WORKER` | /stats·/users 제외 | 배정 업무 확인, 타이머 작동, 상태 변경 |

### 라우트 가드 (`src/middleware.ts`)

```
/login          → 누구나 접근 가능
/dashboard      → 인증 필요 (전 역할)
/tasks/**       → 인증 필요 (전 역할)
/calendar       → 인증 필요 (전 역할)
/info           → 인증 필요 (전 역할)
/stats          → ADMIN, PLANNER만
/users          → ADMIN만
```

---

## 3. 데이터베이스 스키마 (`prisma/schema.prisma`)

```
User (1) ──< Task [planner / worker] (1) ──< TimeLog
                Task (1) ──< Notification
                Template (1) ──< Task
```

### User

| 필드 | 타입 | 비고 |
|---|---|---|
| id | Int PK | 자동 증가 |
| email | String UNIQUE | 로그인 이메일 |
| name | String | 표시명 |
| role | String | ADMIN / PLANNER / WORKER |
| passwordHash | String | bcryptjs (salt=10) |
| isActive | Boolean | 계정 활성 여부 |
| createdAt | DateTime | 가입일 |
| lastLoginAt | DateTime? | 마지막 로그인 |

### Task

| 필드 | 타입 | 비고 |
|---|---|---|
| id | Int PK | |
| rmsNo | String? | 제목에서 자동 파싱 ex) `DCBGIT-39085` |
| title | String | RMS 번호 제거 후 저장 |
| plannerId | Int FK | 담당 기획자 |
| workerId | Int FK | 담당 작업자 |
| status | String | ASSIGNED / PROGRESS / REVIEW / QA / DONE |
| targetDate | DateTime? | 목표 완료일 |
| isFreeze | Boolean | 배포 프리징 충돌 여부 |
| templateId | Int? | 템플릿 참조 |
| notes | String? | 비고 |

### TimeLog

| 필드 | 타입 | 비고 |
|---|---|---|
| id | Int PK | |
| taskId | Int FK | |
| workerId | Int FK | |
| startTime | DateTime | 타이머 시작 |
| endTime | DateTime? | 타이머 종료 (진행 중이면 null) |
| durationHours | Float? | (endTime - startTime) 자동 계산 |
| adjustedHours | Float | 수동 보정값 (기본 0) |
| finalHours | Float? | durationHours + adjustedHours |

---

## 4. 디렉터리 구조

```
tms/
├── prisma/
│   ├── schema.prisma
│   └── seed.ts                        # 초기 데이터 (admin 계정 포함)
│
├── docs/
│   └── PROJECT_STRUCTURE.md           # 본 문서
│
├── src/
│   ├── app/
│   │   ├── layout.tsx                 # 루트 레이아웃
│   │   ├── page.tsx                   # / → /dashboard 리다이렉트
│   │   ├── globals.css                # CSS 변수 (컬러, 스페이싱, 타이포)
│   │   │
│   │   ├── login/page.tsx
│   │   ├── dashboard/page.tsx
│   │   ├── info/page.tsx              # 시스템 소개
│   │   ├── calendar/page.tsx
│   │   ├── stats/page.tsx
│   │   ├── users/page.tsx             # ADMIN 전용
│   │   ├── profile/password/page.tsx
│   │   │
│   │   ├── tasks/
│   │   │   ├── page.tsx               # 목록 (필터 + 페이지네이션)
│   │   │   ├── create/page.tsx        # 업무 등록 폼
│   │   │   ├── kanban/page.tsx        # 칸반 보드
│   │   │   └── [id]/page.tsx          # 업무 상세 + 타임로그
│   │   │
│   │   └── api/
│   │       ├── auth/
│   │       │   ├── [...nextauth]/route.ts     # NextAuth 핸들러
│   │       │   └── change-password/route.ts   # POST 비밀번호 변경
│   │       ├── users/
│   │       │   ├── route.ts                   # GET 목록 / POST 생성
│   │       │   ├── me/route.ts                # GET 내 정보
│   │       │   └── invite/route.ts            # POST ADMIN 전용 초대
│   │       ├── tasks/
│   │       │   ├── route.ts                   # GET 목록 / POST 생성
│   │       │   ├── calendar/route.ts          # GET 월별 캘린더 데이터
│   │       │   ├── export/route.ts            # GET CSV/xlsx 다운로드
│   │       │   └── [id]/
│   │       │       ├── route.ts               # GET / PATCH / DELETE
│   │       │       ├── status/route.ts        # PATCH 상태 변경 + Webhook
│   │       │       └── timelogs/
│   │       │           ├── route.ts           # GET 로그 목록
│   │       │           ├── start/route.ts     # POST 타이머 시작
│   │       │           └── [logId]/
│   │       │               ├── stop/route.ts  # PATCH 타이머 종료
│   │       │               └── adjust/route.ts # PATCH 공수 보정
│   │       ├── stats/
│   │       │   ├── summary/route.ts           # GET 월간 요약
│   │       │   └── workload/route.ts          # GET 작업자별 부하량
│   │       └── webhooks/
│   │           └── slack/route.ts             # POST Slack/잔디 알림 발송
│   │
│   ├── components/
│   │   ├── AppHeader.tsx              # 상단 GNB (메뉴, 프로필, 로그아웃)
│   │   ├── LayoutWrapper.tsx          # 페이지 레이아웃 래퍼
│   │   ├── Providers.tsx              # SessionProvider + AuthSync
│   │   ├── common/
│   │   │   ├── Badge.tsx              # StatusBadge, RoleBadge
│   │   │   └── Modal.tsx              # 오버레이 모달 (ESC 닫기 지원)
│   │   ├── kanban/
│   │   │   ├── KanbanBoard.tsx        # 5열 칸반 컨테이너
│   │   │   └── KanbanColumn.tsx       # 개별 열 + 드래그&드롭
│   │   └── task/
│   │       ├── TaskTimerButton.tsx    # 원클릭 타이머 버튼
│   │       ├── TaskStatusBadge.tsx    # 상태 뱃지 래퍼
│   │       ├── TaskFilterBar.tsx      # 상태/작업자 필터
│   │       └── TaskAdjustForm.tsx     # 공수 수동 보정 폼
│   │
│   ├── hooks/
│   │   ├── useAuth.ts                 # NextAuth 세션 + 역할 가드
│   │   ├── useTask.ts                 # 업무 CRUD (로컬 state 기반)
│   │   ├── useTimer.ts                # 타이머 시작/종료/경과시간
│   │   └── useFreeze.ts              # 배포 프리징 감지
│   │
│   ├── store/                         # Zustand 전역 상태
│   │   ├── authStore.ts               # 인증 상태 (persist, hasRole, isAdmin)
│   │   └── taskStore.ts               # 업무 목록 + 필터 + 낙관적 업데이트
│   │
│   ├── lib/
│   │   ├── db.ts                      # Prisma 클라이언트 싱글톤
│   │   ├── auth.ts                    # NextAuth 옵션 (CredentialsProvider)
│   │   ├── api-client.ts              # Axios 인스턴스 + 인터셉터
│   │   ├── webhook.ts                 # Slack·잔디·카카오 알림 발송
│   │   ├── constants.ts               # 상태/역할 상수, 컬러 매핑
│   │   ├── utils.ts                   # requireAuth, successResponse, parseRmsNo 등
│   │   └── services/                  # 비즈니스 로직 서비스 계층
│   │       ├── task.service.ts        # 업무 생성, 상태 변경 (Webhook 연동)
│   │       ├── user.service.ts        # 사용자 초대·수정·비활성화
│   │       ├── stats.service.ts       # 월간 요약, 작업자 부하량 집계
│   │       └── webhook.service.ts     # notifyStatusChange (DB 기록 포함)
│   │
│   ├── middleware.ts                  # 라우트 보호 (역할별 접근 제어)
│   │
│   └── types/
│       ├── index.ts                   # 전체 타입 (User, Task, TimeLog 등)
│       └── next-auth.d.ts             # NextAuth 세션 타입 확장
```

---

## 5. 핵심 비즈니스 로직

### RMS 번호 자동 파싱 (`src/lib/utils.ts`)

```
입력: "[DCBGIT-39085] 구글 원 2TB 상품 정보 수정"
출력: { rmsNo: "DCBGIT-39085", cleanTitle: "구글 원 2TB 상품 정보 수정" }

패턴: /\[([A-Z]+-\d+)\]/
```

### 업무 상태 전이 및 Webhook 트리거

```
ASSIGNED → PROGRESS → REVIEW → QA → DONE
                         ↓
                   Slack/잔디/카카오 자동 알림 발송
```

- `PATCH /api/tasks/[id]/status` 호출 시 상태 저장 후 `notifyStatusChange()` 비동기 실행
- Webhook 성공/실패 여부는 `Notification` 테이블에 기록

### 타이머 흐름 (`src/hooks/useTimer.ts`)

```
POST /timelogs/start          → startTime = NOW(), endTime = null
PATCH /timelogs/:id/stop      → endTime = NOW(), durationHours 자동 계산
PATCH /timelogs/:id/adjust    → adjustedHours 보정, finalHours 갱신

- 진행 중 페이지 이탈 시 beforeUnload 경고
- 새로고침 시 활성 타이머 자동 복원 (API 재조회)
```

### 인증 흐름

```
로그인 → NextAuth CredentialsProvider → bcryptjs 검증
       → JWT 생성 (id, email, name, role 포함, 유효기간 24h)
       → Providers.tsx의 AuthSync가 Zustand authStore에 세션 동기화
       → middleware.ts에서 JWT 검증 후 역할별 라우트 접근 제어
```

---

## 6. API 전체 목록

| 메서드 | 엔드포인트 | 권한 | 설명 |
|---|---|---|---|
| POST | `/api/auth/[...nextauth]` | 공개 | 로그인/로그아웃 |
| POST | `/api/auth/change-password` | ALL | 비밀번호 변경 |
| GET | `/api/users` | ADMIN | 사용자 목록 |
| POST | `/api/users` | ADMIN | 사용자 생성 |
| GET | `/api/users/me` | ALL | 내 정보 |
| POST | `/api/users/invite` | ADMIN | 사용자 초대 (임시 비밀번호 발급) |
| GET | `/api/tasks` | ALL | 업무 목록 (필터+페이지네이션) |
| POST | `/api/tasks` | PLANNER+ | 업무 생성 |
| GET | `/api/tasks/calendar` | ALL | 월별 캘린더 데이터 |
| GET | `/api/tasks/export` | PLANNER+ | CSV/xlsx 다운로드 |
| GET | `/api/tasks/[id]` | ALL | 업무 상세 |
| PATCH | `/api/tasks/[id]` | PLANNER+ | 업무 수정 |
| DELETE | `/api/tasks/[id]` | ADMIN | 업무 삭제 |
| PATCH | `/api/tasks/[id]/status` | ALL | 상태 변경 + Webhook 트리거 |
| GET | `/api/tasks/[id]/timelogs` | ALL | 타임로그 목록 |
| POST | `/api/tasks/[id]/timelogs/start` | ALL | 타이머 시작 |
| PATCH | `/api/tasks/[id]/timelogs/[logId]/stop` | ALL | 타이머 종료 |
| PATCH | `/api/tasks/[id]/timelogs/[logId]/adjust` | ALL | 공수 보정 |
| GET | `/api/stats/summary` | PLANNER+ | 월간 요약 통계 |
| GET | `/api/stats/workload` | PLANNER+ | 작업자별 부하량 |
| POST | `/api/webhooks/slack` | 내부 | Slack/잔디 알림 발송 |

---

## 7. 환경변수 (`.env.local`)

| 키 | 필수 | 설명 |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL 연결 URL |
| `NEXTAUTH_SECRET` | ✅ | JWT 서명 시크릿 (32자 이상) |
| `NEXTAUTH_URL` | ✅ | 서비스 베이스 URL (ex: http://localhost:3000) |
| `NEXT_PUBLIC_API_BASE_URL` | ✅ | 클라이언트 API base URL |
| `SLACK_WEBHOOK_URL` | ⬜ | Slack 알림 Webhook URL |
| `JANDI_WEBHOOK_URL` | ⬜ | 잔디 알림 Webhook URL |
| `KAKAO_WEBHOOK_URL` | ⬜ | 카카오톡 알림 Webhook URL |

---

## 8. 개발 스크립트

```bash
npm run dev          # 개발 서버 실행 (localhost:3000)
npm run build        # 프로덕션 빌드
npm run db:push      # Prisma 스키마 → DB 반영
npm run db:seed      # 초기 데이터 삽입 (admin 계정 생성)
npm run db:studio    # Prisma Studio 실행
```

### 초기 계정 (seed)

| 이메일 | 역할 | 비고 |
|---|---|---|
| admin@admin.co.kr | ADMIN | `prisma/seed.ts` 참조 |

---

## 9. 디자인 시스템

### 컬러 팔레트 (CSS 변수)

| 변수 | 값 | 용도 |
|---|---|---|
| `--color-primary` | `#1A56DB` | 주요 버튼, 헤더 배경 |
| `--color-primary-dark` | `#1E3A8A` | hover 상태 |
| `--color-primary-light` | `#EFF6FF` | 카드 배경, 선택 행 |
| `--color-success` | `#059669` | DONE 상태 |
| `--color-warning` | `#D97706` | REVIEW, 프리징 경고 |
| `--color-danger` | `#DC2626` | 삭제, 오류 |

### 상태별 뱃지 컬러 (`src/lib/constants.ts`)

| 상태 | 배경 | 텍스트 |
|---|---|---|
| ASSIGNED | `#DBEAFE` | `#1E40AF` |
| PROGRESS | `#FEF3C7` | `#92400E` |
| REVIEW | `#EDE9FE` | `#5B21B6` |
| QA | `#CFFAFE` | `#155E75` |
| DONE | `#D1FAE5` | `#065F46` |
