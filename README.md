# TMS - Task Management System

> AI 웹 개발 비즈니스에 최적화된 경량 업무 관리 플랫폼
>
> **기술 스택**: Next.js 15 · Prisma 5 · PostgreSQL · NextAuth.js 4 · Zustand · MUI

---

## 주요 기능

- **업무 관리**: 생성/배정/수정/삭제, 제목에서 RMS 번호 자동 파싱, 상태 전이 (`ASSIGNED → PROGRESS → REVIEW → QA → DONE`)
- **칸반 보드**: 5단계 드래그 앤 드롭으로 상태 변경
- **시간 추적**: 원클릭 타이머 시작/종료, 수동 공수 보정(±h)
- **배포 캘린더**: 목표일 기준 월별 업무 시각화, 캘린더 구독용 iCal URL 발급
- **통계 대시보드**: 작업자별 부하량, 월간 완료율 차트
- **업무 히스토리**: 상태 변경/담당자 변경/타이머 이벤트 기록
- **프로젝트 관리**: 프로젝트 단위로 업무 묶기, 프로젝트 멤버 관리
- **GitHub 연동**: PR이 머지되면 webhook으로 연결된 업무 자동 갱신
- **알림**: 인앱 알림 벨 + Slack / Jandi / 카카오톡 webhook 알림
- **CSV/Excel 내보내기**: 업무 목록 파일 다운로드
- **인증 & 권한**: NextAuth.js 기반 로그인, 역할 기반 접근 제어(ADMIN/PLANNER/WORKER)

### 역할별 권한

| 역할 | 코드 | 권한 |
|------|------|------|
| 관리자 | `ADMIN` | 전체 시스템 관리, 사용자 초대/관리, 통계, 내보내기 |
| 기획자 | `PLANNER` | 업무 생성/배정, 검수 승인, 통계 조회, 칸반/캘린더 |
| 작업자 | `WORKER` | 배정된 업무 수행, 타이머 기록, 업무 상태 변경 |

---

## 빠른 시작

### 사전 요구사항
- Node.js 18+
- PostgreSQL 12+
- npm

### 1. 설치
```bash
git clone <repository-url>
cd tms
npm install
```

### 2. PostgreSQL 실행 (Docker)
```bash
docker run --name tms-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=tms_db \
  -p 5432:5432 -d postgres:15
```

### 3. 환경변수 설정

`.env.local` 파일을 만들고 아래 값을 채웁니다 (필수 항목은 `docs/PROJECT_STRUCTURE.md` 참고):

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/tms_db
NEXTAUTH_SECRET=<openssl rand -base64 32 로 생성>
NEXTAUTH_URL=http://localhost:3000
NEXT_PUBLIC_API_BASE_URL=/api
```

### 4. 마이그레이션 & 샘플 데이터
```bash
npm run db:push      # 스키마 반영
npm run db:seed      # 샘플 데이터 생성 (admin 계정 포함)
```

### 5. 개발 서버 실행
```bash
npm run dev
```
`http://localhost:3000` 접속

---

## 명령어

```bash
npm run dev          # 개발 서버 실행
npm run build         # 프로덕션 빌드 (prisma generate + db push 포함)
npm start              # 프로덕션 서버 실행

npm run db:push       # Prisma 스키마 → DB 반영
npm run db:migrate    # 마이그레이션 dev 모드
npm run db:seed       # 샘플 데이터 생성
npm run db:studio     # Prisma Studio (GUI)
npm run db:generate   # Prisma client 생성

npm run lint           # ESLint 실행
```

---

## Webhook 알림 설정

상태 변경 시 Slack, Jandi, 카카오톡으로 자동 알림을 보낼 수 있습니다. 모두 선택 사항이며 환경변수가 설정된 채널만 발송됩니다.

### Slack
1. [Slack API 콘솔](https://api.slack.com/apps) → **Create New App** → **From scratch**
2. **Incoming Webhooks** 활성화 → 채널 선택 → Webhook URL 복사
3. 환경변수 추가:
```env
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/XXX/XXX/XXX
```

### Jandi
1. [Jandi](https://www.jandi.com) → 팀/채널 → 설정 → **커넥트** → **+새로운 커넥트**
2. Webhook URL 복사
```env
JANDI_WEBHOOK_URL=https://wh.jandi.com/connect-api/webhook/xxxxx
```

### 카카오톡 (카카오톡 메모로 발송)
1. [카카오 개발자 센터](https://developers.kakao.com/) → 애플리케이션 생성 → 카카오 로그인 활성화
2. 로그인 후 액세스 토큰 발급
```env
KAKAO_WEBHOOK_URL=https://kapi.kakao.com/v2/api/talk/memo/default/send
KAKAO_ACCESS_TOKEN=YOUR_ACCESS_TOKEN
```

### GitHub PR 연동
업무를 GitHub PR 링크와 연결(`Task.externalLink`)해두면, 해당 PR이 머지될 때 GitHub webhook이 업무를 자동으로 갱신합니다.

1. 저장소 **Settings → Webhooks → Add webhook**
2. Payload URL: `https://<your-domain>/api/webhooks/github`
3. Content type: `application/json`, Event: `Pull requests`
4. Secret 설정 후 환경변수에 동일한 값 등록:
```env
GITHUB_WEBHOOK_SECRET=<webhook secret>
```

### 트러블슈팅
- 환경변수가 비어 있으면 해당 채널은 콘솔에 경고만 남기고 조용히 스킵됩니다 (`src/lib/webhook.ts`).
- 알림이 안 올 때는 `npm run dev` 로그에서 webhook 관련 메시지를 확인하세요.
- Webhook URL은 외부에 노출하지 마세요. `.env.local`은 `.gitignore`에 포함되어 있습니다.

---

## 더보기

- [docs/PROJECT_STRUCTURE.md](./docs/PROJECT_STRUCTURE.md) — DB 스키마, 디렉터리 구조, API 전체 목록, 디자인 시스템

---

## 라이센스

MIT
