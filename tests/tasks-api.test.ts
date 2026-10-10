// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
const mocks = vi.hoisted(() => ({ auth: vi.fn(), findMany: vi.fn(), count: vi.fn(), members: vi.fn() }));
vi.mock('@/lib/db', () => ({ prisma: { task: { findMany: mocks.findMany, count: mocks.count }, projectMember: { findMany: mocks.members } } }));
vi.mock('@/lib/service-auth', () => ({ requireReadAuth: mocks.auth }));
vi.mock('@/lib/utils', () => ({ requireAuth: vi.fn(), parseRmsNo: vi.fn(), successResponse: (data: unknown) => NextResponse.json({ success: true, data }), errorResponse: (message: string, status: number) => NextResponse.json({ success: false, message }, { status }) }));
vi.mock('@/lib/google-calendar', () => ({ syncTaskCalendarEvent: vi.fn() }));
vi.mock('@/lib/task-status', () => ({ getProjectStatuses: () => Promise.resolve([{ code: 'FINISHED', isDone: true }]) }));
vi.mock('@/lib/task-history', () => ({ addHistory: vi.fn() }));
import { GET } from '../src/app/api/tasks/route';
beforeEach(() => {
  mocks.auth.mockResolvedValue({ organizationId: 1, isService: false, session: { user: { id: '7', role: 'WORKER' } } });
  mocks.findMany.mockResolvedValue([{ id: 1, title: '기존 업무', blockedBy: [], comments: [{ content: 'JIA 최근 댓글', author: null, createdAt: new Date('2026-10-10') }] }]);
  mocks.count.mockResolvedValue(1); mocks.members.mockResolvedValue([{ projectId: 3 }]);
});
describe('업무 조회 API 하위호환과 접근 범위', () => {
  it.each(['page=0', 'page=-1', 'limit=1001', 'workerId=7oops', 'projectId=0', 'projectId=1e2', 'workerId=2147483648'])('잘못된 조회 조건 %s는 400으로 거부한다', async query => {
    expect((await GET(new NextRequest('http://localhost/api/tasks?' + query))).status).toBe(400);
    expect(mocks.findMany).not.toHaveBeenCalled();
  });
  it('기존 페이지 응답을 유지하고 최근 댓글만 추가한다', async () => {
    const response = await GET(new NextRequest('http://localhost/api/tasks?page=2&limit=200'));
    const body = await response.json();
    expect(body.data).toMatchObject({ total: 1, page: 2, limit: 200, data: [{ id: 1, title: '기존 업무', latestComment: { content: 'JIA 최근 댓글', author: null }, hasIncompleteBlockers: false }] });
    expect(body.data.data[0].comments).toBeUndefined();
    expect(mocks.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { organizationId: 1, workerId: 7 }, skip: 200, take: 200 }));
  });
  it('LEADER는 소속 외 프로젝트 조건을 지정해도 범위를 넓힐 수 없다', async () => {
    mocks.auth.mockResolvedValue({ organizationId: 1, isService: false, session: { user: { id: '7', role: 'LEADER' } } });
    await GET(new NextRequest('http://localhost/api/tasks?projectId=99'));
    expect(mocks.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { organizationId: 1, projectId: { in: [-1] } } }));
  });
  it('JIA 서비스 자격 증명은 허용 프로젝트 범위를 유지한다', async () => {
    mocks.auth.mockResolvedValue({ organizationId: 1, isService: true, allowedProjectIds: [3] });
    await GET(new NextRequest('http://localhost/api/tasks'));
    expect(mocks.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { organizationId: 1, projectId: { in: [3] } } }));
  });
  it('파트너는 초대 프로젝트 내 본인 업무 또는 공유 업무만 조회한다', async () => {
    mocks.auth.mockResolvedValue({ organizationId: 1, isService: false, session: { user: { id: '7', role: 'PARTNER' } } });
    await GET(new NextRequest('http://localhost/api/tasks'));
    expect(mocks.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { organizationId: 1, projectId: { in: [3] }, OR: [{ workerId: 7 }, { partnerVisible: true }] } }));
  });
});
