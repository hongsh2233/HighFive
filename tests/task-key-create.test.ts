// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
const mocks = vi.hoisted(() => ({ auth: vi.fn(), create: vi.fn(), find: vi.fn(), users: vi.fn(), parent: vi.fn() }));
vi.mock('@/lib/db', () => ({ prisma: { user: { findFirst: mocks.users }, task: { create: mocks.create, findUnique: mocks.find, findFirst: mocks.parent } } }));
vi.mock('@/lib/utils', () => ({ requireAuth: mocks.auth, parseRmsNo: (title: string) => ({ cleanTitle: title, rmsNo: null }), successResponse: (data: unknown, _message: string, status = 200) => NextResponse.json({ success: true, data }, { status }), errorResponse: (message: string, status: number) => NextResponse.json({ message }, { status }) }));
vi.mock('@/lib/task-status', () => ({ getProjectStatuses: async () => [{ code: 'ASSIGNED' }] }));
vi.mock('@/lib/task-history', () => ({ addHistory: async () => undefined }));
vi.mock('@/lib/google-calendar', () => ({ syncTaskCalendarEvent: async () => undefined }));
import { POST } from '../src/app/api/tasks/route';
beforeEach(() => {
  mocks.auth.mockResolvedValue({ session: { user: { id: '7', role: 'ADMIN', organizationId: 1 } } });
  mocks.users.mockResolvedValue({ id: 7 }); mocks.create.mockResolvedValue({ id: 123, worker: { name: '담당자' }, title: '새 업무' });
  mocks.find.mockResolvedValue({ id: 123, title: '새 업무', subTasks: [] });
  mocks.parent.mockResolvedValue({ id: 100 });
});
function request(extra: Record<string, unknown> = {}) {
  return new NextRequest('http://localhost/api/tasks', { method: 'POST', body: JSON.stringify({ title: '새 업무', workerId: 7, registrantId: 7, taskKey: 'HF-999999', ...extra }) });
}
describe('업무 등록 시 번호 자동 발급', () => {
  it('클라이언트 번호를 무시하고 DB가 발급한 id로 신규 업무 번호를 반환한다', async () => {
    const response = await POST(request());
    expect(response.status).toBe(201);
    expect((await response.json()).data).toMatchObject({ id: 123, taskKey: 'HF-000123', title: '새 업무' });
    expect(mocks.create.mock.calls[0][0].data).not.toHaveProperty('taskKey');
    expect(mocks.create.mock.calls[0][0].data).not.toHaveProperty('id');
  });
  it('기존 그룹에 추가되는 하위 업무에도 별도 번호를 반환한다', async () => {
    const response = await POST(request({ parentTaskId: 100 }));
    expect(response.status).toBe(201);
    expect((await response.json()).data).toMatchObject({ id: 123, taskKey: 'HF-000123' });
    expect(mocks.create.mock.calls[0][0].data.parentTaskId).toBe(100);
  });
  it('그룹 등록 결과의 부모/하위 업무에도 각각 번호가 포함된다', async () => {
    mocks.find.mockResolvedValue({ id: 123, subTasks: [{ id: 124 }, { id: 125 }] });
    const response = await POST(request({ isGroup: true }));
    expect((await response.json()).data).toMatchObject({ taskKey: 'HF-000123', subTasks: [{ taskKey: 'HF-000124' }, { taskKey: 'HF-000125' }] });
  });
});
describe('업무 등록 시 시간카운터 기본값 (HF-000067)', () => {
  it('값이 없으면 시간카운터를 끈 상태로 등록한다', async () => {
    await POST(request());
    expect(mocks.create.mock.calls[0][0].data.timeCounterEnabled).toBe(false);
  });
  it('명시적으로 true를 보낸 경우에만 켠다', async () => {
    await POST(request({ timeCounterEnabled: true }));
    expect(mocks.create.mock.calls[0][0].data.timeCounterEnabled).toBe(true);
  });
  it('그룹 업무의 부모·하위 업무도 기본은 꺼짐이다', async () => {
    mocks.find.mockResolvedValue({ id: 123, subTasks: [] });
    await POST(request({ isGroup: true, subTasks: [{ title: '하위', workerId: 7 }] }));
    expect(mocks.create.mock.calls.length).toBeGreaterThan(1);
    for (const call of mocks.create.mock.calls) expect(call[0].data.timeCounterEnabled).toBe(false);
  });
});
