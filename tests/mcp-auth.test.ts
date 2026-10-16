// @vitest-environment node
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { generateKeyPair, exportJWK, SignJWT, createLocalJWKSet } from 'jose';
const mocks = vi.hoisted(() => ({ service: vi.fn(), user: vi.fn(), keys: undefined as unknown }));
vi.mock('jose', async original => ({ ...await original<typeof import('jose')>(), createRemoteJWKSet: () => mocks.keys }));
vi.mock('@/lib/db', () => ({ prisma: { user: { findFirst: mocks.user } } }));
vi.mock('@/lib/service-auth', () => ({ requireServiceAuth: mocks.service, serviceHasPermission: (c: { permissions: string }, p: string) => c.permissions.split(',').includes(p) }));
import { authenticateMcp } from '@/lib/mcp/auth';
import { getMcpConfig } from '@/lib/mcp/config';
const config = { resource: 'https://hf.example/api/mcp', issuer: 'https://auth.example', jwks: 'https://auth.example/keys', subject: 'owner', serviceKey: 'test-only-key', userId: 7, commentsEnabled: true, tasksEnabled: true };
let privateKey: Awaited<ReturnType<typeof generateKeyPair>>['privateKey'];
beforeAll(async () => { const pair = await generateKeyPair('RS256'); privateKey = pair.privateKey; mocks.keys = createLocalJWKSet({ keys: [{ ...await exportJWK(pair.publicKey), kid: 'test', alg: 'RS256' }] }); });
beforeEach(() => { vi.unstubAllEnvs(); mocks.user.mockResolvedValue({ id: 7, name: 'JIA' }); mocks.service.mockResolvedValue({ organizationId: 1, credential: { id: 2, permissions: 'READ,COMMENT_CREATE,MCP_TASK_CREATE', allowOrgWide: false, projects: [{ projectId: 3 }] } }); });
async function token(overrides: Record<string, unknown> = {}) { return new SignJWT({ scope: 'highfive:read highfive:comment highfive:task:create', sub: 'owner', iss: config.issuer, aud: config.resource, exp: Math.floor(Date.now() / 1000) + 120, ...overrides }).setProtectedHeader({ alg: 'RS256', kid: 'test' }).sign(privateKey); }
const call = async (overrides = {}) => authenticateMcp(new Request(config.resource, { headers: { authorization: `Bearer ${await token(overrides)}` } }), config);
describe('MCP authentication and binding', () => {
  it('validates a real signed JWT then binds to an active same-org JIA user and restricted service key', async () => { expect(await call()).toMatchObject({ userId: 7, organizationId: 1, projectIds: [3], canComment: true, canCreate: true }); expect(mocks.user).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ id: 7, organizationId: 1, isActive: true, organization: { isActive: true, slug: 'exawave' } }) })); });
  it.each([{ iss: 'https://evil.example' }, { aud: 'https://other.example' }, { exp: 1 }])('rejects invalid signed claims %j', async claims => { await expect(call(claims)).rejects.toMatchObject({ status: 401 }); });
  it.each([{ sub: 'stranger' }, { scope: 'highfive:comment' }])('rejects unauthorized subject or missing read scope %j', async claims => { await expect(call(claims)).rejects.toMatchObject({ status: 403 }); });
  it('rejects absent or malformed credentials', async () => { await expect(authenticateMcp(new Request(config.resource), config)).rejects.toMatchObject({ status: 401 }); await expect(authenticateMcp(new Request(config.resource, { headers: { authorization: 'Bearer not-a-jwt' } }), config)).rejects.toMatchObject({ status: 401 }); });
  it('rejects revoked/expired HighFive keys and inactive users', async () => { mocks.service.mockResolvedValueOnce({ error: new Response(null, { status: 401 }) }); await expect(call()).rejects.toMatchObject({ status: 403 }); mocks.user.mockResolvedValueOnce(null); await expect(call()).rejects.toMatchObject({ status: 403 }); });
  it('rejects organization-wide keys', async () => { mocks.service.mockResolvedValueOnce({ organizationId: 1, credential: { permissions: 'READ', allowOrgWide: true, projects: [] } }); await expect(call()).rejects.toMatchObject({ status: 403 }); });
  it('read-only OAuth grants cannot write even when the service key can', async () => { expect(await call({ scope: 'highfive:read' })).toMatchObject({ canComment: false, canCreate: false }); });
  it('disabled writes remain disabled with full OAuth scopes', async () => { expect(await authenticateMcp(new Request(config.resource, { headers: { authorization: `Bearer ${await token()}` } }), { ...config, commentsEnabled: false, tasksEnabled: false })).toMatchObject({ canComment: false, canCreate: false }); });
  it('defaults to disabled and rejects incomplete configuration', () => { expect(() => getMcpConfig()).toThrow('MCP_DISABLED'); vi.stubEnv('HIGHFIVE_MCP_ENABLED', 'true'); expect(() => getMcpConfig()).toThrow('MCP_NOT_CONFIGURED'); });
});
