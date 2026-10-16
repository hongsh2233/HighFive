// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
vi.mock('next-auth/jwt', () => ({ getToken: vi.fn().mockResolvedValue(null) }));
import { middleware } from '@/middleware';
import { getToken } from 'next-auth/jwt';
import { MCP_AUTHORIZATION_PATH, mcpLoginReturn } from '@/lib/mcp/organization';
beforeEach(() => vi.mocked(getToken).mockResolvedValue(null));
describe('OAuth provider proxy boundary', () => {
  it.each([null, { role: 'SUPERADMIN' }, { role: 'ADMIN', organizationSlug: 'other' }, { role: 'WORKER', organizationSlug: 'exawave' }])('requires EXAWAVE organization admin login: %j', async token => {
    vi.mocked(getToken).mockResolvedValue(token);
    const path = MCP_AUTHORIZATION_PATH + '?client_id=highfive-chatgpt&state=test';
    const r = await middleware(new NextRequest('https://highfive.exawave.co.kr' + path));
    const target = new URL(r.headers.get('location')!);
    expect(target.pathname).toBe('/exawave/login');
    expect(target.searchParams.get('mcpReturn')).toBe(path);
    expect(r.headers.get('cache-control')).toBe('no-store');
  });
  it('allows an EXAWAVE administrator to continue OAuth without widening MCP data permissions', async () => {
    vi.mocked(getToken).mockResolvedValue({ role: 'ADMIN', organizationSlug: 'exawave' });
    expect((await middleware(new NextRequest('https://highfive.exawave.co.kr' + MCP_AUTHORIZATION_PATH))).headers.get('location')).toBeNull();
  });
  it('does not bypass required password changes', async () => {
    vi.mocked(getToken).mockResolvedValue({ role: 'ADMIN', organizationSlug: 'exawave', mustChangePassword: true });
    expect((await middleware(new NextRequest('https://highfive.exawave.co.kr' + MCP_AUTHORIZATION_PATH))).status).toBe(403);
  });
  it('resumes only the fixed local OAuth route after organization login', () => {
    expect(mcpLoginReturn(MCP_AUTHORIZATION_PATH + '?state=test')).toBe(MCP_AUTHORIZATION_PATH + '?state=test');
    for (const path of ['https://evil.test', '//evil.test', '/exawave/dashboard', MCP_AUTHORIZATION_PATH + '?state=test#fragment', '/mcp-auth/admin?x=1']) expect(mcpLoginReturn(path)).toBeNull();
  });
  it('lets provider realm discovery and login keep their own security headers', async () => {
    const r = await middleware(new NextRequest('https://highfive.exawave.co.kr/mcp-auth/realms/exawave-mcp/.well-known/openid-configuration'));
    expect(r.status).toBe(200); expect(r.headers.get('location')).toBeNull(); expect(r.headers.get('content-security-policy')).toBeNull();
  });
  it.each(['/mcp-auth/admin/', '/mcp-auth/realms/master/protocol/openid-connect/token'])('does not expose administrative paths: %s', async path => {
    expect((await middleware(new NextRequest('https://highfive.exawave.co.kr' + path))).status).toBe(404);
  });
  it('preserves normal HighFive login guards', async () => {
    expect((await middleware(new NextRequest('https://highfive.exawave.co.kr/exawave/dashboard'))).status).toBe(307);
  });
});
