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
