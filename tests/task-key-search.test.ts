// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ tasks: vi.fn(), members: vi.fn(), fields: vi.fn(), comments: vi.fn() }));
vi.mock('@/lib/db', () => ({ prisma: {
  task: { findMany: mocks.tasks }, projectMember: { findMany: mocks.members },
  taskFieldValue: { findMany: mocks.fields }, taskComment: { findMany: mocks.comments },
} }));
import { runSearch } from '../src/lib/search';
beforeEach(() => {
  mocks.tasks.mockResolvedValue([]); mocks.members.mockResolvedValue([{ projectId: 3 }]);
  mocks.fields.mockResolvedValue([]); mocks.comments.mockResolvedValue([]);
});
describe('업무 번호 통합 검색', () => {
  it('번호로 조회해도 팀원/조직 권한과 프로젝트 필터를 유지한다', async () => {
    mocks.tasks.mockResolvedValueOnce([{ projectId: 3 }]).mockResolvedValueOnce([{ id: 123, title: '원래 제목', status: 'ASSIGNED', notes: null, project: { id: 3, name: '프로젝트' }, worker: { name: '담당자' } }]);
    const result = await runSearch(1, 'HF-000123', { userId: 7, role: 'WORKER' }, { types: ['tasks'], projectId: 3 });
    expect(mocks.tasks).toHaveBeenLastCalledWith(expect.objectContaining({ where: { AND: [
      { organizationId: 1, OR: [{ workerId: 7 }, { registrantId: 7 }] },
      { OR: [{ id: 123 }, expect.any(Object), expect.any(Object)] }, { projectId: 3 },
    ] } }));
    expect(result.tasks[0]).toMatchObject({ id: 123, taskKey: 'HF-000123', title: '원래 제목' });
  });
  it('파트너가 번호를 알아도 초대 프로젝트/공유 범위를 유지한다', async () => {
    await runSearch(1, 'HF-000999', { userId: 7, role: 'PARTNER' }, { types: ['tasks'] });
    const scope = mocks.tasks.mock.calls[0][0].where.AND[0];
    expect(scope).toEqual({ organizationId: 1, projectId: { in: [3] }, OR: [{ workerId: 7 }, { partnerVisible: true }] });
  });
  it('일반 제목 검색이나 잘린 번호는 id 조건을 추가하지 않는다', async () => {
    for (const q of ['회의', 'HF-123oops']) {
      await runSearch(1, q, { userId: 7, role: 'ADMIN' }, { types: ['tasks'] });
      expect(mocks.tasks.mock.calls.at(-1)?.[0].where.AND[1].OR).toHaveLength(2);
    }
  });
});
