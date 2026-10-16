// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
const m = vi.hoisted(() => ({ auth: vi.fn(), audit: vi.fn(), config: vi.fn(), list: vi.fn() }));
vi.mock('@/lib/mcp/auth', () => ({ authenticateMcp: m.auth }));
vi.mock('@/lib/mcp/audit', () => ({ auditMcp: m.audit }));
vi.mock('@/lib/mcp/config', async original => ({ ...await original<typeof import('@/lib/mcp/config')>(), getMcpConfig: m.config }));
vi.mock('@/lib/mcp/tasks', () => ({ listMyTasks: m.list, getMcpTask: vi.fn(), listMcpComments: vi.fn(), listMentionTargets: vi.fn() }));
vi.mock('@/lib/mcp/writes', () => ({ addMcpComment: vi.fn(), createMcpTask: vi.fn(), listTaskTargets: vi.fn() }));
import { POST, GET } from '@/app/api/mcp/route';
import { McpError } from '@/lib/mcp/config';
const config = { resource: 'https://hf.example/api/mcp', issuer: 'https://auth.example', jwks: 'https://auth.example/keys', subject: 'owner', serviceKey: 'test-only-key', userId: 7, commentsEnabled: false, tasksEnabled: false };
beforeEach(() => { m.config.mockReturnValue(config); m.auth.mockResolvedValue({ organizationId: 1, userId: 7, credentialId: 2, projectIds: [3], canComment: false, canCreate: false }); m.audit.mockResolvedValue(undefined); m.list.mockResolvedValue({ tasks: [], total: 0 }); });
const req = (body: unknown, headers = {}) => new Request(config.resource, { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream', authorization: 'Bearer test', ...headers }, body: JSON.stringify(body) });
describe('stateless Streamable HTTP', () => {
  it('initializes through the actual SDK transport', async () => { const res = await POST(req({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'test', version: '1' } } })); expect(res.status).toBe(200); expect((await res.json()).result.serverInfo.name).toBe('highfive-jia'); expect(res.headers.get('cache-control')).toBe('no-store'); });
  it('discovers and invokes tools across independent stateless requests', async () => { const list = await POST(req({ jsonrpc: '2.0', id: 2, method: 'tools/list' })); expect((await list.json()).result.tools).toHaveLength(5); const call = await POST(req({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'list_my_tasks', arguments: {} } })); expect((await call.json()).result.structuredContent.data.total).toBe(0); });
  it('returns OAuth discovery challenge without exposing token or database details', async () => { m.auth.mockRejectedValueOnce(new McpError(401, 'MCP_UNAUTHORIZED')); const res = await POST(req({})); expect(res.status).toBe(401); expect(res.headers.get('www-authenticate')).toContain('https://hf.example/.well-known/oauth-protected-resource'); expect(await res.text()).not.toContain('Bearer test'); });
  it('rejects untrusted origins, batches, oversized bodies, wrong media types and invalid JSON', async () => { expect((await POST(req({}, { origin: 'https://evil.example' }))).status).toBe(403); expect((await POST(req([]))).status).toBe(400); expect((await POST(req({ text: 'x'.repeat(65536) }))).status).toBe(413); expect((await POST(req({}, { 'content-type': 'text/plain' }))).status).toBe(415); expect((await POST(new Request(config.resource, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{' }))).status).toBe(400); });
  it('does not expose persistent sessions and fails closed if auditing is down', async () => { expect((await GET()).status).toBe(405); m.audit.mockRejectedValue(new Error('database secret')); const res = await POST(req({ jsonrpc: '2.0', id: 1, method: 'tools/list' })); expect(res.status).toBe(503); expect(await res.text()).not.toContain('secret'); });
});
