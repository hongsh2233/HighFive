# TMS - Task Management System

> AI 기반 경량 업무 관리 플랫폼
> 
> **기술 스택**: Next.js 14 · Prisma · PostgreSQL · Material-UI  
> **상태**: ✅ 프로덕션 준비 완료

---

## 🎯 주요 기능

### 📋 업무 관리
- ✅ 업무 생성/수정/삭제 (CRUD)
- ✅ 업무 목록 조회 (필터, 페이지네이션)
- ✅ 업무 상세 조회
- ✅ 업무 상태 변경 (ASSIGNED → PROGRESS → REVIEW → QA → DONE)

### 🎨 시각화
- ✅ **칸반 보드** - 드래그 앤 드롭으로 상태 변경
- ✅ **배포 캘린더** - 월별 업무 일정 조회
- ✅ **통계 대시보드** - 작업자 부하량, 완료율

### ⏱️ 시간 추적
- ✅ 원클릭 타이머 (시작/종료)
- ✅ 실시간 경과 시간 표시 (HH:MM:SS)
- ✅ 타임로그 기록 조회
- ✅ 공수 보정 (+/- 시간)

### 🔔 알림 시스템 (3가지 채널)
- ✅ **Slack** 알림
- ✅ **Jandi** 알림
- ✅ **카카오톡** 알림
- ✅ 상태 변경 시 자동 발송

### 🔐 인증 & 권한
- ✅ NextAuth.js 기반 로그인
- ✅ 역할 기반 접근 제어 (ADMIN, PLANNER, WORKER)
- ✅ JWT 세션 관리

### 역할별 권한
| 역할 | 권한 |
|------|------|
| **ADMIN** | 팀 사용자 관리, 전체 시스템 관리 |
| **PLANNER** | 업무 배정, 통계 조회, 칸반 보드, 캘린더, 업무 상태 변경 |
| **WORKER** | 배정된 업무 수행, 타이머 기록, 업무 상태 변경 |

### 📊 리포트
- ✅ 월간 요약 통계
- ✅ 작업자별 부하량 분석
- ✅ CSV 다운로드

---

## 🚀 빠른 시작

### 사전 요구사항
- Node.js 18+
- PostgreSQL 12+
- npm 또는 yarn

### 1. 저장소 복제
```bash
git clone <repository-url>
cd tms
```

### 2. 패키지 설치
```bash
npm install
```

### 3. PostgreSQL 시작 (Docker)
```bash
docker run --name tms-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=tms_db \
  -p 5432:5432 -d postgres:15
```

### 4. 마이그레이션 & 샘플 데이터
```bash
npm run db:push      # DB 마이그레이션
npm run db:seed      # 샘플 데이터 생성
```

### 5. 개발 서버 실행
```bash
npm run dev
```

브라우저에서 `http://localhost:3000` 접속

---

## 🔑 테스트 계정

| 역할 | 이메일 | 비밀번호 |
|------|--------|---------|
| 관리자 | admin@example.com | admin123 |
| 기획자 | planner@example.com | planner123 |
| 작업자 | worker1@example.com | worker123 |

---

## 📁 프로젝트 구조

```
tms/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API Routes (18개)
│   │   ├── login/             # 로그인
│   │   ├── dashboard/         # 대시보드
│   │   ├── tasks/             # 업무 페이지
│   │   ├── calendar/          # 캘린더
│   │   └── stats/             # 통계
│   ├── components/            # React 컴포넌트
│   │   ├── task/              # 타이머 버튼
│   │   └── kanban/            # 칸반 보드
│   ├── hooks/                 # Custom Hooks
│   │   ├── useAuth.ts
│   │   ├── useTask.ts
│   │   └── useTimer.ts
│   ├── lib/                   # 유틸리티
│   │   ├── webhook.ts         # Webhook 서비스
│   │   ├── auth.ts            # NextAuth 설정
│   │   └── api-client.ts      # Axios 설정
│   └── types/                 # TypeScript 타입
├── prisma/
│   ├── schema.prisma          # DB 스키마
│   └── migrations/            # 마이그레이션
├── SETUP.md                   # 로컬 설정 가이드
├── WEBHOOK_SETUP.md           # Webhook 설정 가이드
└── package.json
```

---

## 🔌 API 엔드포인트 (18개)

### 인증
```
POST   /api/auth/[...nextauth]  # NextAuth
```

### 사용자
```
GET    /api/users               # 목록 (ADMIN만)
POST   /api/users               # 초대 (ADMIN만)
GET    /api/users/me            # 내 정보
```

