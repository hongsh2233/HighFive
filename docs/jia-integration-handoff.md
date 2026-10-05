# JIA 연동 인계 문서 (H5-00 ~ H5-04, 1차 통합 범위)

> 대상: JIA 개발팀 + PM. 이번 문서는 "HighFive 읽기 + 댓글 작성" 1차 연동 범위에 한정됨.
> **쓰기 연동(업무 생성/수정/상태변경/삭제) 및 webhook은 이번 범위에서 제외**하고 후속 과제로 분리.

## 0. 1차 연동 범위 (확정)

- **허용**: 프로젝트·업무 조회(READ), 댓글 작성(COMMENT_CREATE)
- **보류**: 업무 생성·수정·상태 변경·삭제, webhook — 별도 요청 시 H5-05~08에서 진행
- **권한**: 서비스 키는 ADMIN이 선택한 프로젝트에만 READ + COMMENT_CREATE 부여(조직 전체 읽기는 ADMIN이 명시적으로 선택할 때만)
- **댓글 작성 조건**(아래 쪽에서 모두 구현·확인): JIA 작성 표시, 실행 이력 기록, 재시도 시 중복 댓글 방지

---

## 1. H5-00 완료 내역 (조직/프로젝트/업무 권한 검사 통일)

### 완료 커밋
- `0b2610e` fix: JIA 연동 준비 H5-00 - 조직/프로젝트 범위 권한 검사 누락 수정
  - 조직 격리(organizationId) 검사가 전혀 없던 9개 라우트 수정: 업무 댓글/히스토리/타임로그, 프로젝트 상태단계/커스텀필드/마일스톤/위키/회의록/주간보고
- `6e1746f` fix: 업무 목록-상세 권한 범위 불일치 수정 (WORKER/LEADER)
  - 목록(WORKER=본인담당, LEADER=소속프로젝트)과 상세/상태변경/댓글/히스토리/타임로그/의존성/체크리스트 간 권한 범위 불일치 수정. 공용 헬퍼 `canAccessTaskByRole()`(`src/lib/utils.ts`) 도입

### 권한 회귀 검사 결과

> **중요한 전제**: 이 환경은 실제 Postgres에 연결되지 않아(`DATABASE_URL` 미설정) HTTP 요청을 실제로 쏴보는 통합 테스트를 실행하지 못했다. 아래는 **코드 경로를 직접 추적해 확인한 결과**이며, 실 배포 환경에서 end-to-end로 한 번 더 확인이 필요하다.

| 시나리오 | 확인한 코드 경로 | 결과 |
|---|---|---|
| 다른 조직 A의 ADMIN이 조직 B 소속 업무/프로젝트 상태단계를 ID로 직접 조회 | `prisma.task.findFirst({ where: { id, organizationId } })` / `prisma.project.findFirst({ where: { id, organizationId } })` — organizationId는 세션의 조직으로 고정 | 404 (수정 전: 조직 무관 조회/수정 가능했음) |
| WORKER가 목록에 없는(본인 비담당) 업무를 ID로 상세조회/상태변경/댓글작성 | `canAccessTaskByRole(task, userId, 'WORKER')` → `task.workerId === userId`만 true | 404 |
| LEADER가 소속 프로젝트가 아닌 업무를 ID로 조회 | `canAccessTaskByRole` → `ProjectMember` 멤버십 조회 후 없으면 false | 404 |
| PARTNER가 미초대 프로젝트의 업무 조회 | 기존 `partnerScope`(DB 쿼리 레벨 필터) 유지, 신규 로직과 충돌 없음 확인 | 404 |
| ADMIN의 조직 내 전체 조회/상태변경 | `canAccessTaskByRole`에서 `role === 'ADMIN'` 즉시 true | 기존과 동일하게 전체 허용 |
| 체크리스트/첨부파일 **등록(POST)** 기존 권한(LEADER 조직 전체 허용, WORKER는 담당자/등록자만) | 이번 수정에서 의도적으로 손대지 않음(조회 GET만 수정) | 기존 동작 그대로 유지 확인 |

`npx tsc --noEmit` 오류 0개, `npx next build` 성공(두 커밋 각각 빌드 확인) — docs/HISTORY.md 2026-10-02 항목 참고.

---

## 2. H5-01 요약 — 업무/프로젝트 ID·상태 규칙

