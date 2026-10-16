// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const m = vi.hoisted(() => ({ auth: vi.fn(), task: vi.fn(), users: vi.fn(), create: vi.fn(), find: vi.fn(), parent: vi.fn(), log: vi.fn(), notify: vi.fn() }));
vi.mock('@/lib/db', () => ({ prisma: { task: { findFirst: m.task }, user: { findMany: m.users }, taskComment: { create: m.create, findFirst: m.find, findUnique: m.parent }, serviceRequestLog: { upsert: m.log } } }));
vi.mock('@/lib/service-auth', () => ({ requireServiceAuth: m.auth, serviceHasPermission: () => true, serviceProjectAllowed: () => true }));
vi.mock('@/lib/notify', () => ({ createUserNotification: m.notify }));
import { handleServiceComment } from '@/lib/service-comments';
const scope = { userId: 7, projectIds: [3] };
const request = (body = {}) => new NextRequest('https://hf.example/api/tasks/65/comments', { method: 'POST', body: JSON.stringify({ content: '확인\n@[담당자](8)', externalRequestId: 'mcp-comment:req12345', ...body }) });
beforeEach(() => { m.auth.mockResolvedValue({ organizationId: 1, credential: { id: 2, name: 'JIA' } }); m.task.mockResolvedValue({ id: 65, title: '업무', organizationId: 1, projectId: 3, workerId: 8, registrantId: 7 }); m.users.mockResolvedValue([{ id: 8 }]); m.create.mockResolvedValue({ id: 9, taskId: 65 }); m.log.mockResolvedValue({}); m.notify.mockResolvedValue(undefined); });
describe('shared service comment path MCP guard', () => {
  it('checks bound task scope, creates JIA comment and dispatches mention notification', async () => { expect((await handleServiceComment(request(), 65, scope)).status).toBe(201); expect(m.task).toHaveBeenCalledWith({ where: { id: 65, organizationId: 1, projectId: { in: [3] }, OR: [{ workerId: 7 }, { registrantId: 7 }] } }); expect(m.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ authorId: null, source: 'JIA', externalAuthorLabel: 'JIA', serviceCredentialId: 2 }) })); expect(m.notify).toHaveBeenCalledWith(8, 'COMMENT_MENTION', expect.any(String), 65, 1); });
  it('rejects task changes and foreign recipients before insert', async () => { m.task.mockResolvedValueOnce(null); expect((await handleServiceComment(request(), 65, scope)).status).toBe(404); m.users.mockResolvedValueOnce([]); expect((await handleServiceComment(request(), 65, scope)).status).toBe(403); expect(m.create).not.toHaveBeenCalled(); });
  it('rejects replies to a comment on another task', async () => { m.parent.mockResolvedValue({ id: 2, taskId: 66 }); expect((await handleServiceComment(request({ parentId: 2 }), 65, scope)).status).toBe(400); expect(m.create).not.toHaveBeenCalled(); });
  it('identical retries reuse comment and do not duplicate notification', async () => { m.create.mockRejectedValue({ code: 'P2002' }); m.find.mockResolvedValue({ id: 9, taskId: 65, content: '확인\n@[담당자](8)', parentId: null }); expect((await handleServiceComment(request(), 65, scope)).status).toBe(200); expect(m.notify).not.toHaveBeenCalled(); });
  it('cross-task idempotency collision returns conflict instead of another task comment', async () => { m.create.mockRejectedValue({ code: 'P2002' }); m.find.mockResolvedValue({ id: 9, taskId: 999, content: 'private', parentId: null }); const res = await handleServiceComment(request(), 65, scope); expect(res.status).toBe(409); expect(await res.text()).not.toContain('private'); expect(m.notify).not.toHaveBeenCalled(); });
});
