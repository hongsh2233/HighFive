# High5 Design System

## 1. Visual Theme & Atmosphere

High5는 개발팀/운영팀이 하루 종일 켜두는 **내부 업무관리 콘솔**이다. 마케팅 사이트가 아니라
실무 도구이므로, 방향은 처음부터 "노션만큼 자유롭게, 지라만큼 편리하게, 그러나 복잡하지
않게"로 정했다. 배경은 옅은 오프화이트(`#FAFAFA`)에 순백색 카드(`#FFFFFF`)를 얹고, 텍스트는
거의 검정에 가까운 잉크(`#09090B`)를 쓴다. 액션 색은 인디고 계열 단일 액센트(`#5E6AD2`)
하나로 통일해 "이걸 누르면 된다"는 신호를 분산시키지 않는다.

깊이감은 그림자가 아니라 **톤 차이**로 만든다 — 카드는 `#FFFFFF`, 그 위 서브틀 배경은
`#F4F4F5`, 헤더는 거의 검정(`#18181B`)인 다크 바 하나만 예외로 둔다. 버튼/인풋/뱃지는
모두 얇은 보더 + 좁은 라운드(4~8px)로 통일되어 있어 어떤 페이지를 봐도 같은 시스템처럼
느껴진다.

**핵심 특징:**
- 단일 액센트: 인디고 `#5E6AD2` 하나만 "액션"을 의미. 성공/경고/위험은 별도 시맨틱 컬러로 분리.
- 그림자 없는 플랫 시스템: 톤(`#FAFAFA`/`#F4F4F5`/`#FFFFFF`) 차이와 1px 보더로 구획.
- Pretendard 단일 폰트 패밀리(본문/제목 공용) — 굵기(weight) 차이로만 위계를 만듦.
- 모든 컴포넌트가 `globals.css`의 공용 프리미티브(`.btn`, `.field-input`, `.field-select`)를
  `composes`로 재사용 — 페이지마다 스타일이 따로 노는 것을 방지.
- 다크 헤더 바(`#18181B`) 하나만 시스템 전체에서 유일한 "무거운" 표면.

## 2. Color Palette & Roles

### Primary
- **Accent** (`#5E6AD2`): 유일한 액션 컬러. Primary 버튼, 링크, 포커스 링, 활성 탭에 사용.
- **Accent Hover** (`#4B55BF`): 액센트 요소의 hover 상태.
- **Accent Light** (`#EEF0FF`): 포커스 링 배경, 선택된 상태의 옅은 틴트.

### Semantic
- **Success** (`#059669`): 완료/성공 상태(승인, 완료 뱃지).
- **Warning** (`#D97706`): 대기/경고 상태.
- **Danger** (`#DC2626`): 삭제/오류 액션과 메시지.

### Text
- **Primary** (`#09090B`): 본문/제목 기본 텍스트.
- **Secondary** (`#71717A`): 라벨, 캡션, 테이블 헤더.
- **Muted** (`#A1A1AA`): placeholder, 비활성/부가 정보.

### Surface & Border
- **Base** (`#FAFAFA`): 페이지 기본 배경.
- **Surface** (`#FFFFFF`): 카드/테이블/모달 배경.
- **Subtle** (`#F4F4F5`): 테이블 헤더, hover 배경, 서브틀 구획.
- **Header** (`#18181B` / 텍스트 `#FAFAFA`): 전역 상단 네비게이션 — 시스템에서 유일한 다크 표면.
- **Border** (`#E4E4E7`) / **Border Strong** (`#D4D4D8`): 얇은 구분선, 인풋 보더.

### Semantic Light (배지/카드 배경 틴트)
success/warning/danger/info 각각 옅은 배경 틴트 + 매칭 보더 토큰을 쌍으로 제공(`--accent-light`와
동일한 공식). 페이지마다 파스텔 hex를 직접 하드코딩하지 않고 아래 토큰만 사용한다.

