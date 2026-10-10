// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const auth = vi.hoisted(() => ({ getToken: vi.fn() }));
vi.mock('next-auth/jwt', () => ({ getToken: auth.getToken }));
import { middleware } from '../src/middleware';
const request = (path: string) => new NextRequest(`http://localhost${path}`);
beforeEach(() => auth.getToken.mockResolvedValue({ role: 'WORKER', organizationSlug: 'exwave' }));
describe('새 IA 인증·조직·역할 보호', () => {
  it.each(['my-work', 'inbox', 'docs', 'reports', 'jia'])('%s는 로그인 없이는 접근할 수 없다', async path => {
    auth.getToken.mockResolvedValue(null);
    const response = await middleware(request(`/exwave/${path}`));
    expect(response.headers.get('location')).toBe('http://localhost/exwave/login');
  });
  it('조직 슬러그와 검색 조건을 유지한다', async () => {
    const response = await middleware(request('/my-work?filter=week'));
    expect(response.headers.get('location')).toBe('http://localhost/exwave/my-work?filter=week');
  });
  it('다른 조직 경로는 본인 조직으로 교정한다', async () => {
    const response = await middleware(request('/other/projects/3'));
    expect(response.headers.get('location')).toBe('http://localhost/exwave/projects/3');
  });
  it('팀원은 리포트에 접근할 수 없다', async () => {
    expect((await middleware(request('/exwave/reports'))).headers.get('location')).toBe('http://localhost/exwave/dashboard');
  });
  it.each(['inbox', 'docs', 'reports', 'jia'])('파트너에게 %s를 열지 않는다', async path => {
    auth.getToken.mockResolvedValue({ role: 'PARTNER', organizationSlug: 'exwave' });
    expect((await middleware(request(`/exwave/${path}`))).headers.get('location')).toBe('http://localhost/exwave/dashboard');
  });
  it('파트너의 내 업무 접근은 기존 업무 권한을 사용한다', async () => {
    auth.getToken.mockResolvedValue({ role: 'PARTNER', organizationSlug: 'exwave' });
    expect((await middleware(request('/exwave/my-work'))).headers.get('x-middleware-rewrite')).toBe('http://localhost/my-work');
  });
  it('비밀번호 변경 강제 정책을 유지한다', async () => {
    auth.getToken.mockResolvedValue({ role: 'ADMIN', organizationSlug: 'exwave', mustChangePassword: true });
    expect((await middleware(request('/exwave/my-work'))).headers.get('location')).toBe('http://localhost/exwave/profile/password');
  });
});