- **ID**: 모든 리소스는 자동증가 정수 PK(Prisma `@id @default(autoincrement())`). 조직 간 공유되는 전역 네임스페이스이므로 **ID만으로는 조직 소속을 알 수 없다** — 모든 조회는 반드시 호출자의 organizationId와 교차 검증해야 함(위 H5-00에서 바로 이 전제가 깨져 있던 경로들을 수정).
- **업무 상태(Task.status)**: 고정 enum이 아니라 프로젝트별 커스텀 상태(`ProjectStatus`, `GET /api/projects/[id]/statuses`)를 코드값(`code`, 예: `TODO`/`PROGRESS`/`DONE`)으로 참조. 프로젝트마다 상태 목록이 다를 수 있으므로, **업무의 `status` 문자열만으로 "완료 여부"를 판단하지 말고 해당 프로젝트의 상태 목록에서 `isDone`/`isProgress` 플래그를 조회**해야 함.
- **상태 전이 규칙**: 서버가 강제하는 유일한 제약은 (a) 선행 업무(`TaskDependency`)가 완료되지 않으면 차단 상태로의 전이를 막음, (b) `requireCompletionApproval`이 켜진 업무는 등록자/ADMIN만 완료(isDone) 전이 가능. 그 외 임의 상태 전이는 모두 허용(워크플로우 엔진 아님).
- 이번 1차 범위에서는 **상태 변경 API(PATCH /api/tasks/[id]/status)를 서비스 인증에 열지 않았음** — JIA는 조회만 하고 전이는 HighFive 내부 사용자가 수행.

---

## 3. H5-02 — 서버 간 인증 (구현 완료)

### 정책 요약

| 항목 | 내용 |
|---|---|
| 모델 | `ServiceCredential`(조직별 발급) — 평문 키는 발급 시 1회만 노출, DB에는 `sha256` 해시만 저장 |
| 전송 방식 | `Authorization: Bearer <평문키>` 헤더 |
| 권한 종류 | `READ`, `COMMENT_CREATE` 2종만 존재(쉼표 구분 저장). **업무 생성/수정/상태변경/삭제는 이 권한 목록에 없고, 해당 API들은 서비스 인증 자체를 받지 않도록 구현** — 권한을 아무리 부여해도 그 엔드포인트들은 거부됨(설계상 원천 차단, 권한 체크 누락에 의존하지 않음) |
| 기본 접근 범위 | `allowOrgWide=false`(기본) → `ServiceCredentialProject` 조인 테이블로 **명시적으로 선택한 프로젝트만** 허용. `allowOrgWide=true`는 ADMIN이 발급/수정 화면에서 **명시적으로 체크해야만** 가능 |
| 발급/조회/회수/범위변경 | `POST/GET /api/settings/service-keys`, `PATCH /api/settings/service-keys/[id]` (모두 ADMIN 전용) |
| 만료 | `expiresAt` 지나면 모든 요청 401 |
| 즉시 회수 | `PATCH { revoke: true }` → `revokedAt` 기록, 이후 모든 요청 401 (캐시 없음 — 요청마다 DB 조회) |

### 서비스 계정 정책이 일반 사용자 역할과 다른 점

| | 일반 사용자(ADMIN/LEADER/WORKER/PARTNER) | 서비스 자격 증명 |
|---|---|---|
| 인증 수단 | 세션(로그인 쿠키, NextAuth) | API 키(Bearer 토큰) — 비밀번호/세션 없음 |
| 신원 | 조직에 속한 실제 User 레코드 (역할 고정: ADMIN/LEADER/WORKER/PARTNER) | User가 아님 — 조직에 귀속된 별도 `ServiceCredential` 레코드. "역할"이 없고 `permissions`(READ/COMMENT_CREATE) 조합만 존재 |
| 접근 범위 산정 방식 | 역할에 따라 동적 산정(WORKER=본인담당, LEADER=소속프로젝트 멤버십, PARTNER=초대 프로젝트) | 발급 시점에 ADMIN이 프로젝트 단위로 **정적으로 지정**(또는 조직 전체). 역할 기반 동적 산정 없음 |
| 쓰기 가능 범위 | 역할에 따라 업무 생성/수정/상태변경/댓글 등 다양 | 댓글 작성만 가능(그 외 쓰기 API는 서비스 인증을 아예 받지 않음) |
| 만료/회수 | 로그인 세션 30분 자동 만료, 계정 비활성화로 즉시 차단 | 자격증명 단위로 `expiresAt`/`revokedAt` 별도 관리 — 특정 연동 하나만 끄거나 기간을 줄일 수 있음 |
| 감사 추적 | `TaskHistory`(업무 변경 이력)에 사용자 기준으로 기록 | `ServiceRequestLog`에 자격증명+`externalRequestId` 기준으로 기록(요청 단위 재현 가능) |

