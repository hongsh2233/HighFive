# 외부 연동/자동화 확장 — 상세 설계

> `docs/ROADMAP_AI_AUTOMATION.md` 3번 항목("외부 연동 및 자동화")의 구체 설계 문서.
> 이 문서도 즉시 착수 대상이 아니라 실제 착수 시 참고할 설계안이다.

## 현재 상태 재확인

- **아웃바운드 알림 인프라는 이미 있다**: `src/lib/integrations.ts`가 SLACK/JANDI/
  TEAMS/TELEGRAM/KAKAO 5개 채널에 대해 `Integration` 테이블(DB 설정) → env 폴백
  순서로 설정을 읽어 `dispatch()`로 발송한다. `src/lib/webhook.ts`의
  `notifyStatusChange()`가 **업무 상태 변경 시에만** 이 5채널 전체에 브로드캐스트하는
  단일 하드코딩 트리거다(`src/app/api/tasks/[id]/status/route.ts:87`에서 호출).
- **레거시 중복 코드**: `src/lib/services/webhook.service.ts` +
  `src/app/api/webhooks/slack/route.ts`가 Slack/Jandi만 지원하는 구버전 발송 로직을
  담고 있는데, 현재 상태 변경 흐름에서는 호출되지 않는 죽은 코드로 보인다(실제 호출
  경로는 `src/lib/webhook.ts` 하나뿐). 자동화 엔진 작업과 함께, 혹은 더 이르게
  독립적으로 정리 대상.
- **트리거 조건화가 전혀 없다**: "특정 라벨이 붙으면", "목표일이 임박/경과하면" 같은
  조건부 자동화가 불가능하다. `Task.labels`(콤마 구분 문자열, `src/lib/constants.ts`의
  `TASK_LABEL_LIST = ['URGENT','WEEKEND','EMERGENCY']`)와 `Task.targetDate`는 이미
  있는 필드라 조건 판단 자체는 가능하지만, 이를 감시해서 발송을 트리거하는 로직이 없다.
- **시간 기반 트리거(목표일 임박/경과)는 스케줄러가 필요**한데, cron/job queue
  라이브러리가 전혀 없고(`package.json` 확인), Railway 배포(`railway.json`)에는
  Vercel Cron 같은 내장 스케줄러가 없다.
- **인바운드 웹훅(외부 → High5)은 전혀 없다.** 구체적 요구사항(어떤 외부 시스템에서
  무엇을 받을지)이 아직 없으므로, 이번 설계는 아웃바운드 자동화 확장에 집중하고
  인바운드는 확장 여지만 남겨둔다.

## Phase 1: 트리거 종류 확장 (하드코딩, 낮은 리스크)

기존 `notifyStatusChange()` 패턴을 그대로 복제해 2가지 트리거를 추가한다 — 새 모델
없이 기존 `Integration`/`dispatch()` 인프라만 재사용.

### 1-A. 라벨 부착 트리거
- **발생 지점**: `POST /api/tasks`(생성 시 라벨 포함) 및 `PATCH /api/tasks/[id]`
  (라벨 변경 시) — 두 라우트 모두 `labels` 필드를 다룬다.
- **로직**: `src/lib/webhook.ts`에 `notifyLabelAttached(payload)` 추가. 라벨 중
  `URGENT`(긴급)가 새로 붙었을 때만 발송(전체 라벨에 대해 매번 쏘면 노이즈가 커지므로
  1차는 "긴급" 라벨 한정 — 실사용 패턴을 보고 확장 여부 판단).
- **비교 대상**: 생성 시엔 무조건 신규 라벨이므로 그대로 발송, 수정 시엔 변경 전
  `labels`와 비교해 "이전에 없던 URGENT가 새로 생겼을 때"만 발송(단순
  `!prevLabels.includes('URGENT') && nextLabels.includes('URGENT')`).

### 1-B. 목표일 임박/경과 트리거 (스케줄 기반)
- **엔드포인트**: `POST /api/automation/due-date-check`(신규) — 매일 1회 배치성으로
  실행되는 보호된 라우트. `Authorization: Bearer ${AUTOMATION_CRON_SECRET}` 헤더로만
  호출 허용(세션 인증이 아닌 서버-to-서버 시크릿 — `requireAuth()`와 별개의 간단한
  토큰 비교 함수 신규 작성).
- **로직**: 오늘 기준 `targetDate`가 "내일"(D-1, 임박)이거나 "오늘 이전이고 아직
  DONE 아님"(경과)인 업무를 조회 → 담당자별로 묶어 `notifyDueDate(payload)`(신규,
  `src/lib/webhook.ts`)로 발송. 매일 같은 업무에 중복 발송되지 않도록 `Task`에
  `lastDueReminderAt DateTime?` 컬럼을 추가하고, 발송 후 갱신 + 조회 시
  `lastDueReminderAt`가 오늘이 아닌 것만 대상으로 필터(순수 신규 컬럼이라
  `@map` 불필요, 데이터 무손실 이슈 없음).
- **스케줄 트리거 방식**: Railway는 서비스 단위로 Cron Schedule을 지원하므로,
  `railway.json`에 이 라우트를 주기 호출하는 별도 Cron 서비스를 추가하거나(권장),
  외부 무료 크론(GitHub Actions scheduled workflow, cron-job.org 등)이 매일 정해진
  시간에 위 엔드포인트를 호출하도록 구성 — 코드베이스에는 라우트만 구현하고 실제
  스케줄 등록은 배포 설정(코드 밖) 작업.

