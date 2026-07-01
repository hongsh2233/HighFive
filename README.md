# High5 - Task Management System

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
- **외부연동**: Slack / 잔디 / Microsoft Teams / 텔레그램 / 카카오톡 webhook 알림 (ADMIN이 `/settings/integrations`에서 채널별 설정+테스트 발송)
- **구글 캘린더 연동**: `/settings/calendar-sync`에서 개인 구독 URL 발급/복사
- **프로젝트 위키**: 프로젝트별 문서 작성/조회(소속 멤버만), 우하단 플로팅 버튼으로 전체 위키 검색
- **CSV/Excel 내보내기**: 업무 목록 파일 다운로드
- **인증 & 권한**: NextAuth.js 기반 로그인, 역할 기반 접근 제어(ADMIN/LEADER/WORKER)
- **공지**: 헤더 하단 배너 공지 (ADMIN/LEADER 작성, X로 닫기)
- **신청**: 휴가/비품 신청 + 리더 결재, ADMIN/LEADER는 전결(즉시 확정+공지 게시) 가능, 승인된 휴가는 캘린더에 표시

### 역할별 권한

| 역할 | 코드 | 권한 |
|------|------|------|
| 관리자 | `ADMIN` | 전체 시스템 관리, 사용자 초대/관리, 통계, 내보내기 |
| 리더 | `LEADER` | 업무 생성/배정, 검수 승인, 통계 조회, 칸반/캘린더, 공지 작성, 신청 결재/전결 |
| 작업자 | `WORKER` | 배정된 업무 수행, 타이머 기록, 업무 상태 변경, 휴가/비품 신청 |

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

## Railway 배포

이 프로젝트는 빌드 시 `prisma db push`가 자동으로 실행되도록 구성되어 있어, Railway에 배포하면 별도 마이그레이션 명령 없이 DB 스키마가 자동으로 생성/갱신됩니다.

### 1. 프로젝트 생성 & Postgres 추가
1. [Railway](https://railway.app) → **New Project** → 이 GitHub 저장소 연결
2. 같은 프로젝트에 **+ New → Database → PostgreSQL** 추가 → `DATABASE_URL`이 서비스에 자동 주입됨

### 2. 환경변수 설정
서비스 **Variables** 탭에서 아래 값을 등록합니다 (`DATABASE_URL`은 Postgres 플러그인이 자동으로 채워줌):
```env
NEXTAUTH_SECRET=<openssl rand -base64 32 로 생성>
NEXTAUTH_URL=https://<배포된 도메인>
NEXT_PUBLIC_API_BASE_URL=/api
```
Slack/Jandi/카카오톡/GitHub webhook 등 선택 항목은 필요할 때만 추가합니다.

### 3. 배포
- `main` 브랜치에 push하면 Railway가 자동으로 빌드/배포합니다.
- 빌드 커맨드(`npm run build` = `prisma generate && prisma db push --skip-generate && next build`)가 실행되며, 이 과정에서 `prisma db push`가 Railway Postgres에 현재 스키마(`prisma/schema.prisma`)를 자동 반영합니다. 즉 새 필드/모델을 추가해도 별도 마이그레이션 명령 없이 다음 배포 시 자동으로 DB에 생성됩니다.
- `postbuild`에서 `prisma/init.ts`를 실행해 관리자 계정(`admin@admin.co.kr` / `Admin@2024!`)을 자동 생성합니다. **배포 후 반드시 비밀번호를 변경하세요.**
- 헬스체크: `GET /api/health` (DB 연결까지 확인). `railway.json`에 헬스체크 경로/재시작 정책이 설정되어 있습니다.

### 4. 샘플 데이터(선택)
운영 환경에는 권장하지 않지만, 필요 시 Railway CLI로 1회 실행할 수 있습니다:
```bash
railway run npm run db:seed
```

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