| 토큰 | 값 | 용도 |
|---|---|---|
| `--success-light` / `--success-border` | `#ECFDF5` / `#A7F3D0` | 완료/승인 배지·박스 배경 |
| `--warning-light` / `--warning-border` | `#FFFBEB` / `#FDE68A` | 대기/경고 배지·박스 배경 |
| `--danger-light` / `--danger-border` | `#FEF2F2` / `#FECACA` | 오류/삭제 배지·박스 배경 |
| `--info-light` / `--info-border` | `#EFF6FF` / `#BFDBFE` | 정보성 배지(플랜, 안내) 배경 |

## 3. Typography Rules

### Font Family
- **Display / Body**: `Pretendard`(→`Noto Sans KR`→`sans-serif` 폴백) — 제목과 본문 모두
  같은 패밀리를 쓰고 굵기로만 위계를 나눈다(영문/한글이 섞여도 톤이 어긋나지 않도록).
- **Mono**: `JetBrains Mono`(→`Fira Code`) — 코드/타임스탬프 등 고정폭이 필요한 곳에만.

### Hierarchy

| Role | Size | Weight | Line Height | 용도 |
|---|---|---|---|---|
| H1 | 22px | 600 | 1.3 | 페이지 타이틀 |
| H2 | 18px | 600 | 1.4 | 카드/섹션 제목 |
| H3 | 15px | 600 | 1.4 | 서브섹션 |
| Body | 13px | 400 | 1.6 | 기본 본문 (앱 기본 폰트 크기) |
| Table cell | 13~14px | 400 | — | 테이블 셀 |
| Table header | 11px | 600 (uppercase, letter-spacing 0.05em) | — | 테이블/카드 헤더 라벨 |
| Small / caption | 11~12px | 400~600 | — | 뱃지, 캡션, 버튼(`.btn-sm`) |

### Principles
- **페이지 타이틀은 항상 22px/700**: `globals.css`의 `.page-title` 유틸리티 클래스(또는 동등한
  `font-size: 22px; font-weight: 700;`)로 통일한다. 16~28px로 흩어져 있던 과거 아웃라이어를
  모두 이 기준으로 정규화했다 — 새 페이지도 임의의 크기를 쓰지 않는다.
- **굵기가 위계**: 크기 점프를 크게 두지 않고(13→15→18→22px), 대신 weight 400→600 전환이
  1차 신호. 지라/노션 계열 콘솔 앱의 절제된 타이포와 동일한 전략.
- **13px 베이스**: 마케팅 사이트보다 촘촘한 밀도가 필요한 실무 도구라 본문 기준을 16px가
  아닌 13px로 낮춰 한 화면에 더 많은 정보를 담는다.
- **테이블 헤더는 항상 uppercase 11px**: 어떤 테이블이든(업무 목록, 통계, 유저 관리) 헤더
  스타일이 동일해 시선이 헤매지 않는다.

## 4. Component Stylings

모든 버튼/인풋은 `src/app/globals.css`의 프리미티브를 CSS Modules `composes`로 상속한다.
페이지별 CSS에서 새로 만들지 않는다.

### Buttons (`.btn` 기반)

| 변형 | 배경 | 텍스트 | 보더 | 용도 |
|---|---|---|---|---|
| `.btn-primary` | `#5E6AD2` | `#FFFFFF` | 동일 | 주요 액션(저장, 등록) |
| `.btn-secondary` | `#FFFFFF` | `#09090B` | `#D4D4D8` | 보조 액션(취소) |
| `.btn-ghost` | 투명 | `#71717A` | `#E4E4E7` | 3차 액션(요약보기, 필터 초기화) |
| `.btn-success` | 투명 | `#059669` | `#6EE7B7` | 긍정 액션(+하위 업무) |
| `.btn-danger` | 투명 | `#DC2626` | `#FCA5A5` | 파괴적 액션(삭제) |
| `.btn-danger-solid` | `#DC2626` | `#FFFFFF` | 동일 | 확정형 삭제(상세페이지) |

