import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { task, getStatuses } from './fixtures';
const mocks = vi.hoisted(() => ({ patch: vi.fn(), load: vi.fn(), changed: vi.fn() }));
vi.mock('@/lib/api-client', () => ({ default: { get: () => Promise.resolve({ data: { data: [{ id: 3, name: 'HighFive', status: 'ACTIVE' }] } }), patch: mocks.patch } }));
vi.mock('@/hooks/useWorkHub', () => ({ loadHubTasks: mocks.load }));
vi.mock('@/hooks/useProjectStatuses', () => ({ useProjectStatuses: () => ({ getStatuses, loading: false }) }));
import KanbanBoard from '../src/components/kanban/KanbanBoard';
afterEach(cleanup);
function dropToDone() {
  const column = screen.getByText('완료').parentElement!.parentElement!;
  fireEvent.drop(column.children[1], { dataTransfer: { getData: () => '1' } });
}
describe('기존 칸반 상태 변경', () => {
  it('프로젝트 커스텀 상태를 기존 API로 변경한다', async () => {
    mocks.load.mockResolvedValue([task()]); mocks.patch.mockResolvedValue({});
    render(<KanbanBoard projectId={3} onChanged={mocks.changed} />);
    await screen.findByText('디자인 검수'); dropToDone();
    await waitFor(() => expect(mocks.patch).toHaveBeenCalledWith('/tasks/1/status', { status: 'FINISHED' }));
    expect(mocks.changed).toHaveBeenCalledOnce();
  });
  it('권한 또는 승인 조건 실패 시 상태를 되돌리고 오류를 알린다', async () => {
    mocks.load.mockResolvedValue([task()]); mocks.patch.mockRejectedValue(new Error('AUTH_403'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<KanbanBoard projectId={3} />);
    await screen.findByText('디자인 검수'); dropToDone();
    await screen.findByRole('alert');
    const progressColumn = screen.getByText('진행').parentElement!.parentElement!;
    expect(progressColumn.textContent).toContain('디자인 검수');
    vi.restoreAllMocks();
  });
});
