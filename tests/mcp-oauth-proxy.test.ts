// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
vi.mock('next-auth/jwt', () => ({ getToken: vi.fn().mockResolvedValue(null) }));
import { middleware } from '@/middleware';
describe('OAuth provider proxy boundary', () => {
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
