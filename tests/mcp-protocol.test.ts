// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
const mocks = vi.hoisted(() => ({ list: vi.fn(), comment: vi.fn(), create: vi.fn(), audit: vi.fn() }));
vi.mock('@/lib/mcp/tasks', () => ({ listMyTasks: mocks.list, getMcpTask: vi.fn(), listMcpComments: vi.fn(), listMentionTargets: vi.fn() }));
vi.mock('@/lib/mcp/writes', () => ({ addMcpComment: mocks.comment, createMcpTask: mocks.create, listTaskTargets: vi.fn() }));
vi.mock('@/lib/mcp/audit', () => ({ auditMcp: mocks.audit }));
import { createMcpServer } from '@/lib/mcp/server';
const p = { organizationId: 1, userId: 7, credentialId: 2, projectIds: [3], canComment: false, canCreate: false };
const config = { resource: 'https://hf.example/api/mcp', issuer: 'https://auth.example', jwks: 'https://auth.example/keys', subject: 'owner', serviceKey: 'test-only-key', userId: 7, commentsEnabled: true, tasksEnabled: true };
async function connect(writes = true) { const server = createMcpServer(p, { ...config, commentsEnabled: writes, tasksEnabled: writes }); const client = new Client({ name: 'test', version: '1' }); const [a, b] = InMemoryTransport.createLinkedPair(); await server.connect(a); await client.connect(b); return { client, close: async () => { await client.close(); await server.close(); } }; }
describe('real MCP protocol', () => {
  it('initializes and exposes correct read/write annotations and scopes', async () => { const s = await connect(); try { const { tools } = await s.client.listTools(); expect(tools.map(t => t.name)).toEqual(['list_my_tasks', 'get_task', 'list_comments', 'list_mention_targets', 'list_task_targets', 'add_comment', 'create_task']); expect(tools.find(t => t.name === 'add_comment')?.annotations?.readOnlyHint).toBe(false); expect(tools.find(t => t.name === 'get_task')?.annotations?.readOnlyHint).toBe(true); expect(tools.find(t => t.name === 'create_task')?._meta).toMatchObject({ securitySchemes: [{ scopes: ['highfive:read', 'highfive:task:create'] }] }); } finally { await s.close(); } });
  it('hides write tools when server flags are disabled', async () => { const s = await connect(false); try { expect((await s.client.listTools()).tools).toHaveLength(5); } finally { await s.close(); } });
  it('applies pagination defaults, rejects impersonation and caps, and blocks all access on audit failure', async () => { const s = await connect(); mocks.list.mockResolvedValue({ tasks: [], total: 0 }); try { expect((await s.client.callTool({ name: 'list_my_tasks', arguments: {} })).isError).not.toBe(true); expect(mocks.list).toHaveBeenCalledWith(p, { page: 1, limit: 20 }); mocks.list.mockClear(); for (const args of [{ limit: 1000 }, { workerId: 99 }, { page: -1 }]) expect((await s.client.callTool({ name: 'list_my_tasks', arguments: args })).isError).toBe(true); expect(mocks.list).not.toHaveBeenCalled(); mocks.audit.mockRejectedValueOnce(new Error('db unavailable secret')); const result = await s.client.callTool({ name: 'list_my_tasks', arguments: {} }); expect(result.isError).toBe(true); expect(JSON.stringify(result)).not.toContain('secret'); expect(mocks.list).not.toHaveBeenCalled(); } finally { await s.close(); } });
});