### 업무
```
GET    /api/tasks               # 목록 조회
POST   /api/tasks               # 생성
GET    /api/tasks/[id]          # 상세 조회
PATCH  /api/tasks/[id]          # 수정
DELETE /api/tasks/[id]          # 삭제
PATCH  /api/tasks/[id]/status   # 상태 변경
```

### 타이머
```
GET    /api/tasks/[id]/timelogs            # 타임로그 조회
POST   /api/tasks/[id]/timelogs/start      # 타이머 시작
PATCH  /api/tasks/[id]/timelogs/[id]/stop  # 타이머 종료
PATCH  /api/tasks/[id]/timelogs/[id]/adjust # 공수 보정
```

### 통계
```
GET    /api/stats/workload      # 작업자 부하량
GET    /api/stats/summary       # 월간 요약
GET    /api/tasks/calendar      # 캘린더 데이터
```

---

## 🔧 명령어

```bash
# 개발
npm run dev                # 개발 서버 실행
npm run build             # 프로덕션 빌드
npm start                 # 프로덕션 서버

# 데이터베이스
npm run db:migrate        # 마이그레이션 dev 모드
npm run db:push          # 마이그레이션 실행
npm run db:seed          # 샘플 데이터 생성
npm run db:studio        # Prisma Studio (GUI)

# 개발도구
npm run lint             # ESLint 실행
```

---

## 📚 문서

- [SETUP.md](./SETUP.md) - 로컬 개발 환경 설정
- [WEBHOOK_SETUP.md](./WEBHOOK_SETUP.md) - **Slack, Jandi, 카톡 알림 설정** ⭐
- [doc/guide.md](./doc/guide.md) - 기술 사양서

---

## 🛠️ 기술 스택

| 영역 | 기술 |
|------|------|
| **런타임** | Node.js |
| **프레임워크** | Next.js 14 |
| **UI 라이브러리** | React 18, Material-UI |
| **스타일** | CSS Modules |
| **언어** | TypeScript |
| **인증** | NextAuth.js v5 |
| **ORM** | Prisma |
| **DB** | PostgreSQL |
| **알림** | Slack, Jandi, Kakao |

---

## 📋 완성 현황

| Phase | 기능 | 상태 |
|-------|------|------|
| Phase 1 | 기본 CRUD, 인증, 권한 | ✅ 완료 |
| Phase 2 | 타이머, 칸반 보드 | ✅ 완료 |
| Phase 3 | Webhook (3채널), 통계 | ✅ 완료 |

**전체 구현 상태**: ✅ 100% 완료

---

## 🔔 Webhook 알림 채널

### Slack ⭐⭐⭐⭐⭐
- **비용**: 무료
- **설정 난이도**: ⭐ 매우 쉬움
- **알림 방식**: 채널 메시지

### Jandi ⭐⭐⭐⭐
- **비용**: 무료
- **설정 난이도**: ⭐ 매우 쉬움
- **알림 방식**: 채널 알림

### 카카오톡 ⭐⭐⭐
- **비용**: 무료 (메모) / 유료 (알림톡)
- **설정 난이도**: ⭐⭐ 중간
- **알림 방식**: 개인 메시지

**설정 가이드**: [WEBHOOK_SETUP.md](./WEBHOOK_SETUP.md)

---

## 🚀 배포

### Vercel 배포 (권장)
```bash
vercel deploy --prod
```

### 환경변수 설정 (Vercel)
```
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=<생성된 비밀키>
NEXTAUTH_URL=https://your-app.vercel.app
SLACK_WEBHOOK_URL=https://hooks.slack.com/...
JANDI_WEBHOOK_URL=https://wh.jandi.com/...
KAKAO_WEBHOOK_URL=https://kapi.kakao.com/...
KAKAO_ACCESS_TOKEN=...
```

---

## 📊 페이지 목록

| URL | 설명 | 권한 |
|-----|------|------|
| `/` | 홈페이지 | 모두 |
| `/login` | 로그인 | 비인증 |
| `/dashboard` | 대시보드 | 인증자 |
| `/tasks` | 업무 목록 (배정, 상태 변경) | 인증자 |
| `/tasks/[id]` | 업무 상세 + 타이머 | 인증자 |
| `/tasks/kanban` | 칸반 보드 (드래그로 상태 변경) | 인증자 |
| `/calendar` | 배포 캘린더 | 인증자 |
| `/stats` | 통계 대시보드 | ADMIN, PLANNER |
| `/users` | 팀 사용자 관리 | ADMIN |

---

## 📝 라이센스

MIT

---

## 👨‍💻 개발자

TMS 개발팀

---

## 📧 문의

프로젝트에 대한 질문이나 제안은 Issue를 통해 보내주세요.