- 크기: 기본 `padding: 7px 14px / 13px`, 축소판 `.btn-sm`은 `padding: 3px 9px / 11px`
  (테이블 행 안의 인라인 버튼용).
- 라운드: 기본 6px, `.btn-sm`은 4px.
- 상태: hover는 배경 톤만 살짝 진해짐(그림자 없음), `:active`는 opacity 0.85, `:focus-visible`은
  액센트 2px 아웃라인, `:disabled`는 opacity 0.5.
- 트랜지션: `120ms`(motion-fast) + `ease-standard` — 빠르고 절제된 반응.

### Inputs / Selects (`.field-input`, `.field-select`)
- 배경 `#FFFFFF`, 보더 `#D4D4D8`, 라운드 6px, 폰트 13px.
- 포커스: 보더가 액센트로 바뀌고 `0 0 0 3px var(--accent-light)` 링 — 그림자 대신 색 링으로
  포커스를 표현(hairline + color, no elevation).
- 비활성: opacity 0.5.

### Badges (`src/components/common/Badge.tsx`)
- `StatusBadge` / `RoleBadge` — `data-status`/`data-role` 속성 기반 색상 매핑.
- 공통 셰이프: 투명 배경 + 컬러 보더 + 컬러 텍스트, `padding: 3px 8px`, `border-radius: 4px`,
  `font-size: 11px`. 뱃지는 절대 채워진 배경을 쓰지 않는다(뱃지가 많은 테이블에서 시각적
  무게를 가볍게 유지하기 위함).

### Cards
- 배경 `#FFFFFF`, 보더 `1px solid #E4E4E7`, 라운드는 `--radius-card`(10px)로 통일, 패딩
  `var(--space-6)`(24px).
- 기본은 그림자 없음 — 카드와 카드 사이는 `--space-6`~`--space-8` 여백으로만 구분.
- **선택적 입체감**: KPI/요약 카드(대시보드 등)와 모달·드롭다운에 한해 `--shadow-card`
  (hover 시 `--shadow-hover`)를 적용해 생동감을 준다. 일반 목록 카드·문서 카드는 계속 플랫
  유지 — 아무 카드에나 그림자를 추가하지 않는다.

### Tables
- 헤더 배경 `#F4F4F5`, 헤더 텍스트 `#71717A` uppercase 11px.
- 행 hover 시 배경만 `#F4F4F5`로 바뀜(그림자/스케일 없음).
- 테이블 전체는 8px 라운드 + `1px solid #E4E4E7` 보더로 감싼다. 단, 팝오버처럼 테이블
  경계를 벗어나 떠야 하는 UI는 라운드 유지보다 `overflow: visible`을 우선한다(§6 참고).

### Spinner (`src/components/common/Spinner.tsx`)
- "로딩 중..." 텍스트 대신 얇은 링 스피너: 옅은 회색 링(`--border`) 위에 액센트 컬러 한
  구간만 회전(0.7s linear). sm(16px)/md(26px)/lg(38px) 3사이즈, 아래 작은 muted 라벨.
- `role="status" aria-live="polite"`로 스크린리더 접근성 보장.

## 5. Layout Principles

### Spacing System
- 4px 베이스 스케일: `--space-1`(4) ~ `--space-16`(64).
- 모든 페이지 최상위 wrapper 패딩은 `var(--space-8)`(32px)로 통일(리터럴 `40px 32px` 등
  하드코딩 금지), 카드 내부 패딩은 `--space-6`(24px), 폼 필드 간격은 `--space-3`~`--space-5`.

### Content Width Scale
페이지 성격에 따라 4단계 너비 토큰 중 하나를 쓴다 — 임의의 px 값을 새로 만들지 않는다.

| 토큰 | 값 | 대상 |
|---|---|---|
| `--width-wide` | 1440px | 목록/대시보드형(dashboard, tasks, calendar, stats, projects, requests, announcements, info, my-notes)과 표 위주 관리 화면(superadmin, users, settings/audit) |
| `--width-standard` | 960px | 문서형(wiki, meetings) |
| `--width-narrow` | 720px | 설정/폼 페이지(settings/organization·security·calendar-sync·integrations, profile/password) |
| `--width-compact` | 440px | 인증 페이지(login, register, `[slug]/login`) |

