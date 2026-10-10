# HighFive 후속 안정화·사용성 개선

2026-10-10 · 기준 `e36e260` · 작업 브랜치 `fix/highfive-usability-and-reliability`

## 확인된 문제와 수정

| 문제 | 수정 |
| --- | --- |
| `/exwave/...` 주소에서 메뉴 선택 표시가 맞지 않음 | 내부 화면 주소를 정규화하여 HOME/프로젝트/설정 메뉴 판단에 사용 |
| 조직 주소에서 클라이언트 인증 렌더 차단이 적용되지 않음 | 공통 경로 판정으로 로딩·미인증 상태에서 보호 화면을 렌더하지 않도록 수정 |
| API 401이 조직 주소를 잃고 `/login`으로 이동 | 현재 조직 경로 또는 저장된 조직의 로그인으로 복귀 |
| 동시에 업무를 수정하면 마지막 응답이 다른 수정 결과를 덮어씀 | `useTasks`의 생성/수정/삭제/상태 변경을 함수형 상태 갱신으로 변경 |
| 일괄 수정 실패 시 버튼이 처리 중에 머물거나 성공/실패 구분이 없어 재시도가 어려움 | 각 업무의 성공/실패를 수집하고 실패 업무만 선택 유지, 처리 상태는 finally에서 해제, 부분 적용 가능성을 안내 |
| 칸반에서 같은 업무에 중복 요청이 발생하거나 롤백이 다른 변경을 덮어씀 | 업무별 요청 잠금과 저장 표시, 함수형 갱신·롤백, 프로젝트에 없는 상태를 요청 전에 거부 |
| 상태 변경 후 새로고침이 보기·프로젝트 선택을 초기화 | 최초 조회와 갱신을 분리해 기존 화면을 유지하며 최신 데이터로 교체 |
| 이전 조회의 늦은 응답이 새 프로젝트·업무에 섞임 | 허브/상태/칸반/캘린더/전체 상세/빠른 상세의 요청 취소 또는 현재 업무 확인을 적용 |
| 빠른 상세에서 댓글 초안이 다른 업무에 남거나 저장 실패가 조용히 무시됨 | 패널을 열어둔 동안 업무별 초안 보존, 저장 실패 피드백·재시도, 성공 후에도 추가로 입력한 내용 보존 |
| JIA 초안을 반복 추가하거나 이전 요약이 새 업무에 섞임 | 한 번 삽입 후 버튼 피드백·잠금, 업무/수정 시각 변경 시 이전 요약 요청 취소·초기화 |
| HOME 멘션·댓글이 단발 조회라 읽음 처리·새 알림과 불일치 | 기존 공통 알림 context와 30초 폴링을 재사용, 중복 조회 제거, 오류 상태·요청 취소와 중복 읽음 방지 추가 |
| 전역 캘린더 날짜가 한국 브라우저에서 하루씩 어긋남 | 화면 날짜 키는 현지 달력 날짜로 생성; 날짜형 마감·휴가 API의 월 경계는 UTC 날짜형 저장 기준으로 통일 |
| 캘린더 조회 실패가 빈 화면처럼 보이거나 이전 월 응답이 새 월을 덮어씀 | 오류 표시·재시도, 월 변경 시 로딩/선택 갱신, 이전 요청 취소 |
| 캘린더가 기존 업무 목록의 역할 범위보다 넓게 조회됨 | ADMIN/LEADER/WORKER/PARTNER의 기존 업무 조회 범위를 적용, 외부 PARTNER에게 조직 휴가를 전달하지 않음 |
| AI 업무 요약이 같은 조직의 타인 업무를 우회 조회할 수 있음 | 기존 업무 읽기 범위를 포함한 조건으로 업무를 조회하고, 범위 밖이면 이력·댓글·LLM 호출 전에 404 반환 |
| 커스텀 완료 상태가 캘린더/AI에서 미완료 또는 지연으로 취급됨 | 프로젝트별 `isDone` 판정 재사용 |
| AI 브리핑이 UTC 서버에서 한국의 오늘과 다르게 계산되거나 첫 50건에 갇힘 | 업무 날짜형 값과 운영 날짜 키를 비교, 완료 제외·마감 정렬 후 범주별 최대 50건을 프롬프트에 사용 |
| 잘못된 페이지·건수·ID·월 조건이 500 또는 엉뚱한 조회로 이어짐 | `/api/tasks`와 `/api/tasks/calendar`, AI 업무 ID의 정수·범위 검증 및 400 응답; 목록 정렬에 고유 ID 추가 |
| 잘못된 날짜 값으로 업무 카드·보드 달력이 깨짐 | 유효한 날짜만 표시·그룹화하고 미정 날짜로 처리 |
| 업무 필터/보기 탭을 키보드로 이동하기 어려움 | 좌우 방향키·Home·End와 선택 탭의 focus 순서 적용 |
| build가 기본 Node 메모리 한도에서 중단됨 | `npm run build`에 최대 heap 8192MB 설정을 포함해 별도 환경변수 설정 없이 실행 가능 |

