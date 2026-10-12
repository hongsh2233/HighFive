// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
const mocks = vi.hoisted(() => ({ auth: vi.fn(), find: vi.fn(), allowed: vi.fn() }));
vi.mock('@/lib/db', () => ({ prisma: { taskAttachment: { findFirst: mocks.find } } }));
vi.mock('@/lib/service-auth', () => ({ requireReadAuth: mocks.auth, serviceProjectAllowed: mocks.allowed }));
vi.mock('@/lib/utils', () => ({ requireAuth: vi.fn(), errorResponse: (message: string, status: number) => NextResponse.json({ success: false, message }, { status }) }));
vi.mock('@/lib/task-history', () => ({ addHistory: vi.fn() }));
import { GET } from '../src/app/api/tasks/[id]/attachments/[attachmentId]/route';

const call = () => GET(new NextRequest('http://localhost/api/tasks/65/attachments/2'), { params: Promise.resolve({ id: '65', attachmentId: '2' }) });
const file = { id: 2, filename: '화면.jpg', mimeType: 'image/jpeg', size: 3, data: Buffer.from([1, 2, 3]), task: { projectId: 12 } };

beforeEach(() => { vi.clearAllMocks(); mocks.find.mockResolvedValue(file); });

describe('첨부 파일 내려받기 — 서비스 키(READ)도 허용', () => {
  it('허용 프로젝트면 서비스 키로 파일을 받는다', async () => {
    mocks.auth.mockResolvedValue({ organizationId: 1, isService: true, credential: {} });
    mocks.allowed.mockReturnValue(true);
    const res = await call();
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('image/jpeg');
  });
  it('허용되지 않은 프로젝트면 404', async () => {
    mocks.auth.mockResolvedValue({ organizationId: 1, isService: true, credential: {} });
    mocks.allowed.mockReturnValue(false);
    expect((await call()).status).toBe(404);
  });
  it('세션 사용자는 기존처럼 조직 범위로 받는다', async () => {
    mocks.auth.mockResolvedValue({ organizationId: 1, isService: false, session: { user: { id: '9' } } });
    expect((await call()).status).toBe(200);
    expect(mocks.allowed).not.toHaveBeenCalled();
  });
  it('인증 실패는 그대로', async () => {
    mocks.auth.mockResolvedValue({ error: new Response(null, { status: 401 }) });
    expect((await call()).status).toBe(401);
  });
});