### Grid & Container
- 업무 목록(`/tasks`)은 **프로젝트별 섹션**으로 세로 나열 — 각 섹션이 독립된 테이블 +
  자기 커스텀 필드를 갖는다("aaa 리스트", "bbb 리스트" 형태). 프로젝트 미지정 업무는
  맨 아래 별도 섹션.
- 업무 상세는 카드 스택(기본정보 → 속성 → GitHub 연결 → 메모 → 타임로그 → 히스토리)으로
  세로 배치.

### Border Radius Scale
- XS (4px): 축소 버튼(`.btn-sm`), 뱃지
- SM (6px): 기본 버튼, 인풋(`--radius`), 셀렉트 — 시스템의 기본값
- Card (`--radius-card`, 10px): 카드류(`.card`/`.formCard`/`.summaryCard`/`.kpiCard` 등), 테이블, 팝오버 — 파일마다 8/10/12px로 흩어져 있던 값을 이 토큰 하나로 통일
- LG (12px): 로그인 카드처럼 강조가 필요한 큰 컨테이너
- Full: 아바타 등 원형 요소

## 6. Depth & Elevation

| 레벨 | 처리 | 용도 |
|---|---|---|
| Flat (0) | 그림자 없음 | 페이지 배경, 대부분의 텍스트/헤딩 |
| Tint (1) | `#F4F4F5` 배경 전환 | 테이블 헤더, hover 행, 서브틀 구획 |
| Hairline (2) | `1px solid #E4E4E7` | 카드, 테이블, 인풋 보더 |
| Float (3) | `box-shadow: 0 4px 16px rgba(0,0,0,0.08)` | 드롭다운 메뉴, 팝오버(제한적으로만 사용) |
| Color (4) | 액센트/시맨틱 컬러 | 강조가 진짜 필요한 곳(Primary 버튼, 활성 탭) |

**섀도 원칙**: 앱 전체가 기본적으로 그림자 없는 시스템이다. 선택적으로 그림자를 쓰는 곳은
셋뿐이다 — (1) KPI/요약 카드(`--shadow-card`/hover `--shadow-hover`), (2) 컨텐츠 위에
"떠야 하는" 드롭다운/팝오버·모달(예: 헤더 메뉴, 업무 목록의 "+속성" 팝오버) — 이 경우도 얕은
그림자 하나만 쓰고 스택하지 않는다. 특히 팝오버는 부모 요소의 `overflow`에 잘리면 안 되므로
`position: fixed` + `createPortal`로 `document.body`에 직접 렌더링해 어떤 조상의 overflow
설정과도 무관하게 항상 온전히 보이도록 한다(`overflow-x: auto`가 걸린 조상 안에서는
`overflow-y: visible`을 줘도 브라우저가 두 축을 함께 클리핑하는 CSS 스펙 한계 때문). (3)
브랜드/히어로 영역(로그인·회원가입 로고 아이콘 등)에 한해 `--accent-gradient`(단색 대신
인디고 그라데이션)를 써서 생동감을 더한다 — 일반 UI 요소에는 그라데이션을 쓰지 않는다.
그 외 어떤 카드/목록/테이블에도 그림자를 새로 추가하지 않는다.

## 7. Do's and Don'ts

### Do
- 액션 색은 액센트(`#5E6AD2`) 하나로 통일 — 새 기능을 만들 때 새 브랜드 컬러를 추가하지 않는다.
- 새 버튼/인풋이 필요하면 `globals.css`의 `.btn-*`/`.field-*`를 `composes`로 상속한다.
- 테이블 헤더는 항상 `#F4F4F5` 배경 + uppercase 11px로 통일한다.
- 프로젝트별로 달라지는 데이터(상태, 커스텀 필드)는 `ProjectStatus`/`ProjectField` 같은
  "정의 테이블 + 값 테이블" 패턴을 재사용한다(새 개념마다 새 아키텍처를 만들지 않는다).
