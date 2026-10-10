import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { task, getStatuses, project } from './fixtures';
const mocks = vi.hoisted(() => ({ get: vi.fn(), patch: vi.fn() }));
vi.mock('@/lib/api-client', () => ({ default: mocks }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: '7' }, isLoading: false }) }));
vi.mock('@/hooks/useProjectStatuses', () => ({ useProjectStatuses: () => ({ ready: true, loading: false, error: '', getStatuses }) }));
import { useTasks } from '../src/hooks/useTask';
import { useWorkHub } from '../src/hooks/useWorkHub';
afterEach(cleanup);
describe('조회·동시 수정 안정성', () => {
  it('여러 업무의 동시 수정 결과를 모두 유지한다', async () => {
    mocks.get.mockResolvedValue({ data: { data: { data: [task(), task({ id: 2, title: '두 번째 업무' })], total: 2 } } });
    const pending: ((value: unknown) => void)[] = [];
    mocks.patch.mockImplementation(() => new Promise(resolve => pending.push(resolve)));
    const hook = renderHook(() => useTasks());
    await waitFor(() => expect(hook.result.current.tasks).toHaveLength(2));
    let first: Promise<unknown>; let second: Promise<unknown>;
    act(() => { first = hook.result.current.updateStatus(1, 'FINISHED'); second = hook.result.current.updateStatus(2, 'FINISHED'); });
    await act(async () => {
      pending[1]({ data: { data: task({ id: 2, title: '두 번째 업무', status: 'FINISHED' }) } }); await second;
      pending[0]({ data: { data: task({ status: 'FINISHED' }) } }); await first;
    });
    expect(hook.result.current.tasks.map(t => t.status)).toEqual(['FINISHED', 'FINISHED']);
  });
  it('새로고침 중 기존 화면을 유지하고 최신 데이터로 교체한다', async () => {
    mocks.get.mockImplementation((url: string) => Promise.resolve({ data: { data: url === '/projects' ? [project] : { data: [task()], total: 1 } } }));
    const hook = renderHook(() => useWorkHub());
    await waitFor(() => expect(hook.result.current.loading).toBe(false));
    let resolveRefresh!: (value: unknown) => void;
    mocks.get.mockImplementation((url: string) => url === '/projects' ? Promise.resolve({ data: { data: [project] } }) : new Promise(resolve => { resolveRefresh = resolve; }));
    act(() => hook.result.current.reload());
    await waitFor(() => expect(hook.result.current.refreshing).toBe(true));
    expect(hook.result.current.loading).toBe(false);
    expect(hook.result.current.tasks).toHaveLength(1);
    await act(async () => resolveRefresh({ data: { data: { data: [task({ title: '갱신 완료' })], total: 1 } } }));
    await waitFor(() => expect(hook.result.current.refreshing).toBe(false));
    expect(hook.result.current.tasks[0].title).toBe('갱신 완료');
  });
});
