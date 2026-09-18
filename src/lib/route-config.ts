// 조직 슬러그 기반 인증 라우트 설정 (middleware.ts, LayoutWrapper.tsx 공통 사용)
// 새 최상위 인증 라우트를 추가할 때 이 배열 하나만 수정하면 된다.
export const ORG_SCOPED_ROUTES = [
  'dashboard',
  'tasks',
  'calendar',
  'stats',
  'users',
  'announcements',
  'requests',
  'my-notes',
  'info',
  'wiki',
  'meetings',
  'projects',
  'profile',
  'settings',
  'manual',
  'inquiries',
  'weekly-reports',
  'expenses',
] as const;

export const ADMIN_ONLY_ROUTES: string[] = ['users'];
export const LEADER_ROUTES: string[] = ['stats'];

// PARTNER 역할이 접근할 수 있는 최상위 라우트만 허용(화이트리스트) — 그 외 ORG_SCOPED_ROUTES는 전부 차단.
// 관리자 설정/조직 운영/분석 등 내부 전용 메뉴는 PARTNER에게 노출되지 않는다.
export const PARTNER_ALLOWED_ROUTES: string[] = ['dashboard', 'tasks', 'calendar', 'projects', 'profile', 'my-notes', 'manual', 'settings'];