- 로딩 상태는 `<Spinner />`를 쓴다("로딩 중..." 텍스트만 노출하지 않는다).

### Don't
- 페이지마다 새로운 버튼 색/라운드/패딩 조합을 만들지 않는다.
- 그림자를 쌓아 입체감을 주지 않는다 — 톤과 hairline으로 구분한다.
- 뱃지에 채워진 배경색을 쓰지 않는다(보더+텍스트 컬러만).
- 팝오버/드롭다운을 `overflow: hidden`이 걸린 컨테이너 내부에 `position: absolute`로
  두지 않는다 — 반드시 잘리는지 확인하고, 필요하면 portal을 쓴다.
- 화면을 가득 채우는 필터 드롭다운으로 핵심 기능(예: 속성 추가)을 숨기지 않는다 — 관련
  액션은 항상 바로 보이는 위치에 둔다.

## 8. Responsive Behavior

### Breakpoints
| 이름 | 폭 | 주요 변화 |
|---|---|---|
| Mobile | <640px | **신규 미디어쿼리는 모두 이 기준을 따른다.** 페이지 여백이 `padding: 20px 14px`로 축소, 2열 그리드가 1열로, 업무 목록 테이블이 카드형으로 전환. |
| Tablet | 640~768px | 헤더 네비게이션이 드로어로 접힘(`AppHeader`의 `mobileToggle`, 이 컴포넌트만 예외적으로 768px 기준). |
| Desktop | ≥768px | 기본 레이아웃, 페이지 성격별 너비 토큰(`--width-wide` 1440px 등, §5) 적용 |

기존 코드에는 480/640/768/900px가 파일마다 섞여 있었다(`AppHeader` 768px, `tasks/create`
900px, `login` 480px 등) — 굳이 통일하지 않았고, **새로 추가하는 반응형 스타일만 640px로
통일**해 앞으로의 예측 가능성을 확보했다.

### Touch Targets
- 기본 버튼 높이 ~32px(padding 7px 14px + 13px 폰트), 테이블 인라인 버튼은 더 작음(`.btn-sm`,
  ~20px) — 데스크톱 중심 업무 도구라 모바일 우선순위는 낮지만 최소 클릭 영역은 유지.

### Collapsing Strategy
- 좁은 화면에서는 폼의 2열 그리드(`grid-template-columns: repeat(2,1fr)`)가 1열로 전환
  (`/tasks/[id]` 기본정보·속성 카드, `/projects`의 목록+멤버패널 등).
- **업무 목록(`/tasks`) 테이블 → 카드형 전환**: 640px 이하에서 `<table>`의 `display`를
  `block`으로 바꾸고 각 `<tr>`을 카드처럼 보이게 하는 순수 CSS 기법을 사용한다. 헤더 행은
  숨기고, 각 `<td>`에 이미 붙어 있는 `data-label` 속성을 `::before { content: attr(data-label) }`
  로 라벨처럼 표시 — 별도의 카드 컴포넌트를 새로 만들지 않고 기존 테이블 마크업을 그대로
  재사용한다(`tasks.module.css`).
- `/calendar`의 7일 그리드는 열 구조를 유지하되(달력 구조상 열을 줄이면 의미가 없음) 640px
  이하에서 셀 높이/패딩/폰트를 축소해 좁은 화면에서도 한 줄에 들어가도록 한다.
- 커스텀 필드 컬럼이 있는 다른 넓은 표(위키 목록 등)는 여전히 가로 스크롤
  (`.tableWrapper { overflow-x: auto }`)로 대응한다.

## 9. Agent Prompt Guide