### 검증 결과 (코드 경로 추적 기준, 위와 동일한 전제)

| 검증 항목 | 확인 내용 | 결과 |
|---|---|---|
| 만료된 키로 요청 | `requireServiceAuth`에서 `expiresAt < now()` 즉시 401 | 통과 |
| 회수(`revoke:true`) 직후 요청 | `revokedAt` 존재 시 401. 캐시가 없어 PATCH 직후 다음 요청부터 반영 | 통과 |
| 프로젝트 범위 변경(PATCH projectIds) 직후 요청 | `ServiceCredentialProject` 트랜잭션 교체 후, 매 요청마다 `serviceProjectAllowed()`가 최신 레코드로 재조회 | 통과(캐시 없음) |
| READ 전용 키로 댓글 작성 시도 | `serviceHasPermission(credential, 'COMMENT_CREATE')` false → 403 | 통과 |
| 아무 서비스 키로 업무 생성(`POST /api/tasks`)/수정(`PATCH /api/tasks/[id]`)/상태변경(`PATCH /api/tasks/[id]/status`) 시도 | 세 라우트 모두 `requireAuth()`(세션 전용)만 사용, `Authorization` 헤더를 아예 해석하지 않음 → Bearer 토큰은 무시되고 세션 없으므로 401 | 통과 — "읽기 키로 업무 생성/상태변경이 거부"됨을 "권한 체크"가 아니라 "그 경로 자체가 서비스 인증을 모른다"로 더 강하게 보장 |
| allowOrgWide=false인데 범위 밖 프로젝트의 업무 조회 | `serviceProjectAllowed`가 false → 404 | 통과 |

---

## 4. H5-03/04 — 읽기 API 명세 + 테스트 인계

### 4-1. 공통 래퍼 — **예외 있음, 반드시 확인**

대부분의 API는 아래 포맷을 쓰지만, **댓글(`/api/tasks/[id]/comments`)과 체크리스트(`/api/tasks/[id]/checklist`) 두 경로는 예외**다(기존부터 그랬고, 이번 작업에서 새로 만든 것이 아님 — 실제 소스 확인 완료).

**표준 포맷** (`GET /api/tasks`, `/api/tasks/[id]`, `/api/projects`, `/api/projects/[id]`, `/api/projects/[id]/statuses` 등 대다수):
```json
{
  "success": true,
  "data": { ... },
  "message": "조회 완료",
  "timestamp": "2026-10-02T04:00:00.000Z"
}
```
에러도 같은 래퍼 + `code` 필드:
```json
{ "success": false, "data": null, "message": "프로젝트를 찾을 수 없습니다.", "code": "AUTH_401", "timestamp": "..." }
```

**예외: 댓글/체크리스트**는 `{ data: ... }` 또는 `{ message: ... }`만 반환하고 `success`/`code`/`timestamp` 필드가 없다. HTTP 상태코드로만 성공/실패를 구분해야 한다.
```json
// GET /api/tasks/1/comments → 200
{ "data": [ { "id": 10, "content": "...", "author": { "id": 3, "name": "홍길동" }, "replies": [...] } ] }

// POST /api/tasks/1/comments 실패 → 404 (성공 시 body는 { "data": {...comment} })
{ "message": "업무를 찾을 수 없습니다." }
```
→ **JIA 클라이언트는 `success` 필드 존재 여부로 분기하지 말고, 엔드포인트별로 두 포맷 중 어느 쪽인지 하드코딩해서 파싱해야 함.**

### 4-2. 업무 목록 — `GET /api/tasks`

인증: 세션 또는 `Authorization: Bearer <key>`(READ 권한).

