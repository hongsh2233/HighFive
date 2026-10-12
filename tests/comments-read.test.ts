// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const mocks = vi.hoisted(() => ({ auth: vi.fn(), task: vi.fn(), comments: vi.fn(), canAccess: vi.fn(), allowed: vi.fn() }));
vi.mock('@/lib/db', () => ({ prisma: { task: { findFirst: mocks.task }, taskComment: { findMany: mocks.comments } } }));
vi.mock('@/lib/service-auth', () => ({ requireReadAuth: mocks.auth, requireServiceAuth: vi.fn(), serviceHasPermission: vi.fn(), serviceProjectAllowed: mocks.allowed }));
vi.mock('@/lib/utils', () => ({ requireAuth: vi.fn(), canAccessTaskByRole: mocks.canAccess }));
vi.mock('@/lib/notify', () => ({ createUserNotification: vi.fn() }));
import { GET } from '../src/app/api/tasks/[id]/comments/route';

const call = (id = '65') => GET(new NextRequest(`http://localhost/api/tasks/${id}/comments`), { params: Promise.resolve({ id }) });

beforeEach(() => {
  vi.clearAllMocks();
  mocks.task.mockResolvedValue({ id: 65, projectId: 12, organizationId: 1 });
  mocks.comments.mockResolvedValue([{ id: 1, content: '배포 체크', author: null, replies: [] }]);
});

describe('업무 댓글 조회 — 서비스 키(READ)도 허용', () => {
  it('허용 프로젝트의 업무면 서비스 키로 댓글을 읽는다 (파트너 필터 없이)', async () => {
    mocks.auth.mockResolvedValue({ organizationId: 1, isService: true, allowedProjectIds: [12], credential: {} });
    mocks.allowed.mockReturnValue(true);
    const res = await call();
    expect(res.status).toBe(200);
    expect((await res.json()).data[0].content).toBe('배포 체크');
    expect(mocks.comments).toHaveBeenCalledWith(expect.objectContaining({ where: { taskId: 65, parentId: null } }));
    expect(mocks.canAccess).not.toHaveBeenCalled();
  });

  it('허용되지 않은 프로젝트면 404 (존재 여부도 숨김), 댓글은 조회하지 않는다', async () => {
    mocks.auth.mockResolvedValue({ organizationId: 1, isService: true, allowedProjectIds: [3], credential: {} });
    mocks.allowed.mockReturnValue(false);
    expect((await call()).status).toBe(404);
    expect(mocks.comments).not.toHaveBeenCalled();
  });

  it('키 인증 실패(READ 권한 없음 등)는 그 응답 그대로', async () => {
    mocks.auth.mockResolvedValue({ error: new Response(null, { status: 403 }) });
    expect((await call()).status).toBe(403);
    expect(mocks.task).not.toHaveBeenCalled();
  });

  it('세션 사용자는 기존처럼 역할 범위를 확인하고, 파트너는 공개 댓글만', async () => {
    mocks.auth.mockResolvedValue({ organizationId: 1, isService: false, session: { user: { id: '7', role: 'PARTNER' } } });
    mocks.canAccess.mockResolvedValue(true);
    await call();
    expect(mocks.canAccess).toHaveBeenCalledWith(expect.objectContaining({ id: 65 }), 7, 'PARTNER');
    expect(mocks.comments).toHaveBeenCalledWith(expect.objectContaining({ where: { taskId: 65, parentId: null, visibility: 'PARTNER_VISIBLE' } }));
  });

  it('세션 사용자가 범위 밖이면 404', async () => {
    mocks.auth.mockResolvedValue({ organizationId: 1, isService: false, session: { user: { id: '7', role: 'WORKER' } } });
    mocks.canAccess.mockResolvedValue(false);
    expect((await call()).status).toBe(404);
    expect(mocks.comments).not.toHaveBeenCalled();
  });
});
