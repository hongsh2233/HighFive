# High5 시스템 아키텍처

> **작성일** 2026-09-15
> 이 문서는 "무엇이 어디 있는지"를 다루는 `docs/PROJECT_STRUCTURE.md`와 달리, **시스템이 전체적으로 어떻게 동작하는지**(멀티테넌시, 인증 흐름, 배포 구조, 주요 서브시스템)를 다룬다. 코드 위치/파일 단위 세부사항은 `PROJECT_STRUCTURE.md`, 작업 이력은 `HISTORY.md`, 디자인 시스템은 `DESIGN.md` 참고.

## 1. 기술 스택

| 영역 | 선택 |
|---|---|
| 프레임워크 | Next.js 15 (App Router) |
| 언어 | TypeScript |
| DB | PostgreSQL 16 |
| ORM | Prisma 5 |
| 인증 | NextAuth.js v4 (Credentials Provider, JWT 세션) |
| 상태관리 | Zustand (일부 클라이언트 상태), 나머지는 컴포넌트 로컬 상태 + 서버 fetch |
| 스타일 | CSS Modules (Linear/Notion풍 디자인 토큰, `globals.css`) |
| AI | Anthropic / OpenAI / Google Gemini / Groq / NVIDIA NIM (멀티 프로바이더, 조직별 키 등록) |
| 배포 | Docker Compose (자체 서버, Nginx Proxy Manager 리버스 프록시) |

## 2. 배포 구조

```
[사용자] → Cloudflare → Nginx Proxy Manager → docker-compose
                                                 ├─ app (Next.js standalone, 3000포트)
                                                 ├─ db (Postgres, 내부망만)
                                                 ├─ migrate (1회성, prisma migrate deploy)
                                                 └─ seed (1회성, 초기 관리자 계정)
```

- `docker-compose.yml`: `app`/`migrate`/`seed`는 같은 Dockerfile을 빌드 스테이지만 다르게(`runner`/`builder`) 사용 — 스키마가 바뀐 배포는 **`docker compose build`(서비스명 생략) → `docker compose run --rm migrate` → `docker compose up -d app`** 순서가 필수. 서비스명 없이 build해야 `migrate`/`seed` 이미지도 같이 갱신된다.
- `Dockerfile`은 `output: "standalone"`(next.config.ts)을 사용하는 멀티스테이지 빌드.
- `db`는 `highfive-internal` 네트워크에만 있어 외부 노출 없음. `app`만 `proxy` 네트워크에도 붙어 Nginx Proxy Manager가 라우팅.
- 배포 도메인: `highfive.exawave.co.kr`, 조직은 `https://highfive.exawave.co.kr/{slug}/...` 형태 경로로 구분(서브도메인 아님).

## 3. 멀티테넌시 (조직 격리)

- `Organization` 모델이 최상위 테넌트 단위. 대부분의 모델(`User`, `Task`, `Project`, `AiSettings`, `Integration` 등)이 `organizationId`를 갖고, API 라우트는 세션의 `organizationId`로 항상 `where` 절을 스코프한다(`src/lib/utils.ts`의 `requireAuth`/`requireRole`이 세션에서 꺼내줌).
- URL 경로가 `/{slug}/...`인 것처럼 보이지만, 실제로는 Next.js의 `middleware.ts`가 slug 유무에 따라 redirect(slug 없음 → 있음)/rewrite(slug 있음 → 내부적으로 slug 제거)를 처리한다. 즉 `src/app/dashboard/page.tsx` 같은 페이지 파일 경로 자체에는 `[slug]`가 없고, 로그인 페이지(`src/app/[slug]/login/page.tsx`)만 예외적으로 slug를 실제 라우트 세그먼트로 사용한다.
- `SUPERADMIN` 역할은 조직에 속하지 않는 별도 계정으로, 전체 조직 목록/데모 신청/플랜 설정(`/superadmin/*`)을 관리한다.

## 4. 인증/인가

- NextAuth Credentials Provider(`src/lib/auth.ts`) — 이메일+비밀번호(+조직 slug, +TOTP 2FA 선택)로 로그인, JWT 세션에 `role`/`organizationId`/`organizationSlug`/`organizationPlan`을 실어둔다.
- 역할: `SUPERADMIN` > `ADMIN` > `LEADER` > `WORKER`. 대부분의 API는 `requireAuth()`(로그인만 확인) 또는 `requireRole(['ADMIN', ...])`(역할까지 확인) 헬퍼로 보호한다(`src/lib/utils.ts`).
- 플랜(`FREE`/`PRO`/`ENTERPRISE`, 마케팅명 무료/베이직/프로)별로 노출 가능한 메뉴가 다르며, `SystemConfig.planFeatures`(슈퍼관리자가 `/superadmin/plan-config`에서 설정)를 각 클라이언트가 `/api/plan-config`로 읽어와 사이드바(`AppShell.tsx`)의 `has(key)` 함수로 메뉴를 켜고 끈다. 이건 UI 노출 제어일 뿐이고, 실제 데이터 접근 차단은 API의 `requireRole`/`organizationId` 스코프가 담당한다.
- 2FA(TOTP), 세션 목록/강제 로그아웃, 감사 로그(`AuditLog`)는 `/settings/security`, `/settings/audit`에서 관리.

## 5. 화면 레이아웃 (2026-09 개편)

