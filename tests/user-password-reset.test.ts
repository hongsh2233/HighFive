// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import bcryptjs from 'bcryptjs';

const mocks = vi.hoisted(() => ({
  session: vi.fn(),
  findUnique: vi.fn(),
  findFirst: vi.fn(),
  update: vi.fn(),
  sessionDelete: vi.fn(),
  audit: vi.fn(),
}));
vi.mock('next-auth', () => ({ getServerSession: mocks.session }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/db', () => ({
  prisma: {
    user: { findUnique: mocks.findUnique, findFirst: mocks.findFirst, update: mocks.update },
    userSession: { deleteMany: mocks.sessionDelete },
    auditLog: { create: mocks.audit },
  },
}));

import { POST } from '../src/app/api/users/[id]/reset-password/route';
import { isSessionAccountActive } from '../src/lib/utils';

// 대상 사용자(같은 조직 1번)
const members: Record<number, { id: number; email: string; name: string; role: string; organizationId: number }> = {
  7: { id: 7, email: 'worker@example.com', name: '김팀원', role: 'WORKER', organizationId: 1 },
  8: { id: 8, email: 'root@example.com', name: '최고관리자', role: 'SUPERADMIN', organizationId: 1 },
  9: { id: 9, email: 'other@example.com', name: '다른조직', role: 'WORKER', organizationId: 2 },
  5: { id: 5, email: 'admin2@example.com', name: '부관리자', role: 'ADMIN', organizationId: 1 },
};

let actorSeq = 100;
function loginAs(role: string, organizationId: number | null = 1, id = actorSeq++) {
  mocks.session.mockResolvedValue({ user: { id: String(id), role, organizationId, email: `actor${id}@example.com`, loginAt: Date.now() } });
  return id;
}
const call = (id: string | number) =>
  POST(new NextRequest(`http://localhost/api/users/${id}/reset-password`, { method: 'POST' }), { params: Promise.resolve({ id: String(id) }) });

beforeEach(() => {
  vi.clearAllMocks();
  mocks.findUnique.mockResolvedValue({ isActive: true, role: 'ADMIN', partnerAccessUntil: null, sessionsRevokedAt: null, organization: { isActive: true } });
  mocks.findFirst.mockImplementation(({ where }: { where: { id: number; organizationId: number } }) => {
    const u = members[where.id];
    return Promise.resolve(u && u.organizationId === where.organizationId ? { id: u.id, email: u.email, name: u.name, role: u.role } : null);
  });
  mocks.update.mockResolvedValue({});
  mocks.sessionDelete.mockResolvedValue({ count: 2 });
  mocks.audit.mockResolvedValue({});
});