### Phase 1 건드릴 파일
- `prisma/schema.prisma` — `Task.lastDueReminderAt DateTime?` 추가
- `src/lib/webhook.ts` — `notifyLabelAttached()`, `notifyDueDate()` 추가
- `src/lib/automation-auth.ts`(신규) — cron 시크릿 검증 헬퍼
- `src/app/api/tasks/route.ts`, `src/app/api/tasks/[id]/route.ts` — 라벨 변경 감지 후
  `notifyLabelAttached()` 호출 추가
- `src/app/api/automation/due-date-check/route.ts`(신규) — 배치 엔드포인트
- 배포 문서에 `AUTOMATION_CRON_SECRET` 안내 추가

## Phase 2: 일반화된 자동화 규칙 엔진 (선택적 후속, 중~상 난이도)

Phase 1의 사용 패턴을 본 뒤 "규칙을 관리자가 직접 구성하고 싶다"는 요구가 확인되면
착수. 스키마/구조를 미리 설계해둔다.

### 스키마 (`prisma/schema.prisma`)
```prisma
model AutomationRule {
  id              Int      @id @default(autoincrement())
  name            String
  projectId       Int?     // null이면 전체 프로젝트 대상
  triggerType     String   // STATUS_CHANGED | LABEL_ATTACHED | DUE_SOON | OVERDUE
  triggerConfig   String   // JSON 문자열: {"toStatus":"REVIEW"} | {"label":"URGENT"} | {"daysBefore":1}
  channels        String   // 콤마 구분 IntegrationChannel 목록, 예: "SLACK,KAKAO"
  messageTemplate String   // "{{title}} 이(가) {{status}}(으)로 변경됨" 형태, 플레이스홀더 치환
  isEnabled       Boolean  @default(true)
  createdById     Int
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  project         Project? @relation(fields: [projectId], references: [id])
  createdBy       User     @relation(fields: [createdById], references: [id])

  @@map("automation_rules")
}
```
(JSON을 별도 컬럼이 아니라 문자열로 저장하는 이유: `ProjectField.options` 등 기존
스키마도 구조화 데이터를 문자열 필드로 저장하는 패턴을 이미 쓰고 있어 일관성 유지 —
Prisma `Json` 타입 대신 앱 레벨에서 `JSON.parse`/`stringify`.)

### 평가 엔진
- `src/lib/automation-engine.ts`(신규): `evaluateRules(triggerType, context)` —
  해당 트리거 타입 + (context.projectId와 일치하거나 projectId가 null인) 활성 규칙을
  조회 → `triggerConfig` 조건이 context와 맞는지 확인 → 맞으면 `messageTemplate`을
  context로 치환해 `channels`에 명시된 각 채널로 `sendToChannel()`(기존
  `integrations.ts` 함수 재사용) 호출.
- 호출 지점: 상태 변경 라우트, 라벨 변경 지점, Phase 1의 due-date-check 배치 —
  기존 하드코딩 `notifyXxx()` 호출을 이 엔진 호출로 교체(하위호환을 위해 "기본 규칙"을
  마이그레이션 스크립트로 미리 심어 기존 동작을 그대로 재현).

### API
- `GET/POST /api/automation-rules`(신규, ADMIN/LEADER) — 목록/생성
- `PATCH/DELETE /api/automation-rules/[id]`(신규)

### 설정 UI
- `src/app/settings/automation/page.tsx`(신규) — `/settings/integrations`와 동일한
  카드/폼 스타일(`integrations.module.css` 패턴 재사용). 규칙 목록 테이블 + "새 규칙"
  폼(트리거 타입 select → 타입별 조건 입력 필드 동적 노출 → 채널 체크박스 → 메시지
  템플릿 textarea, 플레이스홀더 힌트 표시).

### Phase 2 건드릴 파일
- `prisma/schema.prisma` — `AutomationRule` 모델 추가
- `src/lib/automation-engine.ts`(신규)
- `src/app/api/automation-rules/route.ts`, `src/app/api/automation-rules/[id]/route.ts`(신규)
- `src/app/settings/automation/page.tsx` + module.css(신규)
- `src/components/AppHeader.tsx` — 설정 드롭다운에 "자동화 규칙" 링크 추가
- 기존 `notifyStatusChange()` 등 하드코딩 호출부를 엔진 호출로 점진 교체

### 레거시 정리 (Phase 2와 함께, 또는 더 일찍 독립적으로 가능)
- `src/lib/services/webhook.service.ts`, `src/app/api/webhooks/slack/route.ts`가
  실제로 어디서도 호출되지 않는 죽은 코드인지 재확인 후 삭제.

## 스코프 밖 (이번 설계에 포함하지 않음)
- **인바운드 웹훅**: 구체적 요구사항이 없어 이번엔 설계하지 않음. 실제 필요(예:
  "지라 이슈 생성 시 High5에 업무 자동 등록")가 생기면 그때 별도 설계.
- **일정(몇 주 소요)**: 이 문서에서도 다루지 않음, 착수 시 재논의.

## 착수 시 체크리스트
1. Phase 1부터 시작(리스크 낮음, 기존 인프라 재사용) — 라벨/목표일 트리거 실사용
   피드백 수집.
2. 피드백 기반으로 Phase 2(규칙 엔진) 착수 여부 결정.
3. Phase 1 또는 그 이전에 레거시 `webhook.service.ts` 경로 정리(사용 여부 재확인
   후 삭제).
4. 배포 크론 설정은 코드 작업과 별개로 인프라 담당자와 조율 필요(Railway Cron
   Schedule 또는 외부 크론 서비스).