### Quick Color Reference
- Primary action: Accent (`#5E6AD2`)
- Text: Primary `#09090B` / Secondary `#71717A` / Muted `#A1A1AA`
- Canvas: `#FAFAFA` / Surface: `#FFFFFF` / Subtle: `#F4F4F5`
- Border: `#E4E4E7` (기본) / `#D4D4D8` (강조)
- Semantic: Success `#059669` / Warning `#D97706` / Danger `#DC2626`
- Header(다크): `#18181B` bg / `#FAFAFA` text

### Example Component Prompts
- "Primary 버튼을 만들어줘: `.btn .btn-primary` 조합, 배경 #5E6AD2, 흰 텍스트, 6px 라운드, 13px/600, hover 시 #4B55BF."
- "테이블을 만들어줘: 헤더는 #F4F4F5 배경에 11px uppercase #71717A 텍스트, 셀은 13~14px, 행 hover는 #F4F4F5 배경 전환만(그림자 없음)."
- "새로운 폼 인풋은 `.field-input`을 composes로 상속해서 만들어줘 — 직접 border/padding을 다시 정의하지 마."
- "로딩 상태는 `<Spinner size=\"md\" />`를 써줘."

### Iteration Guide
1. 액센트(`#5E6AD2`)는 유일한 액션 컬러 — 새로 추가하지 않는다.
2. 새 버튼/인풋은 항상 `globals.css` 프리미티브를 상속한다.
3. 그림자 대신 톤(`#FAFAFA`/`#F4F4F5`/`#FFFFFF`) 차이와 hairline 보더로 구분한다. 그림자가
   필요하다고 느껴지면 먼저 KPI 카드/모달/팝오버/브랜드 히어로 중 하나에 해당하는지 확인한다
   (§6 참고) — 아니라면 플랫을 유지한다.
4. 라운드 사다리: 4px(축소 버튼/뱃지), 6px(기본 버튼/인풋), `--radius-card`=10px(카드/테이블/팝오버), 12px(강조 컨테이너).
5. 새 페이지의 최상위 wrapper는 성격에 맞는 너비 토큰(`--width-wide/standard/narrow/compact`)과
   `var(--space-8)` 패딩을 쓴다 — 임의의 px 값을 새로 만들지 않는다(§5 Content Width Scale).
6. 페이지 타이틀은 항상 22px/700(`.page-title` 유틸리티 또는 동등 스타일).
7. 성공/경고/위험/정보 배지·박스 배경은 `--success/warning/danger/info-light` 토큰만 쓴다 —
   파스텔 hex를 직접 하드코딩하지 않는다.
8. 프로젝트별로 달라지는 데이터는 "정의 테이블 + 값 테이블" 패턴(ProjectStatus/ProjectField)을 재사용한다.
9. 떠 있어야 하는 UI(팝오버 등)는 `overflow: hidden` 조상 안에 두지 말고 `createPortal`을 고려한다.
10. 텍스트 로딩 표시 대신 `<Spinner />`를 쓴다.

---

**작성 기준**: 이 문서는 마케팅 사이트가 아니라 실제로 구현되어 배포 중인 High5 내부 콘솔의
현재 코드(`src/app/globals.css`, `src/components/common/*`, `tasks/tasks.module.css` 등)를
기준으로 작성되었다 — 별도 조사 없이도 코드와 항상 1:1로 대응하는 것이 목표다. 새로운
컴포넌트나 톤을 추가할 때는 이 문서를 먼저 갱신한 뒤 구현한다.

**참고한 외부 레퍼런스**: 업로드된 Hackle(핵클) DESIGN.md의 원칙 중 "단일 액센트 컬러",
"그림자 없는 톤 분리", "라운드 사다리", "모션 토큰(fast/standard/slow + easing)" 개념을
차용해 `globals.css`에 `--motion-*`/`--ease-*`/`--radius-*` 토큰과 버튼 `:active`/
`:focus-visible` 상태를 추가로 정리했다. 마케팅 카피/보이스/퍼소나 관련 섹션(Hackle 원문의
10~13절)은 내부 도구 성격상 그대로 가져오지 않았다.