- `src/components/AppShell.tsx`가 인증된 모든 페이지의 공통 셸: **좌측 고정 사이드바**(로고 + 메뉴 그룹 + 계정 링크) + **상단 얇은 바**(통합검색 트리거, 로그인 사용자 이름, 로그아웃). `src/components/LayoutWrapper.tsx`가 로그인 페이지 여부에 따라 `AppShell`을 씌울지 결정.
- 메뉴 항목은 역할(`ADMIN`/`LEADER`/`WORKER`/`SUPERADMIN`)과 플랜 feature 플래그(`has()`)에 따라 동적으로 구성됨 — 하나의 `groups` 배열로 정의(`AppShell.tsx` 내부).
- 모바일(≤768px)에서는 사이드바가 오프캔버스 드로어로 전환.
- 각 페이지 자체의 본문 폭은 `globals.css`의 `--width-wide/standard/narrow/compact` 변수로 중앙 관리되며, 사이드바 폭(`--sidebar-width`)을 뺀 나머지 공간에서 알아서 중앙정렬된다 — 사이드바 도입 시에도 페이지별 CSS 수정이 거의 필요 없었던 이유.
- (계획) 2단계로 업무 목록 + 우측 상세 패널(마스터-디테일, URL 연동)이 예정되어 있음 — 아직 미착수.

## 6. 데이터 모델 개요

전체 36개 Prisma 모델. 핵심 도메인만 요약(전체 필드는 `prisma/schema.prisma` 또는 `PROJECT_STRUCTURE.md` 참고):

- **조직/사용자**: `Organization`, `User`(자기참조 `managerId`로 결재라인), `UserSession`, `InviteToken`
- **업무**: `Task`(등록자/작업자 분리, `TaskDependency`/`TaskChecklistItem`/`TaskComment`/`TaskHistory`/`TaskAttachment`/`TaskFieldValue`), `TimeLog`, `Template`
- **프로젝트**: `Project`, `ProjectMember`, `ProjectRole`(자유 역할), `ProjectStatus`(프로젝트별 커스텀 칸반 단계), `ProjectField`(프로젝트별 커스텀 속성)
- **협업**: `WikiPage`, `MeetingNote`, `Request`(전자결재), `Announcement`, `StickyNote`, `UserPage`(개인 자료)
- **알림**: `Notification`(웹훅 발송 로그), `UserNotification`(인앱 알림), `NotificationMute`
- **연동/AI**: `Integration`(Slack/잔디/Teams/Telegram/Kakao webhook), `GoogleCalendarConnection`/`GoogleCalendarEvent`(사용자별 OAuth), `AiSettings`(조직별 LLM 키 5종 + 기능별 프로바이더 선택 + 날씨/GitHub 키), `Inquiry`(홈페이지 문의)
- **운영**: `AuditLog`, `SystemConfig`(플랜별 메뉴 권한/가격), `DemoRequest`

## 7. AI 서브시스템

- 진입점: `src/lib/ai.ts`의 `callLLM(provider, prompt, maxTokens, apiKey)` — provider는 `ANTHROPIC | OPENAI | GEMINI | GROQ | NVIDIA`. Groq/NVIDIA는 OpenAI SDK를 `baseURL`만 바꿔 재사용(OpenAI 호환 API).
- `src/lib/ai-settings.ts`: 조직의 `AiSettings`에서 프로바이더별 키를 복호화해서 꺼내주고(`getOrgProviderKey`), 기능별로 어떤 프로바이더를 쓸지(`featureProviders` JSON, 없으면 등록된 키 중 첫 번째로 폴백)를 결정하는 `getFeatureProvider()`가 핵심.
- AI 기능 8종(`taskDraft`/`taskSummary`/`aiSearch`/`weeklyReport`/`workloadInsight`/`meetingSummary`/`meetingToTask`/`weatherGreeting`)은 각각 `/api/ai/*` 라우트 + 조직 설정 화면(`/settings/ai`)의 토글로 켜고 끔.
- NVIDIA NIM 프로바이더는 **FREE 플랜 조직에만** 노출(베이직/프로 플랜에서는 UI에서 숨김) — `organizationPlan` 체크로 구현.

## 8. 외부 연동

- **메신저 웹훅** (`Integration` 모델): Slack/잔디/Teams/Telegram/Kakao — `/settings/integrations`에서 로그인한 누구나(ADMIN/LEADER/WORKER) 설정 가능.
- **구글 캘린더**: OAuth(`src/lib/google-calendar.ts`), 사용자별 연결(`GoogleCalendarConnection`), 업무/휴가 이벤트를 자동 동기화(단방향: High5 → Google만).
- **구글 드라이브**: 캘린더와 동일 OAuth 클라이언트에 `drive.file` 스코프 추가 재사용(`src/lib/google-drive.ts`), 앱 전용 폴더("High5 첨부파일") 안에서 업로드/목록/삭제.

## 9. 개발/배포 워크플로

`docs/workflow.md`(요약이 `.claude/skills/dev-workflow/SKILL.md`) 참고. 핵심:
1. 작업 전 `PROJECT_STRUCTURE.md` 확인
2. 작업 후 `HISTORY.md` 기록 + `PROJECT_STRUCTURE.md` 갱신
3. `npx tsc --noEmit` → `npx next build` 통과 확인 후에만 커밋
4. `main` 브랜치에 직접 커밋/푸시(별도 브랜치 경유 금지 — 과거 브랜치 분기로 배포 반영이 안 되던 사고 이후 확정된 규칙)
5. 스키마 변경이 있으면 배포 안내에 `docker compose run --rm migrate`를 반드시 포함
