import { describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('@/lib/api-client', () => ({ default: { get: mocks.get } }));
import { loadHubTasks } from '../src/hooks/useWorkHub';
import { task } from './fixtures';
describe('업무 페이지 순회', () => {
  it('마지막 페이지까지 가져오며 프로젝트 조건을 유지한다', async () => {
    mocks.get.mockResolvedValueOnce({ data: { data: { data: [task()], total: 2 } } }).mockResolvedValueOnce({ data: { data: { data: [task({ id: 2 })], total: 2 } } });
    expect((await loadHubTasks(3)).map(t => t.id)).toEqual([1, 2]);
    expect(mocks.get).toHaveBeenNthCalledWith(2, '/tasks', { params: { page: 2, limit: 200, projectId: 3 }, signal: undefined });
  });
  it('빈 페이지에서는 종료한다', async () => {
    mocks.get.mockResolvedValue({ data: { data: { data: [], total: 2 } } });
    expect(await loadHubTasks()).toEqual([]);
    expect(mocks.get).toHaveBeenCalledOnce();
  });
});
