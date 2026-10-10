// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
const mocks = vi.hoisted(() => ({ auth: vi.fn(), members: vi.fn(), tasks: vi.fn(), leaves: vi.fn(), findTask: vi.fn(), histories: vi.fn(), comments: vi.fn(), llm: vi.fn() }));
vi.mock('@/lib/db', () => ({ prisma: { projectMember: { findMany: mocks.members }, task: { findMany: mocks.tasks, findFirst: mocks.findTask }, request: { findMany: mocks.leaves }, taskHistory: { findMany: mocks.histories }, taskComment: { findMany: mocks.comments } } }));
vi.mock('@/lib/utils', () => ({ requireAuth: mocks.auth, successResponse: (data: unknown) => NextResponse.json({ success: true, data }), errorResponse: (message: string, status: number) => NextResponse.json({ success: false, message }, { status }) }));
vi.mock('@/lib/ai-settings', () => ({ isFeatureEnabled: () => true, getFeatureProvider: () => ({ provider: 'test', apiKey: 'test' }) }));
vi.mock('@/lib/ai', () => ({ callLLM: mocks.llm }));
vi.mock('@/lib/task-status', () => ({ getProjectStatuses: () => Promise.resolve([{ code: 'FINISHED', isDone: true }]) }));
import { sessionTaskScope } from '../src/lib/task-read-scope';
import { GET as calendar } from '../src/app/api/tasks/calendar/route';
import { POST as summary } from '../src/app/api/ai/task-summary/route';
import { POST as briefing } from '../src/app/api/ai/daily-briefing/route';
beforeEach(() => {
  mocks.auth.mockResolvedValue({ organizationId: 1, session: { user: { id: '7', role: 'WORKER' } } });
  mocks.members.mockResolvedValue([{ projectId: 3 }]); mocks.tasks.mockResolvedValue([]); mocks.leaves.mockResolvedValue([]); mocks.llm.mockResolvedValue('요약');
});
describe('캘린더와 AI의 업무 접근 범위', () => {
  it('조직이나 역할이 없으면 조회 범위를 열지 않는다', async () => {
    expect(await sessionTaskScope(undefined, 7, 'ADMIN')).toEqual({ id: -1 });
    expect(await sessionTaskScope(1, 7, undefined)).toEqual({ id: -1 });
  });
  it('팀원 캘린더는 본인 업무만 조회한다', async () => {
    const response = await calendar(new NextRequest('http://localhost/api/tasks/calendar?year=2026&month=10'));
    expect(response.status).toBe(200);
    expect(mocks.tasks).toHaveBeenCalledWith(expect.objectContaining({ where: { AND: [{ organizationId: 1, workerId: 7 }, { targetDate: { gte: new Date('2026-10-01T00:00:00Z'), lt: new Date('2026-11-01T00:00:00Z') } }] } }));
  });
  it('파트너는 공유 업무만 조회하며 조직 휴가를 받지 않는다', async () => {
    mocks.auth.mockResolvedValue({ organizationId: 1, session: { user: { id: '7', role: 'PARTNER' } } });
    await calendar(new NextRequest('http://localhost/api/tasks/calendar?year=2026&month=10'));
    expect(mocks.leaves).not.toHaveBeenCalled();
    expect(mocks.tasks).toHaveBeenCalledWith(expect.objectContaining({ where: { AND: [expect.objectContaining({ projectId: { in: [3] }, OR: [{ workerId: 7 }, { partnerVisible: true }] }), expect.anything()] } }));
  });
  it.each(['month=13', 'month=1foo', 'year=NaN', 'year=0'])('잘못된 캘린더 조건 %s를 거부한다', async query => {
    expect((await calendar(new NextRequest('http://localhost/api/tasks/calendar?' + query))).status).toBe(400);
    expect(mocks.tasks).not.toHaveBeenCalled();
  });
  it('커스텀 완료 단계도 캘린더 완료 통계에 포함한다', async () => {
    mocks.tasks.mockResolvedValue([{ id: 1, status: 'FINISHED', targetDate: new Date('2026-10-31T23:59:59.999Z'), projectId: 3 }]);
    const body = await (await calendar(new NextRequest('http://localhost/api/tasks/calendar?year=2026&month=10'))).json();
    expect(body.data.summary.done).toBe(1);
    expect(body.data.tasksByDate['2026-10-31']).toHaveLength(1);
  });
  it('다른 사람 업무를 AI 요약으로 우회 조회할 수 없다', async () => {
    mocks.findTask.mockResolvedValue(null);
    const response = await summary(new NextRequest('http://localhost/api/ai/task-summary', { method: 'POST', body: JSON.stringify({ taskId: 99 }) }));
    expect(response.status).toBe(404);
    expect(mocks.findTask).toHaveBeenCalledWith(expect.objectContaining({ where: { AND: [{ organizationId: 1, workerId: 7 }, { id: 99 }] } }));
    expect(mocks.llm).not.toHaveBeenCalled(); expect(mocks.comments).not.toHaveBeenCalled();
  });
  it('AI 브리핑에서 커스텀 완료 업무를 제외한다', async () => {
    mocks.tasks.mockResolvedValue([{ title: '완료된 비밀 작업', projectId: 3, status: 'FINISHED', targetDate: new Date('2026-01-01') }, { title: '진행 중 작업', projectId: 3, status: 'ACTIVE', targetDate: null }]);
    await briefing();
    expect(mocks.llm.mock.calls[0][1]).toContain('진행 중 작업');
    expect(mocks.llm.mock.calls[0][1]).not.toContain('완료된 비밀 작업');
  });
});