요청 예:
```
GET /api/tasks?projectId=12&status=PROGRESS&page=1&limit=20
Authorization: Bearer sk_live_...
```
응답(표준 래퍼, `data` 안에 또 `data`+페이지 정보가 중첩됨에 주의):
```json
{
  "success": true,
  "data": {
    "data": [
      { "id": 101, "title": "...", "status": "PROGRESS", "workerId": 7, "projectId": 12,
        "worker": { "id": 7, "name": "..." }, "registrant": { "id": 3, "name": "..." },
        "project": { "id": 12, "name": "..." }, "hasIncompleteBlockers": false, ... }
    ],
    "total": 42,
    "page": 1,
    "limit": 20
  },
  "message": "업무 목록 조회 완료",
  "timestamp": "..."
}
```
**페이지 규칙**: `page`(1-base, 기본 1), `limit`(기본 10). `total`은 필터 적용 후 전체 건수, `skip = (page-1)*limit`. 서비스 키로 호출 시 `projectId`를 지정해도 **자격증명에 허용된 프로젝트 범위를 벗어나면 결과가 0건**(요청이 거부되는 게 아니라 조용히 빈 목록).

### 4-3. 업무 상세 — `GET /api/tasks/[id]`
- 성공 200: `{ success:true, data: { ...task 전체 필드, timeLogs, fieldValues, attachments, checklistItems 포함 }, message, timestamp }`
- 없음/권한없음 404: `{ success:false, data:null, message:"업무를 찾을 수 없습니다.", code:"TASK_404", timestamp }` — **존재하지 않는 것과 권한 없는 것을 구분하지 않음**(의도적, 존재 여부 노출 방지)
- 잘못된 ID(숫자 아님) 400: `code:"VALID_400"`

### 4-4. 프로젝트 목록/상세 — `GET /api/projects`, `GET /api/projects/[id]`
- 목록 성공 200: `{ success:true, data: [ { id, name, members:[...], roles:[...], _count:{tasks}, ... } ], message, timestamp }` (페이지네이션 없음 — 전체 반환)
- 상세 404: `{ success:false, data:null, message:"프로젝트를 찾을 수 없습니다.", code:"ERROR", timestamp }` — 이 라우트는 `errorResponse()` 호출 시 세 번째 인자(구체적 code)를 넘기지 않아 기본값 `"ERROR"`가 그대로 내려감(다른 라우트의 `TASK_404`/`VALID_400`처럼 구체적이지 않음) — JIA는 이 엔드포인트의 404를 `code` 문자열로 구분하지 말고 HTTP 상태코드(404)로만 판단할 것.

### 4-5. 프로젝트 상태 목록 — `GET /api/projects/[id]/statuses`
- 200: `{ success:true, data: [ { id, projectId, code, label, color, order, isProgress, isDone } ], message:"상태 단계 조회 완료" }` — 커스텀 상태가 없으면 `message`가 "...(기본값)"으로 바뀌고 `id:null`인 기본 5단계가 내려옴.
- **업무의 완료 여부 판정은 반드시 이 API로 해당 프로젝트의 상태 목록을 가져와 `isDone:true`인 `code`와 업무의 `status`를 비교**(H5-01 참고, 고정 enum 아님).

### 4-6. 에러 코드 정리(관찰된 것)

| code | 상황 |
|---|---|
| `AUTH_401` | 인증 실패(세션 없음/만료 키/회수된 키/유효하지 않은 키) |
| `AUTH_403` | 권한 부족(COMMENT_CREATE 없는 키로 댓글 시도 등) |
| `VALID_400` | 요청 파라미터 오류(ID 형식 등) |
| `TASK_404` / 코드 없는 404 | 리소스 없음 또는 범위 밖(구분 안 함) |
| 댓글/체크리스트 경로 | `code` 필드 자체가 없음, HTTP 상태만으로 판단 |

### 4-7. 댓글 작성(JIA 1차 범위에 포함된 유일한 쓰기) — `POST /api/tasks/[id]/comments`

인증: `Authorization: Bearer <key>` (COMMENT_CREATE 권한 필요).

요청:
```json
POST /api/tasks/101/comments
Authorization: Bearer sk_live_...
{
  "content": "JIA 분석 결과: ...",
  "externalRequestId": "jia-req-20261002-abc123"
}
```
- `externalRequestId` **필수**(멱등성 키). 같은 키로 재시도하면 새 댓글을 만들지 않고 기존 댓글을 그대로 반환(첫 성공은 201, 재시도는 200).
- 응답 `data.source`가 `"JIA"`, `data.externalAuthorLabel`이 자격증명 이름(예: "JIA 연동")으로 채워짐 — 화면에도 이 라벨로 표시되어 내부 사용자 댓글과 구분됨.
- 프로젝트 범위 밖 업무면 404, COMMENT_CREATE 권한 없으면 403, `content`/`externalRequestId` 누락이면 400.
- 모든 시도는 `ServiceRequestLog`(자격증명ID + externalRequestId + 결과)에 기록되어 실행 이력 추적 가능.
- **이 경로는 응답 포맷이 표준 래퍼가 아님**(4-1 참고) — `{ data: {...} }` / `{ message: "..." }`.

