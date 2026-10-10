import { describe, expect, it } from 'vitest';
import { organizationRoute, sessionLoginPath } from '../src/lib/route-config';
import { businessDateKey } from '../src/lib/business-date';
describe('조직 주소·로그인·날짜', () => {
  it('조직 주소를 메뉴와 인증 확인용 내부 주소로 정규화한다', () => {
    expect(organizationRoute('/exwave/projects/3')).toEqual({ slug: 'exwave', pathname: '/projects/3' });
    expect(organizationRoute('/tasks/3')).toEqual({ slug: null, pathname: '/tasks/3' });
    expect(organizationRoute('/tasks-other')).toBeNull();
  });
  it('세션 만료 때 현재 조직 또는 저장된 조직의 로그인으로 이동한다', () => {
    expect(sessionLoginPath('/exwave/my-work')).toBe('/exwave/login');
    expect(sessionLoginPath('/tasks', 'exwave')).toBe('/exwave/login');
    expect(sessionLoginPath('/superadmin')).toBe('/login');
  });
  it('한국 자정 이후에는 UTC 서버에서도 한국의 오늘 날짜를 쓴다', () => {
    expect(businessDateKey(new Date('2026-10-09T16:00:00Z'), 'Asia/Seoul')).toBe('2026-10-10');
    expect(businessDateKey(new Date('2026-10-09T16:00:00Z'), 'UTC')).toBe('2026-10-09');
  });
});