describe('POST /api/users/[id]/reset-password — 권한', () => {
  it('같은 조직의 관리자는 팀원 비밀번호를 초기화한다', async () => {
    loginAs('ADMIN');
    const res = await call(7);
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
  });

  it('관리자는 다른 관리자도 초기화할 수 있다', async () => {
    loginAs('ADMIN');
    expect((await call(5)).status).toBe(200);
  });

  it('다른 조직 사용자는 404 (존재 여부 숨김), 아무것도 바꾸지 않는다', async () => {
    loginAs('ADMIN', 1);
    expect((await call(9)).status).toBe(404);
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.audit).not.toHaveBeenCalled();
  });

  it.each(['WORKER', 'LEADER', 'PARTNER'])('%s는 403', async (role) => {
    loginAs(role);
    expect((await call(7)).status).toBe(403);
    expect(mocks.findFirst).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it('관리자는 최고관리자를 초기화할 수 없다 (403)', async () => {
    loginAs('ADMIN');
    expect((await call(8)).status).toBe(403);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it('최고관리자는 같은 조직의 팀원을 초기화할 수 있다', async () => {
    loginAs('SUPERADMIN');
    expect((await call(7)).status).toBe(200);
  });

  it('본인은 이 경로로 초기화할 수 없다 (400)', async () => {
    loginAs('ADMIN', 1, 7);
    expect((await call(7)).status).toBe(400);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it('조직이 없는 세션은 403', async () => {
    loginAs('ADMIN', null);
    expect((await call(7)).status).toBe(403);
  });

  it('로그인하지 않으면 401', async () => {
    mocks.session.mockResolvedValue(null);
    expect((await call(7)).status).toBe(401);
  });

  it('잘못된 ID는 400', async () => {
    loginAs('ADMIN');
    expect((await call('abc')).status).toBe(400);
  });

  it('같은 관리자가 10분에 10회를 넘기면 429', async () => {
    const id = loginAs('ADMIN');
    for (let i = 0; i < 10; i++) expect((await call(7)).status).toBe(200);
    loginAs('ADMIN', 1, id);
    expect((await call(7)).status).toBe(429);
  }, 30000);
});

describe('POST /api/users/[id]/reset-password — 결과', () => {
  it('임시 비밀번호를 응답으로 1회 주고, 그 해시로 저장 + mustChangePassword + 세션 무효화', async () => {
    loginAs('ADMIN');
    const res = await call(7);
    const body = await res.json();
    const temp = body.data.tempPassword as string;
    expect(temp).toMatch(/^[0-9a-f]{16}$/);
    expect(body.data).toMatchObject({ id: 7, name: '김팀원' });

    const { where, data } = mocks.update.mock.calls[0][0];
    expect(where).toEqual({ id: 7 });
    expect(data.mustChangePassword).toBe(true);
    expect(data.sessionsRevokedAt).toBeInstanceOf(Date);
    expect(data.passwordHash).not.toBe(temp);
    expect(await bcryptjs.compare(temp, data.passwordHash)).toBe(true);
    expect(mocks.sessionDelete).toHaveBeenCalledWith({ where: { userId: 7 } });
  });

  it('감사 로그는 PASSWORD_RESET(행위자·대상)이고 비밀번호·해시를 담지 않는다', async () => {
    const actor = loginAs('ADMIN');
    const res = await call(7);
    const temp = (await res.json()).data.tempPassword as string;
    const hash = mocks.update.mock.calls[0][0].data.passwordHash as string;
    expect(mocks.audit).toHaveBeenCalledTimes(1);
    const entry = mocks.audit.mock.calls[0][0].data;
    expect(entry).toMatchObject({ organizationId: 1, userId: actor, action: 'PASSWORD_RESET', targetType: 'User', targetId: 7 });
    const serialized = JSON.stringify(entry);
    expect(serialized).not.toContain(temp);
    expect(serialized).not.toContain(hash);
  });

  it('임시 비밀번호는 서버 로그에 남지 않는다', async () => {
    const spies = ['log', 'info', 'warn', 'error'].map((m) => vi.spyOn(console, m as 'log').mockImplementation(() => {}));
    loginAs('ADMIN');
    const temp = (await (await call(7)).json()).data.tempPassword as string;
    for (const spy of spies) {
      for (const args of spy.mock.calls) expect(JSON.stringify(args)).not.toContain(temp);
      spy.mockRestore();
    }
  });
});

describe('세션 무효화 (sessionsRevokedAt)', () => {
  const revokedAt = new Date('2026-10-15T01:00:00Z');
  const base = { isActive: true, role: 'WORKER', partnerAccessUntil: null, organization: { isActive: true } };

  it('초기화 이전에 로그인한 세션과 loginAt 없는 구 토큰은 무효', async () => {
    mocks.findUnique.mockResolvedValue({ ...base, sessionsRevokedAt: revokedAt });
    expect(await isSessionAccountActive(7, revokedAt.getTime() - 1000)).toBe(false);
    expect(await isSessionAccountActive(7, undefined)).toBe(false);
  });

  it('초기화 이후 다시 로그인한 세션은 유효', async () => {
    mocks.findUnique.mockResolvedValue({ ...base, sessionsRevokedAt: revokedAt });
    expect(await isSessionAccountActive(7, revokedAt.getTime() + 1000)).toBe(true);
  });

  it('초기화한 적 없는 사용자는 기존과 같다', async () => {
    mocks.findUnique.mockResolvedValue({ ...base, sessionsRevokedAt: null });
    expect(await isSessionAccountActive(7, undefined)).toBe(true);
  });
});