---

### 4-8. 지아 수신함 — `GET /api/integrations/jia/inbox`

지아(HighFive에 가입된 지아 계정)에게 **배정된 업무**와 지아가 **@멘션된 댓글**을 한 번에 조회한다. 지아 서버가 5분마다 호출해 새 항목을 알림으로 만든다.

- 인증: `Authorization: Bearer <서비스 키>`만 허용(세션 호출은 403). `READ` 권한 필요.
- 쿼리: `userEmail`(필수, 지아 계정 이메일 — 키와 같은 조직의 활성 사용자만), `since`(선택, ISO. 기본 최근 24시간, 최대 7일 전까지로 잘림)
- 범위: 키의 조직 + 허용 프로젝트(`allowOrgWide`가 아니면 선택된 프로젝트만)
- 응답 `data`: `{ user, since, serverTime, assignedTasks[], mentions[] }`
  - `assignedTasks`: `workerId = 지아` 이고 `updatedAt >= since`인 업무(최대 50, 최신순). 재배정·수정도 포함되므로 "새 배정" 판단은 호출 쪽에서 업무 id로 한다.
  - `mentions`: 본문에 `@[이름](지아 id)`가 있고 `createdAt >= since`인 댓글(지아 본인 작성 제외, 최대 50). 본문 대신 300자 `preview`(멘션 표기는 `@이름`으로 변환)와 `authorName`, `task{id,title,status,project}`를 준다.
- 다음 호출의 `since`는 응답의 `serverTime`을 쓰면 된다.
- 조회 전용이다. 업무 생성·상태 변경은 하지 않는다.

### 4-9. 지아 활동 피드 — `GET /api/integrations/jia/activity`

지아가 HighFive에서 **자율로 답하거나 독촉할 거리**를 준다. 지아 서버가 15분마다 호출한다(자율 댓글은 지아 앱에서 켠 경우만).

- 인증: 서비스 키(READ) 전용. 쿼리: `userEmail`(필수), `since`(ISO, 최대 24시간 전), `dueFrom`·`dueTo`(ISO, 둘 다 있으면 목표일 범위).
- "지아가 참여한 업무" = 지아가 담당자·등록자이거나, 지아가 @언급됐거나, 지아(계정 또는 이 키)가 댓글을 단 업무. 키의 조직·프로젝트 범위 안.
- `messages`: since 이후 지아에게 온 댓글(지아 @언급, 또는 지아 댓글에 달린 답글). 지아 본인·이 키로 쓴 댓글 제외. 각 항목에
  `task`와 그 시점까지의 최근 댓글 6개(`thread`, 지아가 쓴 것은 `byJia: true`)를 준다.
  `task.notes`(상세내용을 텍스트로, 최대 1,000자)와 `task.checklist`(최대 15개, `{text, done}`)도 준다 — 지아가 실제 내용을 근거로 답하게.
- `dueTasks`: 목표일이 [dueFrom, dueTo)이고, 프로젝트 기준 완료 상태가 아니며, 담당자가 지아가 아닌 참여 업무. 담당자 이름·역할, 마지막 이력 시각, `notes`·`checklist` 포함.
- 조회 전용. 지아가 실제로 쓰는 것은 4-7의 댓글 API뿐이다.

또한 4-7 댓글 API(서비스 키)는 이제 본문의 `@[이름](id)` 멘션 대상(같은 조직 활성 사용자)과, 답글이면 원댓글 작성자에게 알림을 보낸다.

## 5. 다음 단계
- H5-05/06/07(업무 생성·상태변경·댓글 외 쓰기 연동 확장), H5-08(webhook)은 이번 범위에서 제외 — 별도 요청 시 착수.
- 실 배포 환경에서 위 "코드 경로 추적" 검증을 실제 HTTP 요청으로 한 번 더 확인 필요(이 개발 환경은 DB 미연결로 실행 불가).