## 접근 범위와 호환성

- DB 스키마·운영 데이터·JIA integration/activity/inbox·서비스 인증·기존 쓰기 API 계약은 변경하지 않았다.
- 새 서버 공통 코드 `task-read-scope.ts`는 기존 업무 목록의 역할별 접근 범위를 재사용한다. 조직/역할 정보가 없으면 읽기를 열지 않는다.
- 캘린더와 AI 요약은 기존에 과도하게 넓었던 범위를 제한했다. 특히 WORKER는 본인 업무, LEADER는 소속 프로젝트, PARTNER는 초대 프로젝트 내 본인/공유 업무만 조회한다. ADMIN의 조직 업무 범위는 유지한다.
- `/api/tasks`의 기존 응답 형식은 유지한다. 조회 건수는 1~1000, 페이지는 1 이상, ID는 양의 DB 정수 범위이며 범위 밖 요청에는 400을 반환한다. 기존 내부 호출은 1000 이하이므로 유지된다.
- 업무 일괄 수정은 서버 트랜잭션이 아니다. 한 업무의 상태 변경은 성공하고 담당자 변경은 실패할 수 있으며, UI에 부분 적용 가능성을 명시했다.
- AI 브리핑의 운영 시간대는 `BUSINESS_TIME_ZONE` 환경변수로 지정할 수 있고 기본은 `Asia/Seoul`이다. 마감·휴가 날짜형 저장 계약은 유지한다.
- 빠른 상세의 댓글 초안은 패널 인스턴스 안에서 업무별 보존되며 영구 저장 기능은 아니다.

## 변경 위치

- 경로/세션: `src/lib/route-config.ts`, `src/lib/api-client.ts`, `src/components/LayoutWrapper.tsx`, `src/components/AppShell.tsx`
- 상태·조회: `src/hooks/useTask.ts`, `useWorkHub.ts`, `useProjectStatuses.ts`, `useNotifications.ts`, `src/components/NotificationsProvider.tsx`
- 업무 UI: `src/app/tasks/page.tsx`, `src/app/tasks/[id]/page.tsx`, `src/components/TaskDetailPanel.tsx`, `src/components/kanban/KanbanBoard.tsx`, `KanbanColumn.tsx`
- HOME·JIA·보기: `src/components/work/WorkHome.tsx`, `JiaSidePanel.tsx`, `TaskViews.tsx`, `TaskCards.tsx`, `tabs.ts`, `src/lib/work-hub.ts`
- 캘린더·AI: `src/app/calendar/page.tsx`, `src/app/dashboard/page.tsx`, `src/app/api/tasks/route.ts`, `src/app/api/tasks/calendar/route.ts`, `src/app/api/ai/task-summary/route.ts`, `src/app/api/ai/daily-briefing/route.ts`, `src/lib/task-read-scope.ts`, `src/lib/business-date.ts`
- 검증・문서: `package.json`, `tests/*`, `docs/HISTORY.md`, `docs/PROJECT_STRUCTURE.md`, 본 보고서

## 검증 범위

- `npm test`: 67개 통과 (기존 34개에서 33개 추가).
- `npm run typecheck`: TypeScript 오류 0.
- `npm run lint`: 오류 0, 기존 경고 10개 (기존 12개에서 상세 조회 Hook 경고 2개 해소).
- `npm run build`: 기본 명령으로 통과, 별도 `NODE_OPTIONS` 설정 불필요.
- `npm run test:ui`: Chromium 5개 통과. 비로그인 보호, HOME→내 업무→프로젝트→업무 상세→JIA 초안, 조직 메뉴 활성화, 실제 칸반 드래그 후 프로젝트 선택 유지·List 반영, 캘린더 실패 후 재시도, Desktop/Tablet 보기·가로 넘침 확인.
- `git diff --check`: 통과.

검증 결과는 코드·Hook·UI·API 조건을 mock하는 회귀 테스트와 실제 Chromium 브라우저 검증으로 나눈다. 신규 검증에는 동시 수정 결과 보존, 갱신 중 화면 유지, 이전 응답 무시, 업무별 초안·저장 실패, 조회 범위·잘못된 조건·월말/운영 날짜·커스텀 완료, 키보드 이동·중복 요청·중복 초안이 포함된다.

실제 운영 DB, 실제 비밀번호/2FA, 외부 JIA·LLM 공급자 호출·배포 상태는 현재 환경에서 확인하지 못했다. 운영 전체에 버그가 없다고 단정하지 않는다. 기존 폰트·이미지·일부 Hook 의존성 lint 경고와 `bcryptjs` 빌드 경고는 남아 있으며 검사 규칙을 끄지 않았다.

이후 구현에서도 요구 기능의 동작뿐 아니라 실패·재시도·동시 요청·권한·입력 보존·Desktop/Tablet 사용 흐름을 함께 검증한다.
